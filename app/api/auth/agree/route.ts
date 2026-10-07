import { NextRequest, NextResponse } from 'next/server';

const TERMS_AGREED_COOKIE = 'blue_terms_agreed';
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get('redirect') ?? '/';

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(TERMS_AGREED_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  });

  return response;
}
