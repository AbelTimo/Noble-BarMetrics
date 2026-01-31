import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calibrationCreateSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    const where: Record<string, unknown> = {};

    if (productId) {
      where.productId = productId;
    }

    const calibrations = await prisma.bottleCalibration.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(calibrations);
  } catch (error) {
    console.error('Error fetching calibrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calibrations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = calibrationCreateSchema.parse(body);

    const calibration = await prisma.bottleCalibration.create({
      data: validated,
      include: {
        product: true,
      },
    });

    return NextResponse.json(calibration, { status: 201 });
  } catch (error) {
    console.error('Error creating calibration:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create calibration' },
      { status: 500 }
    );
  }
}
