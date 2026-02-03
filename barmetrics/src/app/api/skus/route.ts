import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { skuCreateSchema } from '@/lib/validations';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    // Require SKU view permission
    await requirePermission(request, PERMISSIONS.SKU_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const skus = await prisma.sKU.findMany({
      where,
      include: {
        products: {
          include: {
            product: true,
          },
        },
        _count: {
          select: {
            labels: true,
          },
        },
      },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    return NextResponse.json(skus);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching SKUs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SKUs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require SKU create permission
    await requirePermission(request, PERMISSIONS.SKU_CREATE);

    const body = await request.json();
    const validated = skuCreateSchema.parse(body);

    // Check if code already exists
    const existing = await prisma.sKU.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'SKU code already exists' },
        { status: 400 }
      );
    }

    const sku = await prisma.sKU.create({
      data: validated,
    });

    return NextResponse.json(sku, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error creating SKU:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create SKU' },
      { status: 500 }
    );
  }
}
