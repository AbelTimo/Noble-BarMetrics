import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateVolumeFromWeight, getBottleTareWeight, getDensityForSKU } from '@/lib/inventory-calculations';

/**
 * POST /api/labels/[id]/count
 * Save a weight-based inventory count for a label
 *
 * Body:
 * - grossWeightG: number (required)
 * - location?: string (optional, updates label location)
 * - userId?: string (optional)
 * - performedBy?: string (optional, display name)
 * - deviceId?: string (optional)
 * - offlineQueued?: boolean (optional, for offline sync)
 * - idempotencyKey?: string (optional, prevents duplicates)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const labelId = id;
    const body = await request.json();
    const {
      grossWeightG,
      location,
      userId,
      performedBy,
      deviceId,
      offlineQueued = false,
      idempotencyKey,
    } = body;

    // Validate input
    if (!grossWeightG || typeof grossWeightG !== 'number' || grossWeightG <= 0) {
      return NextResponse.json(
        { error: 'Invalid grossWeightG: must be a positive number' },
        { status: 400 }
      );
    }

    // Check for duplicate (idempotency)
    if (idempotencyKey) {
      const existing = await prisma.labelEvent.findFirst({
        where: {
          labelId,
          eventType: 'COUNT',
          description: idempotencyKey, // Store idempotency key in description field
        },
      });

      if (existing) {
        return NextResponse.json({
          message: 'Count already recorded (duplicate prevented)',
          event: existing,
        });
      }
    }

    // Fetch label with SKU and product details
    const label = await prisma.label.findUnique({
      where: { id: labelId },
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
      },
    });

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    // Check if label is retired
    if (label.status === 'RETIRED') {
      return NextResponse.json(
        { error: 'Cannot count retired label' },
        { status: 400 }
      );
    }

    // Get bottle tare weight
    const bottleTareG = getBottleTareWeight(label.sku);
    if (!bottleTareG) {
      return NextResponse.json(
        {
          error: 'Bottle tare weight not configured for this SKU. Please update SKU or linked Product.',
        },
        { status: 400 }
      );
    }

    // Get density
    const densityGPerMl = getDensityForSKU(label.sku);

    // Calculate volume
    const calculation = calculateVolumeFromWeight({
      grossWeightG,
      bottleTareG,
      sizeMl: label.sku.sizeMl,
      densityGPerMl,
    });

    if (!calculation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid measurement',
          details: calculation.errors,
          warnings: calculation.warnings,
        },
        { status: 400 }
      );
    }

    // Create COUNT event
    const event = await prisma.labelEvent.create({
      data: {
        labelId,
        eventType: 'COUNT',
        description: idempotencyKey || `Weight: ${grossWeightG}g → ${calculation.remainingVolumeMl}ml`,
        location: location || label.location || undefined,
        userId: userId || undefined,
        performedBy: performedBy || undefined,
        deviceId: deviceId || undefined,
        grossWeightG,
        netLiquidG: calculation.netLiquidG,
        remainingVolumeMl: calculation.remainingVolumeMl,
        remainingPercent: calculation.remainingPercent,
        offlineQueued,
      },
    });

    // Update label location if provided
    if (location && location !== label.location) {
      await prisma.label.update({
        where: { id: labelId },
        data: {
          location,
        },
      });
    }

    // Update label status to ASSIGNED if currently UNASSIGNED
    if (label.status === 'UNASSIGNED') {
      await prisma.label.update({
        where: { id: labelId },
        data: {
          status: 'ASSIGNED',
          assignedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      message: 'Count recorded successfully',
      event: {
        id: event.id,
        grossWeightG: event.grossWeightG,
        netLiquidG: event.netLiquidG,
        remainingVolumeMl: event.remainingVolumeMl,
        remainingPercent: event.remainingPercent,
        createdAt: event.createdAt,
      },
      warnings: calculation.warnings,
    });
  } catch (error) {
    console.error('Error saving count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
