import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bulkMeasurementSchema } from '@/lib/validations';
import { calculateVolumeFromWeight, DEFAULT_STANDARD_POUR_ML } from '@/lib/calculations';
import { detectAnomalies, calculateVariance } from '@/lib/anomalies';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/sessions/[id]/measurements/bulk
 * Batch save measurements with anomaly detection for quick count mode
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();

    const validated = bulkMeasurementSchema.parse(body);

    // Verify session exists and get its mode
    const session = await prisma.measurementSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Fetch all required products and their calibrations
    const productIds = validated.measurements.map(m => m.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        calibrations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Fetch previous measurements if referenced
    const previousMeasurementIds = validated.measurements
      .map(m => m.previousMeasurementId)
      .filter((id): id is string => id != null);

    const previousMeasurements = previousMeasurementIds.length > 0
      ? await prisma.bottleMeasurement.findMany({
          where: { id: { in: previousMeasurementIds } },
        })
      : [];

    const previousMeasurementMap = new Map(previousMeasurements.map(m => [m.id, m]));

    // Prepare measurement data
    const standardPourMl = validated.standardPourMl || session.defaultPourMl || DEFAULT_STANDARD_POUR_ML;
    const measurementsToCreate: Array<{
      sessionId: string;
      productId: string;
      calibrationId: string | null;
      grossWeightG: number;
      tareWeightG: number;
      netMassG: number;
      densityGPerMl: number;
      volumeMl: number;
      volumeL: number;
      percentFull: number | null;
      poursRemaining: number | null;
      standardPourMl: number;
      anomalyFlags: string | null;
      previousMeasurementId: string | null;
      variancePercent: number | null;
      isSkipped: boolean;
    }> = [];

    const errors: Array<{ index: number; error: string }> = [];
    let hasAnomalies = false;

    for (let i = 0; i < validated.measurements.length; i++) {
      const item = validated.measurements[i];

      // Handle skipped measurements
      if (item.isSkipped) {
        const product = productMap.get(item.productId);
        if (!product) {
          errors.push({ index: i, error: 'Product not found' });
          continue;
        }

        const previousMeasurement = item.previousMeasurementId
          ? previousMeasurementMap.get(item.previousMeasurementId)
          : null;

        // For skipped items, copy values from previous measurement if available
        if (previousMeasurement) {
          measurementsToCreate.push({
            sessionId,
            productId: item.productId,
            calibrationId: item.calibrationId || previousMeasurement.calibrationId || null,
            grossWeightG: previousMeasurement.grossWeightG,
            tareWeightG: previousMeasurement.tareWeightG,
            netMassG: previousMeasurement.netMassG,
            densityGPerMl: previousMeasurement.densityGPerMl,
            volumeMl: previousMeasurement.volumeMl,
            volumeL: previousMeasurement.volumeL,
            percentFull: previousMeasurement.percentFull,
            poursRemaining: previousMeasurement.poursRemaining,
            standardPourMl,
            anomalyFlags: null,
            previousMeasurementId: previousMeasurement.id,
            variancePercent: 0, // No change for skipped
            isSkipped: true,
          });
        }
        continue;
      }

      const product = productMap.get(item.productId);
      if (!product) {
        errors.push({ index: i, error: 'Product not found' });
        continue;
      }

      // Get tare weight
      const tareWeightG = product.calibrations[0]?.tareWeightG || product.defaultTareG;
      if (!tareWeightG) {
        errors.push({ index: i, error: 'No tare weight available for this product' });
        continue;
      }

      // Calculate volume
      const calculationResult = calculateVolumeFromWeight({
        grossWeightG: item.grossWeightG,
        tareWeightG,
        abvPercent: product.abvPercent,
        nominalVolumeMl: product.nominalVolumeMl,
        standardPourMl,
      });

      // Get previous measurement for anomaly detection
      const previousMeasurement = item.previousMeasurementId
        ? previousMeasurementMap.get(item.previousMeasurementId)
        : null;

      // Detect anomalies
      const anomalies = detectAnomalies(
        {
          percentFull: calculationResult.percentFull,
          grossWeightG: item.grossWeightG,
          tareWeightG,
          netMassG: calculationResult.netMassG,
        },
        previousMeasurement
          ? { percentFull: previousMeasurement.percentFull }
          : null
      );

      if (anomalies.length > 0) {
        hasAnomalies = true;
      }

      // Calculate variance
      const variancePercent = calculateVariance(
        calculationResult.percentFull,
        previousMeasurement?.percentFull ?? null
      );

      measurementsToCreate.push({
        sessionId,
        productId: item.productId,
        calibrationId: item.calibrationId || product.calibrations[0]?.id || null,
        grossWeightG: item.grossWeightG,
        tareWeightG,
        netMassG: calculationResult.netMassG,
        densityGPerMl: calculationResult.densityGPerMl,
        volumeMl: calculationResult.volumeMl,
        volumeL: calculationResult.volumeL,
        percentFull: calculationResult.percentFull,
        poursRemaining: calculationResult.poursRemaining,
        standardPourMl,
        anomalyFlags: anomalies.length > 0 ? JSON.stringify(anomalies) : null,
        previousMeasurementId: item.previousMeasurementId || null,
        variancePercent,
        isSkipped: false,
      });
    }

    if (measurementsToCreate.length === 0) {
      return NextResponse.json(
        { error: 'No valid measurements to create', details: errors },
        { status: 400 }
      );
    }

    // Create all measurements in a transaction
    const created = await prisma.$transaction(async (tx) => {
      const measurements = await tx.bottleMeasurement.createMany({
        data: measurementsToCreate,
      });

      // Update session hasAnomalies flag
      if (hasAnomalies) {
        await tx.measurementSession.update({
          where: { id: sessionId },
          data: { hasAnomalies: true },
        });
      }

      return measurements;
    });

    // Fetch the created measurements to return
    const createdMeasurements = await prisma.bottleMeasurement.findMany({
      where: { sessionId },
      include: {
        product: true,
        previousMeasurement: true,
      },
      orderBy: { measuredAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      created: created.count,
      measurements: createdMeasurements,
      hasAnomalies,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating bulk measurements:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create measurements' },
      { status: 500 }
    );
  }
}
