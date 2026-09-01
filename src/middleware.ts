import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow access to /admin/login explicitly
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Check Supabase session token in cookies or auth headers
  const authCookie = request.cookies.get('sb-access-token') || 
                     request.cookies.get('supabase-auth-token') ||
                     request.cookies.getAll().find(c => c.name.includes('auth-token'));
  
  const hasAuth = !!authCookie;

  // 2. Protect all /admin/* routes
  if (pathname.startsWith('/admin')) {
    // If not authenticated via Supabase auth session cookie, redirect to /admin/login
    if (!hasAuth) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Protect /dashboard route
  if (pathname.startsWith('/dashboard')) {
    // If unauthenticated, redirect to /login
    if (!hasAuth) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*']
};
