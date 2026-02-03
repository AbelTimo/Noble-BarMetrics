import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { labelRetireSchema } from '@/lib/validations';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require label retire permission
    const session = await requirePermission(request, PERMISSIONS.LABEL_RETIRE);

    const { id } = await params;
    const body = await request.json();
    const validated = labelRetireSchema.parse(body);

    const label = await prisma.label.findUnique({
      where: { id },
    });

    if (!label) {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }

    if (label.status === 'RETIRED') {
      return NextResponse.json(
        { error: 'Label is already retired' },
        { status: 400 }
      );
    }

    // Update label and create event in transaction
    const updatedLabel = await prisma.$transaction(async (tx) => {
      const updated = await tx.label.update({
        where: { id },
        data: {
          status: 'RETIRED',
          retiredAt: new Date(),
          retiredReason: validated.reason,
        },
        include: {
          sku: true,
        },
      });

      await tx.labelEvent.create({
        data: {
          labelId: id,
          eventType: 'RETIRED',
          description: validated.description || `Retired: ${validated.reason}`,
          location: label.location,
          fromValue: JSON.stringify({
            status: label.status,
            location: label.location,
            locationId: label.locationId,
          }),
          toValue: JSON.stringify({
            status: 'RETIRED',
            reason: validated.reason,
          }),
          userId: session.user.id,
          deviceId: validated.deviceId,
          performedBy: session.user.id,
        },
      });

      return updated;
    });

    return NextResponse.json(updatedLabel);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error retiring label:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to retire label' },
      { status: 500 }
    );
  }
}
