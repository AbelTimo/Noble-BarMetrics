import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calibrationUpdateSchema } from '@/lib/validations';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const calibration = await prisma.bottleCalibration.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!calibration) {
      return NextResponse.json(
        { error: 'Calibration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(calibration);
  } catch (error) {
    console.error('Error fetching calibration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calibration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = calibrationUpdateSchema.parse(body);

    const calibration = await prisma.bottleCalibration.update({
      where: { id },
      data: validated,
      include: {
        product: true,
      },
    });

    return NextResponse.json(calibration);
  } catch (error) {
    console.error('Error updating calibration:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update calibration' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.bottleCalibration.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Calibration deleted' });
  } catch (error) {
    console.error('Error deleting calibration:', error);
    return NextResponse.json(
      { error: 'Failed to delete calibration' },
      { status: 500 }
    );
  }
}
