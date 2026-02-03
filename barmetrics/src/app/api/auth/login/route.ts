import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, verifyPin, SESSION_COOKIE_NAME } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  pin: z.string().min(1, 'PIN is required'),
  deviceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, pin, deviceId } = loginSchema.parse(body);

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or PIN' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Verify PIN if set
    if (user.pin) {
      if (!verifyPin(pin, user.pin)) {
        return NextResponse.json(
          { error: 'Invalid username or PIN' },
          { status: 401 }
        );
      }
    }

    // Create session
    const { token, expiresAt } = await createSession(user.id, deviceId);

    // Create response with session cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      expiresAt: expiresAt.toISOString(),
    });

    // Set session cookie
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
