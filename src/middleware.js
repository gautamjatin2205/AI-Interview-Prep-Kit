import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('token')?.value;
  const pathname = request.nextUrl.pathname;

  // Protected routes requiring authentication
  const protectedPrefixes = ['/dashboard', '/kit', '/practice'];
  const isProtected = protectedPrefixes.some(prefix => pathname.startsWith(prefix));

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect unauthenticated users at root '/' to /register (onboarding flow)
  if (pathname === '/' && !token) {
    return NextResponse.redirect(new URL('/register', request.url));
  }

  // Redirect already-authenticated users away from auth pages and root to dashboard
  if ((pathname === '/login' || pathname === '/register' || pathname === '/') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/kit/:path*', '/practice/:path*', '/login', '/register'],
};
