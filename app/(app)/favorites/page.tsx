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

  const [{ data: favJ }, { data: favP }, { data: seasons }, { data: competitions }] = await Promise.all([
    supabase.from('favorite_jerseys').select('jersey_id').eq('user_id', user.id),
    supabase.from('favorite_players').select('player_id').eq('user_id', user.id),
    supabase.from('seasons').select('*').order('year_start', { ascending: false }),
    supabase.from('competitions').select('*').order('sort_order').order('name'),
  ]);

  const jIds = (favJ ?? []).map((f) => f.jersey_id);
  const pIds = (favP ?? []).map((f) => f.player_id);

  const [{ data: jerseys }, { data: players }] = await Promise.all([
    jIds.length
      ? supabase
          .from('jerseys')
          .select('id, name, season_id, competition_id, kit_type, image_path, description, release_year, sort_order')
          .in('id', jIds)
      : Promise.resolve({ data: [] as any[] }),
    pIds.length
      ? supabase
          .from('players')
          .select('id, full_name, slug, photo_path, is_legend')
          .in('id', pIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const ids = (jerseys ?? []).map((j: any) => j.id);
  const galleryMap = new Map<string, string[]>();
  const playersByJersey = new Map<string, { id: string; full_name: string; slug: string }[]>();
  if (ids.length) {
    const [{ data: gallery }, { data: jpLinks }] = await Promise.all([
      supabase
        .from('jersey_images')
        .select('id, jersey_id, image_path, sort_order')
        .in('jersey_id', ids)
        .order('sort_order', { ascending: true }),
      supabase.from('jersey_players').select('jersey_id, player_id').in('jersey_id', ids),
    ]);
    const coverPathByJersey = new Map((jerseys ?? []).map((j: any) => [j.id, j.image_path]));
    for (const g of gallery ?? []) {
      if (g.image_path === coverPathByJersey.get(g.jersey_id)) continue;
      const arr = galleryMap.get(g.jersey_id) ?? [];
      arr.push(g.id);
      galleryMap.set(g.jersey_id, arr);
    }
    const playerIds = Array.from(new Set((jpLinks ?? []).map((l) => l.player_id)));
    if (playerIds.length) {
      const { data: linkedPlayers } = await supabase
        .from('players')
        .select('id, full_name, slug')
        .in('id', playerIds);
      const byId = new Map((linkedPlayers ?? []).map((p) => [p.id, p]));
      for (const l of jpLinks ?? []) {
        const p = byId.get(l.player_id);
        if (!p) continue;
        const arr = playersByJersey.get(l.jersey_id) ?? [];
        arr.push(p);
        playersByJersey.set(l.jersey_id, arr);
      }
      for (const arr of playersByJersey.values()) {
        arr.sort((a, b) => a.full_name.localeCompare(b.full_name));
      }
    }
  }
  const competitionMap = new Map((competitions ?? []).map((c) => [c.id, c.name]));

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
            competitionMap={competitionMap}
            galleryMap={galleryMap}
            playersByJersey={playersByJersey}
            favorites={new Set(jIds)}
          />
        )}
      </section>
    </div>
  );
}
