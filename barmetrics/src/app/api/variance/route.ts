import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateProductVariance, aggregateByCategory } from '@/lib/variance';
import type { ProductVariance, ShiftVariance, VarianceSummary } from '@/lib/variance';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const openingSessionId = searchParams.get('openingSessionId');
    const closingSessionId = searchParams.get('closingSessionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get measurements from opening and closing sessions
    let openingMeasurements: Record<string, number> = {};
    let closingMeasurements: Record<string, number> = {};

    if (openingSessionId) {
      const measurements = await prisma.bottleMeasurement.findMany({
        where: { sessionId: openingSessionId, isSkipped: false },
        select: { productId: true, volumeMl: true },
      });
      for (const m of measurements) {
        openingMeasurements[m.productId] = (openingMeasurements[m.productId] || 0) + m.volumeMl;
      }
    }

    if (closingSessionId) {
      const measurements = await prisma.bottleMeasurement.findMany({
        where: { sessionId: closingSessionId, isSkipped: false },
        select: { productId: true, volumeMl: true },
      });
      for (const m of measurements) {
        closingMeasurements[m.productId] = (closingMeasurements[m.productId] || 0) + m.volumeMl;
      }
    }

    // Calculate actual depletion per product (opening - closing)
    const allProductIds = new Set([
      ...Object.keys(openingMeasurements),
      ...Object.keys(closingMeasurements),
    ]);

    // Get sales in date range with recipe ingredients
    const salesWhere: Record<string, unknown> = {};
    if (startDate || endDate) {
      salesWhere.date = {};
      if (startDate) (salesWhere.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (salesWhere.date as Record<string, unknown>).lte = new Date(endDate);
    }

    const sales = await prisma.sale.findMany({
      where: salesWhere,
      include: {
        items: {
          include: {
            recipe: {
              include: {
                ingredients: true,
              },
            },
          },
        },
      },
    });

    // Calculate theoretical usage per product from sales
    const theoreticalUsage: Record<string, number> = {};

    // Track shift data
    const shiftMap = new Map<string, { theoreticalMl: number; itemsSold: number }>();

    for (const sale of sales) {
      const shiftKey = sale.shift || 'UNSPECIFIED';
      const shiftData = shiftMap.get(shiftKey) || { theoreticalMl: 0, itemsSold: 0 };

      for (const item of sale.items) {
        if (item.type === 'COCKTAIL' && item.recipe) {
          // Cocktail: use recipe ingredients * quantity sold
          for (const ingredient of item.recipe.ingredients) {
            const usageMl = ingredient.quantityMl * item.quantity;
            theoreticalUsage[ingredient.productId] = (theoreticalUsage[ingredient.productId] || 0) + usageMl;
            shiftData.theoreticalMl += usageMl;
          }
          shiftData.itemsSold += item.quantity;
        } else if (item.productId) {
          // Shot/Neat: use standard pour (30ml) * quantity
          const pourMl = item.type === 'BOTTLE' ? 750 : 30; // full bottle or standard pour
          const usageMl = pourMl * item.quantity;
          theoreticalUsage[item.productId] = (theoreticalUsage[item.productId] || 0) + usageMl;
          shiftData.theoreticalMl += usageMl;
          shiftData.itemsSold += item.quantity;
        }
      }

      shiftMap.set(shiftKey, shiftData);
    }

    // Add theoretical usage product IDs
    for (const pid of Object.keys(theoreticalUsage)) {
      allProductIds.add(pid);
    }

    // Fetch product details
    const products = await prisma.product.findMany({
      where: { id: { in: Array.from(allProductIds) } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate variance for each product
    const productVariances: ProductVariance[] = [];

    for (const productId of allProductIds) {
      const product = productMap.get(productId);
      if (!product) continue;

      const opening = openingMeasurements[productId] || 0;
      const closing = closingMeasurements[productId] || 0;
      const actualDepletion = Math.max(0, opening - closing);
      const theoretical = theoreticalUsage[productId] || 0;

      // Skip products with no activity
      if (actualDepletion === 0 && theoretical === 0) continue;

      const variance = calculateProductVariance(
        productId,
        product.productName,
        product.brand,
        product.category,
        theoretical,
        actualDepletion,
        0, // costPerBottle - not in schema, default 0
        product.nominalVolumeMl,
        0, // retailPricePerServing
        30  // standardPourMl
      );

      productVariances.push(variance);
    }

    // Sort by absolute variance (worst first)
    productVariances.sort((a, b) => Math.abs(b.varianceMl) - Math.abs(a.varianceMl));

    // Aggregate
    const totalTheoreticalMl = productVariances.reduce((s, p) => s + p.theoreticalUsageMl, 0);
    const totalActualMl = productVariances.reduce((s, p) => s + p.actualDepletionMl, 0);
    const totalVarianceMl = totalActualMl - totalTheoreticalMl;
    const totalVariancePercent = totalTheoreticalMl > 0
      ? Math.round((totalVarianceMl / totalTheoreticalMl) * 1000) / 10
      : 0;

    const byCategory = aggregateByCategory(productVariances);
    const byShift: ShiftVariance[] = Array.from(shiftMap.entries()).map(([shift, data]) => ({
      shift,
      theoreticalMl: Math.round(data.theoreticalMl * 10) / 10,
      itemsSold: data.itemsSold,
    }));

    const summary: VarianceSummary = {
      startDate: startDate || '',
      endDate: endDate || '',
      openingSessionId,
      closingSessionId,
      totalTheoreticalMl: Math.round(totalTheoreticalMl * 10) / 10,
      totalActualMl: Math.round(totalActualMl * 10) / 10,
      totalVarianceMl: Math.round(totalVarianceMl * 10) / 10,
      totalVariancePercent,
      totalCostLoss: Math.round(productVariances.reduce((s, p) => s + p.costLoss, 0) * 100) / 100,
      totalRetailLoss: Math.round(productVariances.reduce((s, p) => s + p.retailLoss, 0) * 100) / 100,
      products: productVariances,
      byCategory,
      byShift,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error calculating variance:', error);
    return NextResponse.json({ error: 'Failed to calculate variance' }, { status: 500 });
  }
}
