import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { createJersey, updateJersey, deleteJersey } from '../_actions';

export const dynamic = 'force-dynamic';

const KIT_OPTIONS = ['home', 'away', 'third', 'goalkeeper', 'special', 'training', 'other'] as const;

export default async function JerseysAdmin() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: jerseys }, { data: seasons }, { data: players }, { data: links }] = await Promise.all([
    admin.from('jerseys').select('*').order('release_year', { ascending: false }),
    admin.from('seasons').select('id, label, slug').order('year_start', { ascending: false }),
    admin.from('players').select('id, full_name').order('full_name'),
    admin.from('jersey_players').select('jersey_id, player_id'),
  ]);

  const linkMap = new Map<string, Set<string>>();
  for (const l of links ?? []) {
    if (!linkMap.has(l.jersey_id)) linkMap.set(l.jersey_id, new Set());
    linkMap.get(l.jersey_id)!.add(l.player_id);
  }

  return (
    <div>
      <h1 className="font-display text-3xl uppercase tracking-tightest mb-6">Jerseys</h1>

      <form
        action={createJersey}
        encType="multipart/form-data"
        className="bg-bayern-surface border border-bayern-border p-5 mb-8 grid grid-cols-1 md:grid-cols-12 gap-3"
      >
        <div className="md:col-span-6">
          <label className="label">Name</label>
          <input name="name" required className="input" placeholder="Home Kit 2023/24" />
        </div>
        <div className="md:col-span-3">
          <label className="label">Season</label>
          <select name="season_id" required className="input">
            <option value="">Choose…</option>
            {(seasons ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="label">Kit</label>
          <select name="kit_type" className="input">
            {KIT_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Release year</label>
          <input name="release_year" type="number" className="input" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Sort</label>
          <input name="sort_order" type="number" defaultValue={0} className="input" />
        </div>
        <div className="md:col-span-8">
          <label className="label">Image</label>
          <input name="image" type="file" accept="image/*" required className="input" />
        </div>
        <div className="md:col-span-12">
          <label className="label">Description</label>
          <textarea name="description" rows={2} className="input" />
        </div>
        <div className="md:col-span-12">
          <label className="label">Players (Cmd/Ctrl-click for multi)</label>
          <select name="player_ids" multiple className="input min-h-32">
            {(players ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary uppercase tracking-widest text-sm md:col-span-12">
          Add jersey
        </button>
      </form>

      <div className="space-y-4">
        {(jerseys ?? []).map((j) => {
          const linked = Array.from(linkMap.get(j.id) ?? new Set<string>());
          return (
            <form
              key={j.id}
              action={updateJersey}
              encType="multipart/form-data"
              className="bg-bayern-surface border border-bayern-border p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
            >
              <input type="hidden" name="id" value={j.id} />
              <div className="md:col-span-2">
                <img
                  src={`/api/image/jerseys/${j.id}`}
                  alt={j.name}
                  className="w-full aspect-[3/4] object-cover border border-bayern-border"
                  draggable={false}
                />
              </div>
              <div className="md:col-span-10 grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6">
                  <label className="label">Name</label>
                  <input name="name" defaultValue={j.name} className="input" />
                </div>
                <div className="md:col-span-3">
                  <label className="label">Season</label>
                  <select name="season_id" defaultValue={j.season_id} className="input">
                    {(seasons ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="label">Kit</label>
                  <select name="kit_type" defaultValue={j.kit_type} className="input">
                    {KIT_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Release year</label>
                  <input name="release_year" type="number" defaultValue={j.release_year ?? ''} className="input" />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Sort</label>
                  <input name="sort_order" type="number" defaultValue={j.sort_order} className="input" />
                </div>
                <div className="md:col-span-8">
                  <label className="label">Replace image</label>
                  <input name="image" type="file" accept="image/*" className="input" />
                </div>
                <div className="md:col-span-12">
                  <label className="label">Description</label>
                  <textarea name="description" defaultValue={j.description ?? ''} rows={2} className="input" />
                </div>
                <div className="md:col-span-12">
                  <label className="label">Players</label>
                  <select name="player_ids" multiple defaultValue={linked} className="input min-h-32">
                    {(players ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-12 flex gap-2">
                  <button type="submit" className="btn-ghost uppercase tracking-widest text-xs">Save</button>
                  <button
                    type="submit"
                    formAction={deleteJersey}
                    className="border border-bayern-red/40 hover:bg-bayern-red text-bayern-red hover:text-white px-3 text-xs uppercase tracking-widest transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
