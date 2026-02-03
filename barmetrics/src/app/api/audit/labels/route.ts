import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    // Require audit view permission
    await requirePermission(request, PERMISSIONS.AUDIT_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('eventType') || '';
    const labelCode = searchParams.get('labelCode') || '';
    const skuCode = searchParams.get('skuCode') || '';
    const location = searchParams.get('location') || '';
    const userId = searchParams.get('userId') || '';
    const performedBy = searchParams.get('performedBy') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};

    if (eventType) {
      where.eventType = eventType;
    }

    if (labelCode) {
      where.label = {
        code: { contains: labelCode.toUpperCase() },
      };
    }

    if (skuCode) {
      where.label = {
        ...((where.label as object) || {}),
        sku: {
          code: { contains: skuCode.toUpperCase() },
        },
      };
    }

    if (location) {
      where.location = { contains: location };
    }

    if (userId) {
      where.userId = { contains: userId };
    }

    if (performedBy) {
      where.performedBy = { contains: performedBy };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const [events, total] = await Promise.all([
      prisma.labelEvent.findMany({
        where,
        include: {
          label: {
            include: {
              sku: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.labelEvent.count({ where }),
    ]);

    // Get event type counts for filters
    const eventTypeCounts = await prisma.labelEvent.groupBy({
      by: ['eventType'],
      _count: {
        eventType: true,
      },
    });

    return NextResponse.json({
      events,
      total,
      limit,
      offset,
      eventTypeCounts: eventTypeCounts.reduce(
        (acc, item) => {
          acc[item.eventType] = item._count.eventType;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
