import Link from 'next/link';
import { Suspense } from 'react';
import { requireAdmin } from '@/lib/admin-guard';
import { SiteNav } from '@/components/site-nav';
import { AdminSidebar } from '@/components/admin-sidebar';
import { Flash } from '@/components/flash';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireAdmin();
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, display_name, role')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      <SiteNav
        email={profile?.email ?? user.email ?? ''}
        displayName={profile?.display_name ?? null}
        isAdmin
      />
      <Suspense fallback={null}>
        <Flash />
      </Suspense>
      <div className="flex-1 flex flex-col lg:flex-row">
        <AdminSidebar />
        <div className="flex-1 px-4 lg:px-8 py-6 max-w-6xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-2 h-6 bg-bayern-red" />
            <span className="text-xs uppercase tracking-widest text-bayern-muted">
              Admin Console
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
