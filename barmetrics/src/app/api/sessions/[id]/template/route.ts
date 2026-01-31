import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/sessions/[id]/template
 * Get products from a session as a template for quick count mode
 * Returns unique products with their latest measurements from the source session
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the source session with its measurements
    const session = await prisma.measurementSession.findUnique({
      where: { id },
      include: {
        measurements: {
          include: {
            product: {
              include: {
                calibrations: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { measuredAt: 'desc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get unique products with their most recent measurement from this session
    const productMap = new Map<string, {
      product: {
        id: string;
        brand: string;
        productName: string;
        category: string;
        abvPercent: number;
        nominalVolumeMl: number;
        defaultTareG: number | null;
        calibrations: { id: string; tareWeightG: number }[];
      };
      previousMeasurement: {
        id: string;
        percentFull: number | null;
        grossWeightG: number;
        tareWeightG: number;
        calibrationId: string | null;
      };
    }>();

    for (const measurement of session.measurements) {
      if (!productMap.has(measurement.productId)) {
        productMap.set(measurement.productId, {
          product: {
            id: measurement.product.id,
            brand: measurement.product.brand,
            productName: measurement.product.productName,
            category: measurement.product.category,
            abvPercent: measurement.product.abvPercent,
            nominalVolumeMl: measurement.product.nominalVolumeMl,
            defaultTareG: measurement.product.defaultTareG,
            calibrations: measurement.product.calibrations.map(c => ({
              id: c.id,
              tareWeightG: c.tareWeightG,
            })),
          },
          previousMeasurement: {
            id: measurement.id,
            percentFull: measurement.percentFull,
            grossWeightG: measurement.grossWeightG,
            tareWeightG: measurement.tareWeightG,
            calibrationId: measurement.calibrationId,
          },
        });
      }
    }

    const template = {
      sourceSession: {
        id: session.id,
        name: session.name,
        location: session.location,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
      products: Array.from(productMap.values()).sort((a, b) => {
        // Sort by brand, then product name
        const brandCompare = a.product.brand.localeCompare(b.product.brand);
        if (brandCompare !== 0) return brandCompare;
        return a.product.productName.localeCompare(b.product.productName);
      }),
      totalProducts: productMap.size,
    };

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching session template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session template' },
      { status: 500 }
    );
  }
}
