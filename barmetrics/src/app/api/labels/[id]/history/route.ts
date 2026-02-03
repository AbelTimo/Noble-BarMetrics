import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const label = await prisma.label.findUnique({
      where: { id },
      include: {
        sku: true,
      },
    });

    if (!label) {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }

    const events = await prisma.labelEvent.findMany({
      where: { labelId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      label,
      events,
    });
  } catch (error) {
    console.error('Error fetching label history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch label history' },
      { status: 500 }
    );
  }
}
