import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[Supabase] Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local and the dev server is restarted.'
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/auth');
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isApiRoute = pathname.startsWith('/api');

  // Allow API routes to pass through without authentication checks
  if (isApiRoute) {
    return supabaseResponse;
  }

  // Protect auth routes: redirect logged-in users away from auth pages
  // When logged in, users should not access login/signup pages
  // Exceptions: verify and new-password may be accessed via email links
  if (user && isAuthRoute) {
    const allowedAuthPages = ['/auth/verify', '/auth/new-password'];
    const isAllowedAuthPage = allowedAuthPages.some(page => pathname === page);
    
    if (!isAllowedAuthPage) {
      // User is logged in and trying to access login/signup/reset-password, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect dashboard routes: redirect unauthenticated users to login
  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return supabaseResponse;
}
