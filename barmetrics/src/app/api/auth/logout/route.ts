import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      // Delete session from database
      await deleteSession(token);
    }

    // Create response and clear cookie
    const response = NextResponse.json({ success: true });

    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
