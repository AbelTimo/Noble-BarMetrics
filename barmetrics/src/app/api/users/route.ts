import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, AuthError, hashPin } from '@/lib/auth';
import { PERMISSIONS, PermissionError, ROLES } from '@/lib/permissions';
import { z } from 'zod';

const userCreateSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Username must be lowercase alphanumeric with underscores'),
  displayName: z.string().min(1).max(100),
  role: z.enum(ROLES),
  pin: z.string().min(4).max(10).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Require user view permission
    await requirePermission(request, PERMISSIONS.USER_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { username: { contains: search.toLowerCase() } },
        { displayName: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
    });

    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require user create permission
    await requirePermission(request, PERMISSIONS.USER_CREATE);

    const body = await request.json();
    const validated = userCreateSchema.parse(body);

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username: validated.username.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        username: validated.username.toLowerCase(),
        displayName: validated.displayName,
        role: validated.role,
        pin: validated.pin ? hashPin(validated.pin) : null,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error creating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
