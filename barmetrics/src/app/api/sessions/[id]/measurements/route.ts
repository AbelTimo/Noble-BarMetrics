import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { measurementCreateSchema } from '@/lib/validations';
import { calculateVolumeFromWeight, getDensityForABV, DEFAULT_STANDARD_POUR_ML } from '@/lib/calculations';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const measurements = await prisma.bottleMeasurement.findMany({
      where: { sessionId: id },
      include: {
        product: true,
        calibration: true,
      },
      orderBy: { measuredAt: 'desc' },
    });

    return NextResponse.json(measurements);
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch measurements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();

    // Add sessionId to the body for validation
    const dataWithSession = { ...body, sessionId };
    const validated = measurementCreateSchema.parse(dataWithSession);

    // Get the product details
    const product = await prisma.product.findUnique({
      where: { id: validated.productId },
      include: {
        calibrations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get tare weight from calibration or use the one provided
    const tareWeightG = validated.tareWeightG ||
      product.calibrations[0]?.tareWeightG ||
      product.defaultTareG;

    if (!tareWeightG) {
      return NextResponse.json(
        { error: 'No tare weight available for this product' },
        { status: 400 }
      );
    }

    // Calculate volume and other metrics
    const standardPourMl = validated.standardPourMl || DEFAULT_STANDARD_POUR_ML;
    const calculationResult = calculateVolumeFromWeight({
      grossWeightG: validated.grossWeightG,
      tareWeightG,
      abvPercent: product.abvPercent,
      nominalVolumeMl: product.nominalVolumeMl,
      standardPourMl,
    });

    const measurement = await prisma.bottleMeasurement.create({
      data: {
        sessionId,
        productId: validated.productId,
        calibrationId: validated.calibrationId || product.calibrations[0]?.id || null,
        grossWeightG: validated.grossWeightG,
        tareWeightG,
        netMassG: calculationResult.netMassG,
        densityGPerMl: calculationResult.densityGPerMl,
        volumeMl: calculationResult.volumeMl,
        volumeL: calculationResult.volumeL,
        percentFull: calculationResult.percentFull,
        poursRemaining: calculationResult.poursRemaining,
        standardPourMl,
      },
      include: {
        product: true,
        calibration: true,
      },
    });

    return NextResponse.json(measurement, { status: 201 });
  } catch (error) {
    console.error('Error creating measurement:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create measurement' },
      { status: 500 }
    );
  }
}
