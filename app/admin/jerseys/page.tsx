import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';
import {
  createJersey,
  updateJersey,
  deleteJersey,
  deleteJerseyImage,
} from '../_actions';
import { PlayerCombobox } from '@/components/player-combobox';

export const dynamic = 'force-dynamic';

const KIT_OPTIONS = ['home', 'away', 'third', 'goalkeeper', 'special', 'training', 'other'] as const;

export default async function JerseysAdmin() {
  await requireAdmin();
  const admin = createAdminClient();

  const [
    { data: jerseys },
    { data: seasons },
    { data: competitions },
    { data: players },
    { data: links },
    { data: images },
  ] = await Promise.all([
    admin.from('jerseys').select('*').order('release_year', { ascending: false }),
    admin.from('seasons').select('id, label, slug').order('year_start', { ascending: false }),
    admin.from('competitions').select('id, name, slug').order('sort_order').order('name'),
    admin.from('players').select('id, full_name').order('full_name'),
    admin.from('jersey_players').select('jersey_id, player_id'),
    admin.from('jersey_images').select('id, jersey_id, image_path, sort_order').order('sort_order'),
  ]);

  const linkMap = new Map<string, Set<string>>();
  for (const l of links ?? []) {
    if (!linkMap.has(l.jersey_id)) linkMap.set(l.jersey_id, new Set());
    linkMap.get(l.jersey_id)!.add(l.player_id);
  }

  const imagesByJersey = new Map<string, { id: string; sort_order: number }[]>();
  for (const img of images ?? []) {
    const arr = imagesByJersey.get(img.jersey_id) ?? [];
    arr.push({ id: img.id, sort_order: img.sort_order });
    imagesByJersey.set(img.jersey_id, arr);
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
        <div className="md:col-span-4">
          <label className="label">Competition</label>
          <select name="competition_id" className="input" defaultValue="">
            <option value="">— None —</option>
            {(competitions ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-[10px] text-bayern-muted mt-1">
            Manage list at <a href="/admin/competitions" className="underline">Competitions</a>
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="label">Release year</label>
          <input name="release_year" type="number" className="input" />
        </div>
        <div className="md:col-span-6">
          <label className="label">Images (pick multiple)</label>
          <input name="images" type="file" accept="image/*" multiple required className="input" />
          <p className="text-[10px] text-bayern-muted mt-1">
            First photo becomes the cover. Cmd/Ctrl-click or drag in to add several.
          </p>
        </div>
        <div className="md:col-span-12">
          <label className="label">Description</label>
          <textarea name="description" rows={2} className="input" placeholder="Caption shown on the home page" />
        </div>
        <div className="md:col-span-12">
          <label className="label">Players</label>
          <PlayerCombobox name="player_ids" options={players ?? []} />
        </div>
        <button type="submit" className="btn-primary uppercase tracking-widest text-sm md:col-span-12">
          Add jersey
        </button>
      </form>

      <div className="space-y-4">
        {(jerseys ?? []).map((j) => {
          const linked = Array.from(linkMap.get(j.id) ?? new Set<string>());
          const gallery = imagesByJersey.get(j.id) ?? [];
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
                {gallery.length > 1 && (
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-bayern-muted">
                    {gallery.length} photos
                  </p>
                )}
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
                <div className="md:col-span-4">
                  <label className="label">Competition</label>
                  <select
                    name="competition_id"
                    defaultValue={j.competition_id ?? ''}
                    className="input"
                  >
                    <option value="">— None —</option>
                    {(competitions ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Release year</label>
                  <input name="release_year" type="number" defaultValue={j.release_year ?? ''} className="input" />
                </div>
                <div className="md:col-span-6">
                  <label className="label">Add more images</label>
                  <input name="images" type="file" accept="image/*" multiple className="input" />
                  <label className="flex items-center gap-2 text-xs mt-1">
                    <input type="checkbox" name="replace_cover" /> Replace cover with first new image
                  </label>
                </div>
                <div className="md:col-span-12">
                  <label className="label">Description</label>
                  <textarea name="description" defaultValue={j.description ?? ''} rows={2} className="input" />
                </div>
                <div className="md:col-span-12">
                  <label className="label">Players</label>
                  <PlayerCombobox
                    name="player_ids"
                    options={players ?? []}
                    defaultSelected={linked}
                  />
                </div>
                {gallery.length > 0 && (
                  <div className="md:col-span-12">
                    <label className="label">Gallery</label>
                    <div className="flex flex-wrap gap-2">
                      {gallery.map((g) => (
                        <div key={g.id} className="relative w-20">
                          <img
                            src={`/api/image/jersey-images/${g.id}`}
                            alt=""
                            className="w-20 h-24 object-cover border border-bayern-border"
                            draggable={false}
                          />
                          <button
                            type="submit"
                            formAction={deleteJerseyImage}
                            name="image_id"
                            value={g.id}
                            className="absolute top-1 right-1 bg-black/80 hover:bg-bayern-red text-white text-[10px] uppercase tracking-widest px-1.5 py-0.5"
                            title="Remove this photo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
