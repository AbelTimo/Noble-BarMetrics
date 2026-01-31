import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.bottleMeasurement.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Measurement deleted' });
  } catch (error) {
    console.error('Error deleting measurement:', error);
    return NextResponse.json(
      { error: 'Failed to delete measurement' },
      { status: 500 }
    );
  }
}
