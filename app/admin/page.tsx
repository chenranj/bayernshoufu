import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  await requireAdmin();
  const admin = createAdminClient();

  const [seasons, players, jerseys, banners, profiles, logs] = await Promise.all([
    admin.from('seasons').select('id', { count: 'exact', head: true }),
    admin.from('players').select('id', { count: 'exact', head: true }),
    admin.from('jerseys').select('id', { count: 'exact', head: true }),
    admin.from('banners').select('id', { count: 'exact', head: true }),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin
      .from('image_access_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString()),
  ]);

  const stats = [
    { label: 'Users', value: profiles.count ?? 0 },
    { label: 'Seasons', value: seasons.count ?? 0 },
    { label: 'Players', value: players.count ?? 0 },
    { label: 'Jerseys', value: jerseys.count ?? 0 },
    { label: 'Banners', value: banners.count ?? 0 },
    { label: 'Image views (7d)', value: logs.count ?? 0 },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl uppercase tracking-tightest mb-6">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-bayern-border bg-bayern-surface p-5">
            <p className="text-xs uppercase tracking-widest text-bayern-muted">{s.label}</p>
            <p className="font-display text-4xl mt-2">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
