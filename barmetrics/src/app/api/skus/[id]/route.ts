import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { skuUpdateSchema } from '@/lib/validations';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require SKU view permission
    await requirePermission(request, PERMISSIONS.SKU_VIEW);

    const { id } = await params;

    const sku = await prisma.sKU.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        labels: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        batches: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            labels: true,
          },
        },
      },
    });

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(sku);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching SKU:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SKU' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Require SKU update permission
    await requirePermission(request, PERMISSIONS.SKU_UPDATE);

    const { id } = await params;
    const body = await request.json();
    const validated = skuUpdateSchema.parse(body);

    // If updating code, check it doesn't conflict
    if (validated.code) {
      const existing = await prisma.sKU.findFirst({
        where: {
          code: validated.code,
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'SKU code already exists' },
          { status: 400 }
        );
      }
    }

    const sku = await prisma.sKU.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(sku);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error updating SKU:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update SKU' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Require SKU delete permission
    await requirePermission(request, PERMISSIONS.SKU_DELETE);

    const { id } = await params;

    // Check if SKU has any labels
    const labelCount = await prisma.label.count({
      where: { skuId: id },
    });

    if (labelCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete SKU with existing labels. Deactivate it instead.' },
        { status: 400 }
      );
    }

    await prisma.sKU.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'SKU deleted' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting SKU:', error);
    return NextResponse.json(
      { error: 'Failed to delete SKU' },
      { status: 500 }
    );
  }
}
