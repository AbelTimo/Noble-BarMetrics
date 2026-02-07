import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { liquorRequestReviewSchema } from '@/lib/validations';
import { getSession } from '@/lib/auth';

// GET /api/requests/[id] - Get single request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const liquorRequest = await prisma.liquorRequest.findUnique({
      where: { id },
      include: {
        sku: true,
        product: true,
        requester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    if (!liquorRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Bartenders can only see their own requests
    if (session.user.role === 'BARTENDER' && liquorRequest.requestedBy !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(liquorRequest);
  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}

// PATCH /api/requests/[id] - Review request (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can review requests
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Manager access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = liquorRequestReviewSchema.parse(body);

    const updatedRequest = await prisma.liquorRequest.update({
      where: { id },
      data: {
        status: validatedData.status,
        reviewNotes: validatedData.reviewNotes,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
      include: {
        sku: true,
        product: true,
        requester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    console.error('Error reviewing request:', error);
    return NextResponse.json(
      { error: 'Failed to review request' },
      { status: 500 }
    );
  }
}

// DELETE /api/requests/[id] - Delete request (only if pending and own request)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const liquorRequest = await prisma.liquorRequest.findUnique({
      where: { id },
    });

    if (!liquorRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Only allow deletion of own pending requests or if manager
    if (session.user.role !== 'MANAGER' &&
        (liquorRequest.requestedBy !== session.user.id || liquorRequest.status !== 'PENDING')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.liquorRequest.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Request deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    console.error('Error deleting request:', error);
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    );
  }
}
