import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { productCreateSchema } from '@/lib/validations';
import { computeSearchKey } from '@/lib/calculations';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

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
    await requirePermission(request, PERMISSIONS.PRODUCT_CREATE);

    const body = await request.json();
    const validated = productCreateSchema.parse(body);

    // Server-derive the canonical natural key so duplicates are blocked at the DB.
    const searchKey = computeSearchKey(
      validated.brand,
      validated.productName,
      validated.nominalVolumeMl,
    );

    const product = await prisma.product.create({
      data: { ...validated, searchKey },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error creating product:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    // Prisma surfaces unique-constraint violations as P2002.
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('P2002') || msg.toLowerCase().includes('unique constraint')) {
      const onUpc = msg.includes('upc');
      return NextResponse.json(
        {
          error: onUpc
            ? 'A product with that UPC already exists.'
            : 'A product with the same brand, name, and size already exists.',
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
