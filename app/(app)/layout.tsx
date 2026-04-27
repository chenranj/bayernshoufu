import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SiteNav } from '@/components/site-nav';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      <SiteNav
        email={profile?.email ?? user.email ?? ''}
        displayName={profile?.display_name ?? null}
        isAdmin={profile?.role === 'admin'}
      />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-bayern-border py-6 px-4 text-center text-xs text-bayern-muted">
        <p>
          Bayernshoufu — fan archive. Not affiliated with FC Bayern München AG.
          <span className="mx-2">·</span>
          <Link href="/account" className="hover:text-white">Account</Link>
        </p>
      </footer>
    </div>
  );
}
