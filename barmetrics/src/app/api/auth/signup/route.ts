import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, hashPin, SESSION_COOKIE_NAME } from '@/lib/auth';
import { z } from 'zod';

const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Username must be lowercase letters, numbers, or underscores'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  pin: z
    .string()
    .min(4, 'PIN must be at least 4 digits')
    .max(10)
    .regex(/^\d+$/, 'PIN must be digits only'),
  deviceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, displayName, pin, deviceId } = signupSchema.parse(body);

    const lowered = username.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { username: lowered } });
    if (existing) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // The very first account bootstraps as MANAGER; everyone after is a
    // BARTENDER whom a manager can promote on the /users page.
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'MANAGER' : 'BARTENDER';

    const user = await prisma.user.create({
      data: {
        username: lowered,
        displayName,
        role,
        pin: hashPin(pin),
        isActive: true,
      },
    });

    const { token, expiresAt } = await createSession(user.id, deviceId);

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        },
        expiresAt: expiresAt.toISOString(),
      },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
