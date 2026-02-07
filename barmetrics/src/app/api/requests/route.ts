import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { liquorRequestCreateSchema, liquorRequestFilterSchema } from '@/lib/validations';
import { getSession } from '@/lib/auth';

// GET /api/requests - List requests
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const requestedBy = searchParams.get('requestedBy');

    const where: any = {};

    // Bartenders can only see their own requests
    if (session.user.role === 'BARTENDER') {
      where.requestedBy = session.user.id;
    } else if (requestedBy) {
      // Managers/Storekeepers can filter by requester
      where.requestedBy = requestedBy;
    }

    if (status) {
      where.status = status;
    }

    if (urgency) {
      where.urgency = urgency;
    }

    const requests = await prisma.liquorRequest.findMany({
      where,
      include: {
        sku: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            sizeMl: true,
          },
        },
        product: {
          select: {
            id: true,
            brand: true,
            productName: true,
            category: true,
            nominalVolumeMl: true,
          },
        },
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
      orderBy: [
        { status: 'asc' }, // PENDING first
        { urgency: 'desc' }, // URGENT first
        { requestedAt: 'desc' },
      ],
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

// POST /api/requests - Create new request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only bartenders can create requests
    if (session.user.role !== 'BARTENDER') {
      return NextResponse.json(
        { error: 'Forbidden - Only bartenders can create requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = liquorRequestCreateSchema.parse(body);

    const newRequest = await prisma.liquorRequest.create({
      data: {
        ...validatedData,
        requestedBy: session.user.id,
      },
      include: {
        sku: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            sizeMl: true,
          },
        },
        product: {
          select: {
            id: true,
            brand: true,
            productName: true,
            category: true,
            nominalVolumeMl: true,
          },
        },
        requester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}
