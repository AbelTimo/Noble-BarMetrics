import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    // Require label view permission
    await requirePermission(request, PERMISSIONS.LABEL_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const skuId = searchParams.get('skuId') || '';
    const batchId = searchParams.get('batchId') || '';
    const location = searchParams.get('location') || '';
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (skuId) {
      where.skuId = skuId;
    }

    if (batchId) {
      where.batchId = batchId;
    }

    if (location) {
      where.location = { contains: location };
    }

    if (search) {
      where.code = { contains: search.toUpperCase() };
    }

    const labels = await prisma.label.findMany({
      where,
      include: {
        sku: true,
        _count: {
          select: {
            events: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return NextResponse.json(labels);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching labels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch labels' },
      { status: 500 }
    );
  }
}
