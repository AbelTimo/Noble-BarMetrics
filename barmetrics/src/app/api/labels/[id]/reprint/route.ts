import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { labelReprintSchema } from '@/lib/validations';
import { generateLabelCode } from '@/lib/labels';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require label reprint permission
    const session = await requirePermission(request, PERMISSIONS.LABEL_REPRINT);

    const { id } = await params;
    const body = await request.json();
    const validated = labelReprintSchema.parse(body);

    // Get the old label
    const oldLabel = await prisma.label.findUnique({
      where: { id },
      include: { sku: true },
    });

    if (!oldLabel) {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }

    if (oldLabel.status === 'RETIRED') {
      return NextResponse.json(
        { error: 'Cannot reprint an already retired label' },
        { status: 400 }
      );
    }

    if (oldLabel.replacedByLabelId) {
      return NextResponse.json(
        { error: 'This label has already been replaced' },
        { status: 400 }
      );
    }

    // Generate a unique new label code
    let newCode: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      newCode = generateLabelCode();
      const existing = await prisma.label.findUnique({
        where: { code: newCode },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique label code' },
        { status: 500 }
      );
    }

    // Create new label and retire old one in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the new replacement label
      const newLabel = await tx.label.create({
        data: {
          code: newCode,
          skuId: oldLabel.skuId,
          status: oldLabel.status === 'ASSIGNED' ? 'ASSIGNED' : 'UNASSIGNED',
          locationId: oldLabel.locationId,
          location: oldLabel.location,
          assignedAt: oldLabel.status === 'ASSIGNED' ? new Date() : null,
          replacesLabelId: oldLabel.id,
          createdByUserId: session.user.id,
          batchId: oldLabel.batchId,
        },
      });

      // Update old label to point to new one and retire it
      await tx.label.update({
        where: { id: oldLabel.id },
        data: {
          status: 'RETIRED',
          retiredAt: new Date(),
          retiredReason: `REPRINTED: ${validated.reason}`,
          replacedByLabelId: newLabel.id,
        },
      });

      // Create REPRINTED event on old label
      await tx.labelEvent.create({
        data: {
          labelId: oldLabel.id,
          eventType: 'REPRINTED',
          description: validated.description || `Reprinted due to ${validated.reason}`,
          fromValue: JSON.stringify({
            status: oldLabel.status,
            code: oldLabel.code,
          }),
          toValue: JSON.stringify({
            status: 'RETIRED',
            replacedByCode: newCode,
            replacedByLabelId: newLabel.id,
          }),
          userId: session.user.id,
          deviceId: validated.deviceId,
          performedBy: session.user.id,
        },
      });

      // Create CREATED event on new label
      await tx.labelEvent.create({
        data: {
          labelId: newLabel.id,
          eventType: 'CREATED',
          description: `Replacement for ${oldLabel.code} (${validated.reason})`,
          toValue: JSON.stringify({
            replacesCode: oldLabel.code,
            replacesLabelId: oldLabel.id,
            reason: validated.reason,
          }),
          userId: session.user.id,
          deviceId: validated.deviceId,
          performedBy: session.user.id,
        },
      });

      // If the old label was assigned, create an ASSIGNED event for the new one
      if (oldLabel.status === 'ASSIGNED' && oldLabel.location) {
        await tx.labelEvent.create({
          data: {
            labelId: newLabel.id,
            eventType: 'ASSIGNED',
            description: `Inherited location from ${oldLabel.code}`,
            location: oldLabel.location,
            toValue: JSON.stringify({
              location: oldLabel.location,
              locationId: oldLabel.locationId,
            }),
            userId: session.user.id,
            deviceId: validated.deviceId,
            performedBy: session.user.id,
          },
        });
      }

      return { oldLabel, newLabel };
    });

    // Fetch the complete new label with relations
    const newLabelComplete = await prisma.label.findUnique({
      where: { id: result.newLabel.id },
      include: {
        sku: true,
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({
      message: 'Label reprinted successfully',
      oldLabel: {
        id: result.oldLabel.id,
        code: result.oldLabel.code,
        status: 'RETIRED',
      },
      newLabel: newLabelComplete,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error reprinting label:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to reprint label' },
      { status: 500 }
    );
  }
}
