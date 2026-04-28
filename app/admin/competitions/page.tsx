import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { createCompetition, updateCompetition, deleteCompetition } from '../_actions';

export const dynamic = 'force-dynamic';

export default async function CompetitionsAdmin() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: competitions } = await admin
    .from('competitions')
    .select('*')
    .order('sort_order')
    .order('name');

  return (
    <div>
      <h1 className="font-display text-3xl uppercase tracking-tightest mb-6">Competitions</h1>
      <p className="text-bayern-muted text-sm mb-6">
        Add the competition / tournament names you want to assign to jerseys
        (e.g. Bundesliga, Champions League, DFB-Pokal). They will appear as a
        dropdown when you create or edit a jersey.
      </p>

      <form
        action={createCompetition}
        className="bg-bayern-surface border border-bayern-border p-5 mb-8 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
      >
        <div className="md:col-span-3">
          <label className="label">Name</label>
          <input name="name" required placeholder="Bundesliga" className="input" />
        </div>
        <div>
          <label className="label">Sort</label>
          <input name="sort_order" type="number" defaultValue={0} className="input" />
        </div>
        <button type="submit" className="btn-primary uppercase tracking-widest text-sm">
          Add
        </button>
      </form>

      <div className="space-y-2">
        {(competitions ?? []).map((c) => (
          <form
            key={c.id}
            action={updateCompetition}
            className="bg-bayern-surface border border-bayern-border p-4 grid grid-cols-1 md:grid-cols-12 gap-2 items-end"
          >
            <input type="hidden" name="id" value={c.id} />
            <div className="md:col-span-7">
              <label className="label">Name</label>
              <input name="name" defaultValue={c.name} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Sort</label>
              <input name="sort_order" type="number" defaultValue={c.sort_order} className="input" />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="btn-ghost uppercase tracking-widest text-xs flex-1">
                Save
              </button>
              <button
                type="submit"
                formAction={deleteCompetition}
                className="border border-bayern-red/40 hover:bg-bayern-red text-bayern-red hover:text-white px-3 text-xs uppercase tracking-widest transition-colors"
              >
                Delete
              </button>
            </div>
          </form>
        ))}
        {!(competitions ?? []).length && (
          <p className="text-bayern-muted text-sm">No competitions yet — add your first above.</p>
        )}
      </div>
    </div>
  );
}
