import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { locationSchema } from '@/lib/validations';
import { DEFAULT_LOCATIONS } from '@/lib/labels';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    // Require location view permission
    await requirePermission(request, PERMISSIONS.LOCATION_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const withCounts = searchParams.get('withCounts') === 'true';

    // Build where clause
    const where: Record<string, unknown> = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    // Get all locations from database
    const locations = await prisma.location.findMany({
      where,
      include: withCounts ? {
        _count: {
          select: {
            labels: true,
          },
        },
      } : undefined,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // If no locations exist, return default locations
    if (locations.length === 0 && !includeInactive) {
      return NextResponse.json(
        DEFAULT_LOCATIONS.map((name) => ({
          id: null,
          name,
          isDefault: true,
          isActive: true,
          _count: { labels: 0 },
        }))
      );
    }

    return NextResponse.json(locations);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require location create permission
    await requirePermission(request, PERMISSIONS.LOCATION_CREATE);

    const body = await request.json();
    const validated = locationSchema.parse(body);

    // Check if location already exists
    const existing = await prisma.location.findUnique({
      where: { name: validated.name },
    });

    if (existing) {
      // If it exists but is inactive, reactivate it
      if (!existing.isActive) {
        const updated = await prisma.location.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        return NextResponse.json(updated);
      }
      return NextResponse.json(
        { error: 'Location already exists' },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: validated,
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error creating location:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    );
  }
}
