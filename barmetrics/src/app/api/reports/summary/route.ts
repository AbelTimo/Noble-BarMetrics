import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const measurementWhere: Record<string, unknown> = {};

    if (startDate || endDate) {
      measurementWhere.measuredAt = {};
      if (startDate) {
        (measurementWhere.measuredAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (measurementWhere.measuredAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    // Get overall statistics
    const measurements = await prisma.bottleMeasurement.findMany({
      where: measurementWhere,
      include: {
        product: true,
      },
    });

    const totalMeasurements = measurements.length;
    const totalVolumeMl = measurements.reduce((sum, m) => sum + m.volumeMl, 0);
    const totalVolumeL = totalVolumeMl / 1000;

    // Group by category
    const byCategory = measurements.reduce((acc, m) => {
      const category = m.product.category;
      if (!acc[category]) {
        acc[category] = { count: 0, volumeMl: 0 };
      }
      acc[category].count += 1;
      acc[category].volumeMl += m.volumeMl;
      return acc;
    }, {} as Record<string, { count: number; volumeMl: number }>);

    // Get low stock items (below 25%)
    const lowStock = measurements
      .filter((m) => m.percentFull !== null && m.percentFull < 25)
      .map((m) => ({
        productId: m.productId,
        brand: m.product.brand,
        productName: m.product.productName,
        percentFull: m.percentFull,
        volumeMl: m.volumeMl,
        measuredAt: m.measuredAt,
      }))
      .sort((a, b) => (a.percentFull || 0) - (b.percentFull || 0));

    // Get unique products measured
    const uniqueProducts = new Set(measurements.map((m) => m.productId)).size;

    // Get session count
    const sessionCount = new Set(measurements.map((m) => m.sessionId)).size;

    // Average percent full
    const measurementsWithPercent = measurements.filter((m) => m.percentFull !== null);
    const avgPercentFull = measurementsWithPercent.length > 0
      ? measurementsWithPercent.reduce((sum, m) => sum + (m.percentFull || 0), 0) / measurementsWithPercent.length
      : null;

    return NextResponse.json({
      totalMeasurements,
      totalVolumeMl,
      totalVolumeL,
      uniqueProducts,
      sessionCount,
      avgPercentFull,
      byCategory: Object.entries(byCategory).map(([category, data]) => ({
        category,
        count: data.count,
        volumeMl: data.volumeMl,
        volumeL: data.volumeMl / 1000,
      })),
      lowStock: lowStock.slice(0, 10), // Top 10 low stock items
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
