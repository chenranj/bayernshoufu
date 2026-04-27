import { createClient } from '@/lib/supabase/server';
import { DeleteAccountForm } from '@/components/delete-account-form';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, display_name, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="px-4 lg:px-8 py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-4xl uppercase tracking-tightest leading-none mb-8">
        Account
      </h1>

      <section className="border border-bayern-border p-6 mb-8 bg-bayern-surface">
        <h2 className="text-xs uppercase tracking-widest text-bayern-muted mb-4">Profile</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-bayern-border pb-2">
            <dt className="text-bayern-muted">Email</dt>
            <dd className="font-mono">{profile?.email}</dd>
          </div>
          <div className="flex justify-between border-b border-bayern-border pb-2">
            <dt className="text-bayern-muted">Name</dt>
            <dd>{profile?.display_name ?? '—'}</dd>
          </div>
          <div className="flex justify-between border-b border-bayern-border pb-2">
            <dt className="text-bayern-muted">Role</dt>
            <dd className="uppercase">{profile?.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bayern-muted">Joined</dt>
            <dd>
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="border border-bayern-red/40 p-6 bg-bayern-red/5">
        <h2 className="text-xs uppercase tracking-widest text-bayern-red mb-2">Danger zone</h2>
        <p className="text-sm text-bayern-muted mb-4">
          Permanently delete your account, favorites, and any session data. This cannot be undone.
        </p>
        <DeleteAccountForm email={profile?.email ?? user.email ?? ''} />
      </section>
    </div>
  );
}
