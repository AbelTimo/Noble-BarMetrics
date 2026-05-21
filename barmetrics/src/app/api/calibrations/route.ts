import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calibrationCreateSchema } from '@/lib/validations';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    const where: Record<string, unknown> = {};

    if (productId) {
      where.productId = productId;
    }

    const calibrations = await prisma.bottleCalibration.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(calibrations);
  } catch (error) {
    console.error('Error fetching calibrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calibrations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission(request, PERMISSIONS.PRODUCT_UPDATE);

    const body = await request.json();
    const validated = calibrationCreateSchema.parse(body);

    const calibration = await prisma.bottleCalibration.create({
      data: validated,
      include: {
        product: true,
      },
    });

    return NextResponse.json(calibration, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error creating calibration:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create calibration' },
      { status: 500 }
    );
  }
}
