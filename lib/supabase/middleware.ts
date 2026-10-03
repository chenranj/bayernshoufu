import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PATHS = [
  '/account',
  '/favorites',
  '/admin',
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Handle Supabase auth callback payloads.
  const hasCode = request.nextUrl.searchParams.has('code');
  const hasTokenHash = request.nextUrl.searchParams.has('token_hash');

  if ((hasCode || hasTokenHash) && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';

    if (!url.searchParams.has('next')) {
      url.searchParams.set('next', '/auth/set-password');
    }

    return NextResponse.redirect(url);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  // Only protected areas require login.
  // Public visitors can browse the rest of the website.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Logged-in users don't need the login page.
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/jerseys';
    return NextResponse.redirect(url);
  }

  return response;
}
