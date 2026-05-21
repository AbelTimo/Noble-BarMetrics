import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, PERMISSIONS.MEASUREMENT_CREATE);

    const { id } = await params;

    await prisma.bottleMeasurement.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Measurement deleted' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting measurement:', error);
    return NextResponse.json(
      { error: 'Failed to delete measurement' },
      { status: 500 }
    );
  }
}
