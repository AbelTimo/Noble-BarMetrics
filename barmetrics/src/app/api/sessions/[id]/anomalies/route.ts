import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateAnomalySummary } from '@/lib/anomalies';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/sessions/[id]/anomalies
 * Get anomaly summary for a session
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the session with measurements and source session info
    const session = await prisma.measurementSession.findUnique({
      where: { id },
      include: {
        measurements: {
          select: {
            id: true,
            productId: true,
            anomalyFlags: true,
            variancePercent: true,
            percentFull: true,
            isSkipped: true,
            product: {
              select: {
                id: true,
                brand: true,
                productName: true,
              },
            },
          },
        },
        sourceSession: {
          include: {
            measurements: {
              select: {
                productId: true,
                product: {
                  select: {
                    id: true,
                    brand: true,
                    productName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Find missing bottles (products in source session but not in current)
    const currentProductIds = new Set(session.measurements.map(m => m.productId));
    const missingProducts: Array<{ productId: string; brand: string; productName: string }> = [];

    if (session.sourceSession) {
      const sourceProductMap = new Map<string, { brand: string; productName: string }>();

      for (const m of session.sourceSession.measurements) {
        if (!sourceProductMap.has(m.productId)) {
          sourceProductMap.set(m.productId, {
            brand: m.product.brand,
            productName: m.product.productName,
          });
        }
      }

      for (const [productId, product] of sourceProductMap) {
        if (!currentProductIds.has(productId)) {
          missingProducts.push({
            productId,
            brand: product.brand,
            productName: product.productName,
          });
        }
      }
    }

    // Generate summary
    const summary = generateAnomalySummary(session.measurements, missingProducts);

    // Get detailed anomaly information per measurement
    const measurementsWithAnomalies = session.measurements
      .filter(m => m.anomalyFlags && JSON.parse(m.anomalyFlags).length > 0)
      .map(m => ({
        id: m.id,
        productId: m.productId,
        brand: m.product.brand,
        productName: m.product.productName,
        anomalyFlags: JSON.parse(m.anomalyFlags!),
        variancePercent: m.variancePercent,
        percentFull: m.percentFull,
      }));

    return NextResponse.json({
      sessionId: session.id,
      sessionName: session.name,
      mode: session.mode,
      hasAnomalies: session.hasAnomalies,
      summary,
      measurementsWithAnomalies,
      missingProducts,
    });
  } catch (error) {
    console.error('Error fetching session anomalies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session anomalies' },
      { status: 500 }
    );
  }
}
