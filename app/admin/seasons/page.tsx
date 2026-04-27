import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { createSeason, updateSeason, deleteSeason } from '../_actions';

export const dynamic = 'force-dynamic';

export default async function SeasonsAdmin() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: seasons } = await admin
    .from('seasons')
    .select('*')
    .order('year_start', { ascending: false });

  return (
    <div>
      <h1 className="font-display text-3xl uppercase tracking-tightest mb-6">Seasons</h1>

      <form action={createSeason} className="bg-bayern-surface border border-bayern-border p-5 mb-8 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="label">Label</label>
          <input name="label" required placeholder="2023/24" className="input" />
        </div>
        <div>
          <label className="label">Year start</label>
          <input name="year_start" type="number" required className="input" />
        </div>
        <div>
          <label className="label">Year end</label>
          <input name="year_end" type="number" required className="input" />
        </div>
        <div>
          <label className="label">Sort</label>
          <input name="sort_order" type="number" defaultValue={0} className="input" />
        </div>
        <button type="submit" className="btn-primary uppercase tracking-widest text-sm md:col-span-5">
          Add season
        </button>
      </form>

      <div className="space-y-2">
        {(seasons ?? []).map((s) => (
          <form
            key={s.id}
            action={updateSeason}
            className="bg-bayern-surface border border-bayern-border p-4 grid grid-cols-1 md:grid-cols-12 gap-2 items-end"
          >
            <input type="hidden" name="id" value={s.id} />
            <div className="md:col-span-3">
              <label className="label">Label</label>
              <input name="label" defaultValue={s.label} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">From</label>
              <input name="year_start" type="number" defaultValue={s.year_start} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">To</label>
              <input name="year_end" type="number" defaultValue={s.year_end} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Sort</label>
              <input name="sort_order" type="number" defaultValue={s.sort_order} className="input" />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="btn-ghost uppercase tracking-widest text-xs flex-1">
                Save
              </button>
              <button
                type="submit"
                formAction={deleteSeason}
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
