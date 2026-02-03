import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getPermissionsForRole } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', user: null },
        { status: 401 }
      );
    }

    const session = await getSessionFromToken(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session', user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: session.user,
      permissions: getPermissionsForRole(session.user.role),
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Authentication check failed', user: null },
      { status: 500 }
    );
  }
}
