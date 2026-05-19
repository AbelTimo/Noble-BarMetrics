import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const locationUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, PERMISSIONS.LOCATION_VIEW);

    const { id } = await params;

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            labels: true,
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(location);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Only managers can update locations
    await requirePermission(request, PERMISSIONS.LOCATION_CREATE);

    const { id } = await params;
    const body = await request.json();
    const validated = locationUpdateSchema.parse(body);

    // Check if location exists
    const existing = await prisma.location.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // If renaming, check for conflicts
    if (validated.name && validated.name !== existing.name) {
      const conflict = await prisma.location.findUnique({
        where: { name: validated.name },
      });
      if (conflict) {
        return NextResponse.json(
          { error: 'A location with this name already exists' },
          { status: 400 }
        );
      }
    }

    const location = await prisma.location.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(location);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error updating location:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Only managers can delete locations
    await requirePermission(request, PERMISSIONS.LOCATION_CREATE);

    const { id } = await params;

    // Check if location exists
    const existing = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            labels: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting locations with assigned labels
    if (existing._count.labels > 0) {
      return NextResponse.json(
        { error: `Cannot delete location with ${existing._count.labels} assigned labels. Deactivate it instead.` },
        { status: 400 }
      );
    }

    // Don't allow deleting default locations
    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default locations. Deactivate it instead.' },
        { status: 400 }
      );
    }

    await prisma.location.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Location deleted' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}
