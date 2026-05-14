import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { saleCreateSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shift = searchParams.get('shift');

    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    if (shift) {
      where.shift = shift;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            recipe: { select: { id: true, name: true, category: true } },
            product: { select: { id: true, brand: true, productName: true, category: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = saleCreateSchema.parse(body);

    const { items, ...saleData } = validated;

    const sale = await prisma.sale.create({
      data: {
        date: new Date(saleData.date),
        shift: saleData.shift,
        notes: saleData.notes,
        source: saleData.source,
        items: {
          create: items.map((item) => ({
            type: item.type,
            recipeId: item.recipeId || null,
            productId: item.productId || null,
            quantity: item.quantity,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: {
          include: {
            recipe: { select: { id: true, name: true } },
            product: { select: { id: true, brand: true, productName: true } },
          },
        },
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('Error creating sale:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}
