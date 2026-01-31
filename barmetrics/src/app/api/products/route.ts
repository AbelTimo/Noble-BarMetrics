import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { productCreateSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { brand: { contains: search } },
        { productName: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        calibrations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ brand: 'asc' }, { productName: 'asc' }],
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = productCreateSchema.parse(body);

    const product = await prisma.product.create({
      data: validated,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
