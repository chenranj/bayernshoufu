import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { inviteUser, deleteUser } from '../_actions';
import { AdminRoleSelect } from '@/components/admin-role-select';

export const dynamic = 'force-dynamic';

export default async function UsersAdmin({
  searchParams,
}: {
  searchParams: { invited?: string; error?: string };
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="font-display text-3xl uppercase tracking-tightest mb-6">Users</h1>

      {searchParams.invited && (
        <div className="mb-4 border border-bayern-red/40 bg-bayern-red/10 px-4 py-3 text-sm">
          ✓ Invited <span className="font-mono">{searchParams.invited}</span>. They'll receive an email shortly.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 border border-bayern-red bg-bayern-red/15 px-4 py-3 text-sm text-white">
          <span className="font-semibold uppercase tracking-widest text-xs">Invite failed:</span>{' '}
          {searchParams.error}
        </div>
      )}

      <form
        action={inviteUser}
        className="bg-bayern-surface border border-bayern-border p-5 mb-8 grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
      >
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" placeholder="user@example.com" />
        </div>
        <div>
          <label className="label">Role</label>
          <select name="role" className="input">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="btn-primary uppercase tracking-widest text-sm">
          Send invite
        </button>
      </form>

      <p className="text-xs text-bayern-muted mb-3">
        Invitations send a Supabase magic link. The user lands on /auth/set-password to choose their password.
      </p>

      <div className="border border-bayern-border bg-bayern-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black border-b border-bayern-border text-bayern-muted">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase tracking-widest">Email</th>
              <th className="text-left px-4 py-3 text-xs uppercase tracking-widest hidden md:table-cell">Name</th>
              <th className="text-left px-4 py-3 text-xs uppercase tracking-widest">Role</th>
              <th className="text-left px-4 py-3 text-xs uppercase tracking-widest hidden md:table-cell">Joined</th>
              <th className="text-right px-4 py-3 text-xs uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="border-b border-bayern-border last:border-b-0">
                <td className="px-4 py-3 font-mono text-xs">{p.email}</td>
                <td className="px-4 py-3 hidden md:table-cell">{p.display_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <AdminRoleSelect userId={p.id} defaultRole={p.role as 'user' | 'admin'} />
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-bayern-muted">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteUser} className="inline">
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="text-xs uppercase tracking-widest text-bayern-red hover:text-white"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
