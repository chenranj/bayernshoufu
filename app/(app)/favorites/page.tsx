import { createClient } from '@/lib/supabase/server';
import { JerseyGrid } from '@/components/jersey-grid';
import { PlayerSpotlight } from '@/components/player-spotlight';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: favJ }, { data: favP }, { data: seasons }] = await Promise.all([
    supabase.from('favorite_jerseys').select('jersey_id').eq('user_id', user.id),
    supabase.from('favorite_players').select('player_id').eq('user_id', user.id),
    supabase.from('seasons').select('*').order('year_start', { ascending: false }),
  ]);

  const jIds = (favJ ?? []).map((f) => f.jersey_id);
  const pIds = (favP ?? []).map((f) => f.player_id);

  const [{ data: jerseys }, { data: players }] = await Promise.all([
    jIds.length
      ? supabase.from('jerseys').select('*').in('id', jIds)
      : Promise.resolve({ data: [] as never[] }),
    pIds.length
      ? supabase
          .from('players')
          .select('id, full_name, slug, photo_path, is_legend')
          .in('id', pIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tightest leading-none">
          Your <span className="text-bayern-red">Collection</span>
        </h1>
        <p className="text-bayern-muted mt-2 text-sm">
          Players and jerseys you've saved.
        </p>
      </div>

      {(players ?? []).length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-widest text-bayern-muted mb-3">
            Players ({(players ?? []).length})
          </h2>
          <PlayerSpotlight players={players ?? []} favorites={new Set(pIds)} />
        </section>
      )}

      <section>
        <h2 className="text-xs uppercase tracking-widest text-bayern-muted mb-3">
          Jerseys ({(jerseys ?? []).length})
        </h2>
        {(jerseys ?? []).length === 0 ? (
          <div className="border border-dashed border-bayern-border py-20 text-center text-bayern-muted">
            No jerseys saved yet. Tap the heart on any kit to save it here.
          </div>
        ) : (
          <JerseyGrid
            jerseys={jerseys ?? []}
            seasons={seasons ?? []}
            favorites={new Set(jIds)}
          />
        )}
      </section>
    </div>
  );
}
