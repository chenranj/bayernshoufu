import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { createPlayer, updatePlayer, deletePlayer } from '../_actions';

export const dynamic = 'force-dynamic';

export default async function PlayersAdmin() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: players } = await admin
    .from('players')
    .select('*')
    .order('is_legend', { ascending: false })
    .order('full_name');

  return (
    <div>
      <h1 className="font-display text-3xl uppercase tracking-tightest mb-6">Players</h1>

      <form
        action={createPlayer}
        encType="multipart/form-data"
        className="bg-bayern-surface border border-bayern-border p-5 mb-8 grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <div className="md:col-span-2">
          <label className="label">Full name</label>
          <input name="full_name" required className="input" placeholder="Thomas Müller" />
        </div>
        <div>
          <label className="label">Shirt number</label>
          <input name="shirt_number" type="number" className="input" />
        </div>
        <div>
          <label className="label">Position</label>
          <input name="position" className="input" placeholder="Forward" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Bio</label>
          <textarea name="bio" rows={3} className="input" />
        </div>
        <div>
          <label className="label">Photo</label>
          <input name="photo" type="file" accept="image/*" className="input" />
        </div>
        <div>
          <label className="label">Sort</label>
          <input name="sort_order" type="number" defaultValue={0} className="input" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_legend" /> Mark as legend
        </label>
        <button type="submit" className="btn-primary uppercase tracking-widest text-sm md:col-span-2">
          Add player
        </button>
      </form>

      <div className="space-y-3">
        {(players ?? []).map((p) => (
          <form
            key={p.id}
            action={updatePlayer}
            encType="multipart/form-data"
            className="bg-bayern-surface border border-bayern-border p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
          >
            <input type="hidden" name="id" value={p.id} />
            <div className="md:col-span-1">
              {p.photo_path ? (
                <img
                  src={`/api/image/players/${p.id}`}
                  alt={p.full_name}
                  className="w-full aspect-square object-cover border border-bayern-border"
                  draggable={false}
                />
              ) : (
                <div className="w-full aspect-square bg-black border border-bayern-border flex items-center justify-center text-bayern-muted text-xs">
                  No photo
                </div>
              )}
            </div>
            <div className="md:col-span-3">
              <label className="label">Name {p.is_legend && <span className="text-bayern-red">★</span>}</label>
              <input name="full_name" defaultValue={p.full_name} className="input" />
            </div>
            <div className="md:col-span-1">
              <label className="label">#</label>
              <input name="shirt_number" type="number" defaultValue={p.shirt_number ?? ''} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Position</label>
              <input name="position" defaultValue={p.position ?? ''} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Photo (replace)</label>
              <input name="photo" type="file" accept="image/*" className="input" />
            </div>
            <div className="md:col-span-1">
              <label className="label">Sort</label>
              <input name="sort_order" type="number" defaultValue={p.sort_order} className="input" />
            </div>
            <label className="md:col-span-2 flex items-center gap-2 text-xs pt-6">
              <input type="checkbox" name="is_legend" defaultChecked={p.is_legend} /> Legend
            </label>
            <div className="md:col-span-12">
              <label className="label">Bio</label>
              <textarea name="bio" defaultValue={p.bio ?? ''} rows={2} className="input" />
            </div>
            <div className="md:col-span-12 flex gap-2">
              <button type="submit" className="btn-ghost uppercase tracking-widest text-xs">Save</button>
              <button
                type="submit"
                formAction={deletePlayer}
                className="border border-bayern-red/40 hover:bg-bayern-red text-bayern-red hover:text-white px-3 text-xs uppercase tracking-widest transition-colors"
              >
                Delete
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
