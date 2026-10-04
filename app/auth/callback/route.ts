import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/jerseys';
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          url
        )
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'invite' | 'magiclink' | 'recovery' | 'email',
      token_hash: tokenHash,
    });

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          url
        )
      );
    }
  } else {
    return NextResponse.redirect(
      new URL('/login?error=Missing+auth+code', url)
    );
  }

  // Only send users to the password setup page when
  // the callback explicitly requests the invite flow.
  const destination = next.includes('set-password')
    ? '/auth/set-password'
    : next;

  return NextResponse.redirect(new URL(destination, url));
}
