/**
 * Authentication utilities for BarMetrics
 */

import { cookies } from 'next/headers';
import { prisma } from './db';
import { type Role, hasPermission, type Permission, PermissionError } from './permissions';

const SESSION_COOKIE_NAME = 'barmetrics_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface SessionData {
  user: AuthUser;
  sessionId: string;
  expiresAt: Date;
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/**
 * Hash a PIN using simple base64 encoding
 * Note: In production, use bcrypt or argon2
 */
export function hashPin(pin: string): string {
  return Buffer.from(pin).toString('base64');
}

/**
 * Verify a PIN against a hash
 */
export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  deviceId?: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      deviceId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Get the current session from cookies (server-side)
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || !session.user.isActive) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return {
      user: {
        id: session.user.id,
        username: session.user.username,
        displayName: session.user.displayName,
        role: session.user.role as Role,
      },
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Get session from token (for API routes)
 */
export async function getSessionFromToken(token: string): Promise<SessionData | null> {
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || !session.user.isActive) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return {
      user: {
        id: session.user.id,
        username: session.user.username,
        displayName: session.user.displayName,
        role: session.user.role as Role,
      },
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  try {
    await prisma.session.delete({ where: { token } });
  } catch {
    // Session may not exist, ignore
  }
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Clean up expired sessions (can be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

/**
 * Require authentication for an API route
 * Returns the session data or throws an error
 */
export async function requireAuth(request: Request): Promise<SessionData> {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('Authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Fall back to cookie
  if (!token) {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      );
      token = cookies[SESSION_COOKIE_NAME];
    }
  }

  if (!token) {
    throw new AuthError('Authentication required');
  }

  const session = await getSessionFromToken(token);
  if (!session) {
    throw new AuthError('Invalid or expired session');
  }

  return session;
}

/**
 * Require a specific permission for an API route
 */
export async function requirePermission(
  request: Request,
  permission: Permission
): Promise<SessionData> {
  const session = await requireAuth(request);

  if (!hasPermission(session.user.role, permission)) {
    throw new PermissionError(permission, session.user.role);
  }

  return session;
}

/**
 * Authentication error
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Session cookie name export for use in API routes
 */
export { SESSION_COOKIE_NAME };
