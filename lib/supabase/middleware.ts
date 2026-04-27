import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/auth/confirm',
  '/auth/set-password',
  // Banner images render on the login page before the user is authenticated.
  // The route itself enforces that only the 'banners' bucket is public.
  '/api/image/banners',
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

  // If a Supabase auth payload (PKCE code or OTP token_hash) lands at any
  // route other than the dedicated callback, forward it to the callback so
  // we can exchange it for a session before any other middleware logic.
  const hasCode = request.nextUrl.searchParams.has('code');
  const hasTokenHash = request.nextUrl.searchParams.has('token_hash');
  if ((hasCode || hasTokenHash) && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    // Default new sessions to the set-password page — every auth flow that
    // lands here (invite, recovery, magic link) is one where the user either
    // needs to set a password for the first time or just reset it.
    if (!url.searchParams.has('next')) {
      url.searchParams.set('next', '/auth/set-password');
    }
    return NextResponse.redirect(url);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isAsset =
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/static');

  if (!user && !isPublic && !isAsset) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/jerseys';
    return NextResponse.redirect(url);
  }

  return response;
}
