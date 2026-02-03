import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { labelAssignSchema } from '@/lib/validations';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require label assign permission
    const session = await requirePermission(request, PERMISSIONS.LABEL_ASSIGN);

    const { id } = await params;
    const body = await request.json();
    const validated = labelAssignSchema.parse(body);

    const label = await prisma.label.findUnique({
      where: { id },
      include: { sku: true },
    });

    if (!label) {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }

    if (label.status === 'RETIRED') {
      return NextResponse.json(
        { error: 'Cannot assign a retired label' },
        { status: 400 }
      );
    }

    // Idempotent check: if already assigned to the same location, return success
    if (label.status === 'ASSIGNED' && label.location === validated.location) {
      return NextResponse.json({
        ...label,
        message: 'Label is already assigned to this location',
        idempotent: true,
      });
    }

    // Determine if this is a new assignment or location change
    const isLocationChange = label.status === 'ASSIGNED' && label.location !== validated.location;
    const eventType = isLocationChange ? 'LOCATION_CHANGED' : 'ASSIGNED';

    // Resolve locationId if location name provided
    let locationId = validated.locationId;
    if (!locationId && validated.location) {
      const existingLocation = await prisma.location.findUnique({
        where: { name: validated.location },
      });
      locationId = existingLocation?.id || null;
    }

    // Update label and create event in transaction
    const updatedLabel = await prisma.$transaction(async (tx) => {
      // Create or get location
      let finalLocationId = locationId;
      if (!finalLocationId) {
        const newLocation = await tx.location.upsert({
          where: { name: validated.location },
          create: {
            name: validated.location,
            isDefault: false,
          },
          update: {},
        });
        finalLocationId = newLocation.id;
      }

      const updated = await tx.label.update({
        where: { id },
        data: {
          status: 'ASSIGNED',
          location: validated.location,
          locationId: finalLocationId,
          assignedAt: new Date(),
        },
        include: {
          sku: true,
        },
      });

      // Create event with from/to values for audit trail
      await tx.labelEvent.create({
        data: {
          labelId: id,
          eventType,
          description: isLocationChange
            ? `Location changed from ${label.location} to ${validated.location}`
            : `Assigned to ${validated.location}`,
          location: validated.location,
          fromValue: JSON.stringify({
            status: label.status,
            location: label.location,
            locationId: label.locationId,
          }),
          toValue: JSON.stringify({
            status: 'ASSIGNED',
            location: validated.location,
            locationId: finalLocationId,
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
    console.error('Error assigning label:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to assign label' },
      { status: 500 }
    );
  }
}
