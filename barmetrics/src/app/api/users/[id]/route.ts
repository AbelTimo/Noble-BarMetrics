import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, AuthError, hashPin, deleteAllUserSessions } from '@/lib/auth';
import { PERMISSIONS, PermissionError, ROLES } from '@/lib/permissions';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const userUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  role: z.enum(ROLES).optional(),
  pin: z.string().min(4).max(10).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require user view permission
    await requirePermission(request, PERMISSIONS.USER_VIEW);

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Require user update permission
    const session = await requirePermission(request, PERMISSIONS.USER_UPDATE);

    const { id } = await params;
    const body = await request.json();
    const validated = userUpdateSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent managers from demoting themselves
    if (session.user.id === id && validated.role && validated.role !== existingUser.role) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    // Prevent managers from deactivating themselves
    if (session.user.id === id && validated.isActive === false) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (validated.displayName !== undefined) {
      updateData.displayName = validated.displayName;
    }
    if (validated.role !== undefined) {
      updateData.role = validated.role;
    }
    if (validated.pin !== undefined) {
      updateData.pin = validated.pin ? hashPin(validated.pin) : null;
    }
    if (validated.isActive !== undefined) {
      updateData.isActive = validated.isActive;
      // If deactivating, also delete all their sessions
      if (!validated.isActive) {
        await deleteAllUserSessions(id);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error updating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Require user delete permission
    const session = await requirePermission(request, PERMISSIONS.USER_DELETE);

    const { id } = await params;

    // Prevent managers from deleting themselves
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete all sessions first, then delete user
    await deleteAllUserSessions(id);
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
