import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const dayStart = new Date(date + 'T00:00:00');
    const dayEnd = new Date(date + 'T23:59:59');

    // Get sessions for the day
    const sessions = await prisma.measurementSession.findMany({
      where: {
        startedAt: { gte: dayStart, lte: dayEnd },
      },
      include: {
        measurements: {
          where: { isSkipped: false },
          include: {
            product: {
              select: { id: true, brand: true, productName: true, category: true, nominalVolumeMl: true },
            },
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    // Get sales for the day
    const sales = await prisma.sale.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      include: {
        items: {
          include: {
            recipe: {
              select: { id: true, name: true },
            },
            product: {
              select: { id: true, brand: true, productName: true },
            },
          },
        },
      },
    });

    // Calculate opening/closing stock from first and last sessions
    const openingSession = sessions[0] || null;
    const closingSession = sessions.length > 1 ? sessions[sessions.length - 1] : null;

    // Build stock summary
    const stockSummary: Record<string, {
      productId: string;
      brand: string;
      productName: string;
      category: string;
      openingMl: number;
      closingMl: number;
      depletionMl: number;
    }> = {};

    if (openingSession) {
      for (const m of openingSession.measurements) {
        stockSummary[m.productId] = {
          productId: m.productId,
          brand: m.product.brand,
          productName: m.product.productName,
          category: m.product.category,
          openingMl: m.volumeMl,
          closingMl: 0,
          depletionMl: 0,
        };
      }
    }

    if (closingSession) {
      for (const m of closingSession.measurements) {
        if (stockSummary[m.productId]) {
          stockSummary[m.productId].closingMl = m.volumeMl;
          stockSummary[m.productId].depletionMl =
            stockSummary[m.productId].openingMl - m.volumeMl;
        } else {
          stockSummary[m.productId] = {
            productId: m.productId,
            brand: m.product.brand,
            productName: m.product.productName,
            category: m.product.category,
            openingMl: 0,
            closingMl: m.volumeMl,
            depletionMl: -m.volumeMl,
          };
        }
      }
    }

    // Sales summary
    const salesSummary = sales.flatMap((s) =>
      s.items.map((item) => ({
        type: item.type,
        name: item.recipe?.name || (item.product ? `${item.product.brand} ${item.product.productName}` : 'Unknown'),
        quantity: item.quantity,
        shift: s.shift,
      }))
    );

    const totalSalesItems = salesSummary.reduce((s, i) => s + i.quantity, 0);
    const totalOpeningMl = Object.values(stockSummary).reduce((s, p) => s + p.openingMl, 0);
    const totalClosingMl = Object.values(stockSummary).reduce((s, p) => s + p.closingMl, 0);
    const totalDepletionMl = Object.values(stockSummary).reduce((s, p) => s + Math.max(0, p.depletionMl), 0);

    const report = {
      date,
      generatedAt: new Date().toISOString(),
      sessions: {
        total: sessions.length,
        opening: openingSession ? {
          id: openingSession.id,
          name: openingSession.name,
          time: openingSession.startedAt,
          bottlesCounted: openingSession.measurements.length,
        } : null,
        closing: closingSession ? {
          id: closingSession.id,
          name: closingSession.name,
          time: closingSession.startedAt,
          bottlesCounted: closingSession.measurements.length,
        } : null,
      },
      stock: {
        totalOpeningMl: Math.round(totalOpeningMl * 10) / 10,
        totalClosingMl: Math.round(totalClosingMl * 10) / 10,
        totalDepletionMl: Math.round(totalDepletionMl * 10) / 10,
        products: Object.values(stockSummary)
          .filter((p) => p.openingMl > 0 || p.closingMl > 0)
          .sort((a, b) => Math.abs(b.depletionMl) - Math.abs(a.depletionMl))
          .map((p) => ({
            ...p,
            openingMl: Math.round(p.openingMl * 10) / 10,
            closingMl: Math.round(p.closingMl * 10) / 10,
            depletionMl: Math.round(p.depletionMl * 10) / 10,
          })),
      },
      sales: {
        totalItems: totalSalesItems,
        items: salesSummary,
      },
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating daily report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
