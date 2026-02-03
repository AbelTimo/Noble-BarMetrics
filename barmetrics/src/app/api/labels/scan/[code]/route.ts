import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseLabelFromQR } from '@/lib/labels';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

type RouteParams = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require label scan permission
    const session = await requirePermission(request, PERMISSIONS.LABEL_SCAN);

    const { code: rawCode } = await params;

    // Parse the code (handles both direct codes and QR content URLs)
    const labelCode = parseLabelFromQR(decodeURIComponent(rawCode));

    if (!labelCode) {
      return NextResponse.json(
        { error: 'Invalid label code format' },
        { status: 400 }
      );
    }

    const label = await prisma.label.findUnique({
      where: { code: labelCode },
      include: {
        sku: {
          include: {
            products: {
              include: {
                product: true,
              },
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!label) {
      return NextResponse.json(
        { error: 'Label not found', code: labelCode },
        { status: 404 }
      );
    }

    // Record scan event (don't await to keep response fast)
    prisma.labelEvent.create({
      data: {
        labelId: label.id,
        eventType: 'SCANNED',
        description: 'Label scanned via lookup',
        userId: session.user.id,
        performedBy: session.user.id,
      },
    }).catch(console.error);

    // Add warning flag if label is retired
    const response = {
      ...label,
      warning: label.status === 'RETIRED' ? 'This label has been retired' : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error scanning label:', error);
    return NextResponse.json(
      { error: 'Failed to scan label' },
      { status: 500 }
    );
  }
}
