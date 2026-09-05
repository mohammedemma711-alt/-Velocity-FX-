import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow access to auth login pages explicitly
  if (pathname === '/admin/login' || pathname === '/login') {
    return NextResponse.next();
  }

  // Check Supabase session token in cookies
  const authCookie = request.cookies.get('sb-access-token') || 
                     request.cookies.get('supabase-auth-token') ||
                     request.cookies.getAll().find(c => (c.name.includes('auth-token') || c.name.startsWith('sb-')) && c.value && c.value.trim() !== '');
  
  const hasAuth = !!authCookie && !!authCookie.value && authCookie.value.trim() !== '';

  // 2. Protect all /admin/* routes
  if (pathname.startsWith('/admin')) {
    if (!hasAuth) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Protect /dashboard route
  if (pathname.startsWith('/dashboard')) {
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

