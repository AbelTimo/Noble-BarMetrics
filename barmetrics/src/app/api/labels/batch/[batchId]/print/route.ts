import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateQRContent } from '@/lib/labels';

type RouteParams = { params: Promise<{ batchId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { batchId } = await params;

    const batch = await prisma.labelBatch.findUnique({
      where: { id: batchId },
      include: {
        sku: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    const labels = await prisma.label.findMany({
      where: { batchId },
      include: {
        sku: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Prepare print data with QR content
    const printData = labels.map((label) => ({
      id: label.id,
      code: label.code,
      qrContent: generateQRContent(label.code),
      skuCode: label.sku.code,
      skuName: label.sku.name,
      category: label.sku.category,
      sizeMl: label.sku.sizeMl,
    }));

    return NextResponse.json({
      batch: {
        id: batch.id,
        quantity: batch.quantity,
        notes: batch.notes,
        createdAt: batch.createdAt,
        createdBy: batch.createdBy,
        sku: batch.sku,
      },
      labels: printData,
    });
  } catch (error) {
    console.error('Error fetching print data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch print data' },
      { status: 500 }
    );
  }
}
