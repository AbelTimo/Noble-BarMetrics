import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (startDate || endDate) {
      where.measuredAt = {};
      if (startDate) {
        (where.measuredAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.measuredAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const measurements = await prisma.bottleMeasurement.findMany({
      where,
      include: {
        product: true,
        session: true,
      },
      orderBy: [
        { session: { startedAt: 'desc' } },
        { measuredAt: 'desc' },
      ],
    });

    // Generate CSV
    const headers = [
      'Session Name',
      'Session Location',
      'Session Date',
      'Product Brand',
      'Product Name',
      'Category',
      'ABV %',
      'Bottle Size (ml)',
      'Gross Weight (g)',
      'Tare Weight (g)',
      'Net Mass (g)',
      'Volume (ml)',
      'Volume (L)',
      'Percent Full',
      'Pours Remaining',
      'Standard Pour (ml)',
      'Measured At',
    ];

    const rows = measurements.map((m) => [
      m.session.name || 'Untitled',
      m.session.location || '',
      new Date(m.session.startedAt).toISOString().split('T')[0],
      m.product.brand,
      m.product.productName,
      m.product.category,
      m.product.abvPercent,
      m.product.nominalVolumeMl,
      m.grossWeightG,
      m.tareWeightG,
      m.netMassG,
      m.volumeMl,
      m.volumeL,
      m.percentFull ?? '',
      m.poursRemaining ?? '',
      m.standardPourMl ?? '',
      new Date(m.measuredAt).toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape commas and quotes in cell values
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ),
    ].join('\n');

    const filename = sessionId
      ? `barmetrics-session-${sessionId}.csv`
      : `barmetrics-export-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
