import Link from 'next/link';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { SiteNav } from '@/components/site-nav';
import { Flash } from '@/components/flash';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    id: string;
    email: string | null;
    display_name: string | null;
    role: string | null;
  } | null = null;

  // Only load a profile when somebody is logged in.
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, role')
      .eq('id', user.id)
      .maybeSingle();

    profile = data;
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      <SiteNav
        email={profile?.email ?? user?.email ?? ''}
        displayName={profile?.display_name ?? null}
        isAdmin={profile?.role === 'admin'}
      />

      <Suspense fallback={null}>
        <Flash />
      </Suspense>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-bayern-border py-6 px-4 text-center text-xs text-bayern-muted">
        <p>
          Bayernshoufu — fan archive. Not affiliated with FC Bayern München AG.
          <span className="mx-2">·</span>

          {user ? (
            <Link href="/account" className="hover:text-white">
              Account
            </Link>
          ) : (
            <Link href="/login" className="hover:text-white">
              Login
            </Link>
          )}
        </p>
      </footer>
    </div>
  );
}
