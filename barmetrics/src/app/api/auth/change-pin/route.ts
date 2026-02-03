import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, AuthError, hashPin, verifyPin } from '@/lib/auth';
import { z } from 'zod';

const changePinSchema = z.object({
  currentPin: z.string().min(1, 'Current PIN is required'),
  newPin: z.string().min(4, 'PIN must be at least 4 characters').max(10, 'PIN must be at most 10 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth(request);

    const body = await request.json();
    const { currentPin, newPin } = changePinSchema.parse(body);

    // Get user with current PIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current PIN
    if (user.pin && !verifyPin(currentPin, user.pin)) {
      return NextResponse.json(
        { error: 'Current PIN is incorrect' },
        { status: 401 }
      );
    }

    // Update PIN
    await prisma.user.update({
      where: { id: session.user.id },
      data: { pin: hashPin(newPin) },
    });

    return NextResponse.json({ message: 'PIN updated successfully' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Change PIN error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to change PIN' },
      { status: 500 }
    );
  }
}
