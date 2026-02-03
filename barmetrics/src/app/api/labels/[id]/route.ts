import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const label = await prisma.label.findUnique({
      where: { id },
      include: {
        sku: {
          include: {
            products: {
              include: {
                product: true,
              },
            },
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
        },
        replacedByLabel: {
          select: { id: true, code: true },
        },
        replacesLabel: {
          select: { id: true, code: true },
        },
      },
    });

    if (!label) {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(label);
  } catch (error) {
    console.error('Error fetching label:', error);
    return NextResponse.json(
      { error: 'Failed to fetch label' },
      { status: 500 }
    );
  }
}
