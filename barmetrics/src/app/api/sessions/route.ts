import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sessionCreateSchema } from '@/lib/validations';

export async function GET() {
  try {
    const sessions = await prisma.measurementSession.findMany({
      include: {
        _count: {
          select: { measurements: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = sessionCreateSchema.parse(body);

    const session = await prisma.measurementSession.create({
      data: validated,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
