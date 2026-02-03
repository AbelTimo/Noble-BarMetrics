import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { labelGenerateSchema } from '@/lib/validations';
import { generateLabelCode } from '@/lib/labels';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    // Require label generate permission
    const session = await requirePermission(request, PERMISSIONS.LABEL_GENERATE);

    const body = await request.json();
    const validated = labelGenerateSchema.parse(body);

    // Check if SKU exists
    const sku = await prisma.sKU.findUnique({
      where: { id: validated.skuId },
    });

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU not found' },
        { status: 404 }
      );
    }

    if (!sku.isActive) {
      return NextResponse.json(
        { error: 'Cannot generate labels for inactive SKU' },
        { status: 400 }
      );
    }

    // Create batch record - use authenticated user's ID
    const batch = await prisma.labelBatch.create({
      data: {
        skuId: validated.skuId,
        quantity: validated.quantity,
        notes: validated.notes,
        createdBy: session.user.id,
      },
    });

    // Generate unique label codes
    const codes: string[] = [];
    const maxAttempts = validated.quantity * 10;
    let attempts = 0;

    while (codes.length < validated.quantity && attempts < maxAttempts) {
      const code = generateLabelCode();

      // Check if code already exists in database
      const existing = await prisma.label.findUnique({
        where: { code },
      });

      if (!existing && !codes.includes(code)) {
        codes.push(code);
      }
      attempts++;
    }

    if (codes.length < validated.quantity) {
      return NextResponse.json(
        { error: 'Failed to generate enough unique codes' },
        { status: 500 }
      );
    }

    // Create labels with events in a transaction
    const labels = await prisma.$transaction(async (tx) => {
      const createdLabels = [];

      for (const code of codes) {
        const label = await tx.label.create({
          data: {
            code,
            skuId: validated.skuId,
            status: 'UNASSIGNED',
            batchId: batch.id,
          },
        });

        // Create CREATED event
        await tx.labelEvent.create({
          data: {
            labelId: label.id,
            eventType: 'CREATED',
            description: `Label generated in batch ${batch.id}`,
            toValue: JSON.stringify({
              status: 'UNASSIGNED',
              code,
              skuId: validated.skuId,
              batchId: batch.id,
            }),
            performedBy: session.user.id,
          },
        });

        createdLabels.push(label);
      }

      return createdLabels;
    });

    return NextResponse.json({
      batch,
      labels,
      count: labels.length,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error generating labels:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate labels' },
      { status: 500 }
    );
  }
}
