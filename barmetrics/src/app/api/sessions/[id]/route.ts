import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sessionUpdateSchema } from '@/lib/validations';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await prisma.measurementSession.findUnique({
      where: { id },
      include: {
        measurements: {
          include: {
            product: true,
            calibration: true,
          },
          orderBy: { measuredAt: 'desc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, PERMISSIONS.MEASUREMENT_CREATE);

    const { id } = await params;
    const body = await request.json();
    const validated = sessionUpdateSchema.parse(body);

    const session = await prisma.measurementSession.update({
      where: { id },
      data: {
        ...validated,
        completedAt: validated.completedAt ? new Date(validated.completedAt) : undefined,
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error updating session:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, PERMISSIONS.MEASUREMENT_CREATE);

    const { id } = await params;

    await prisma.measurementSession.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Session deleted' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
