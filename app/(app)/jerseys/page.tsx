import { createClient } from '@/lib/supabase/server';
import { FilterBar } from '@/components/filter-bar';
import { JerseyGrid } from '@/components/jersey-grid';
import { PlayerSpotlight } from '@/components/player-spotlight';

export const dynamic = 'force-dynamic';

type SearchParams = { season?: string; competition?: string; q?: string };

export default async function JerseysPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();

  const [{ data: seasons }, { data: competitions }, { data: user }] = await Promise.all([
    supabase.from('seasons').select('*').order('year_start', { ascending: false }),
    supabase.from('competitions').select('*').order('sort_order').order('name'),
    supabase.auth.getUser(),
  ]);

  const userId = user.user?.id ?? null;
  const seasonSlug = searchParams.season?.trim();
  const compSlug = searchParams.competition?.trim();
  const query = searchParams.q?.trim();

  // Resolve season + competition slugs
  let seasonId: string | null = null;
  if (seasonSlug) seasonId = (seasons ?? []).find((s) => s.slug === seasonSlug)?.id ?? null;

  let competitionId: string | null = null;
  if (compSlug) competitionId = (competitions ?? []).find((c) => c.slug === compSlug)?.id ?? null;

  // Player search
  let matchedPlayers:
    | { id: string; full_name: string; slug: string; photo_path: string | null; is_legend: boolean }[]
    = [];
  if (query) {
    const { data } = await supabase
      .from('players')
      .select('id, full_name, slug, photo_path, is_legend')
      .ilike('full_name', `%${query}%`)
      .order('is_legend', { ascending: false })
      .order('full_name', { ascending: true })
      .limit(20);
    matchedPlayers = data ?? [];
  }

  let jerseyIds: string[] | null = null;
  if (matchedPlayers.length > 0) {
    const { data: links } = await supabase
      .from('jersey_players')
      .select('jersey_id')
      .in('player_id', matchedPlayers.map((p) => p.id));
    jerseyIds = Array.from(new Set((links ?? []).map((l) => l.jersey_id)));
  } else if (query && matchedPlayers.length === 0) {
    jerseyIds = [];
  }

  let q = supabase
    .from('jerseys')
    .select('id, name, season_id, competition_id, kit_type, image_path, description, release_year, sort_order')
    .order('sort_order', { ascending: true })
    .order('release_year', { ascending: false });

  if (seasonId) q = q.eq('season_id', seasonId);
  if (competitionId) q = q.eq('competition_id', competitionId);
  if (jerseyIds !== null) q = q.in('id', jerseyIds.length ? jerseyIds : ['00000000-0000-0000-0000-000000000000']);

  const { data: jerseys } = await q;

  // Galleries (skip cover row — cover is served via /api/image/jerseys/{id}). The
  // jersey_images table also has a row whose image_path equals jerseys.image_path
  // (backfilled), so we need to filter that one out so it isn't shown twice.
  const ids = (jerseys ?? []).map((j) => j.id);
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
    const coverPathByJersey = new Map((jerseys ?? []).map((j) => [j.id, j.image_path]));
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

  // All players, for the searchable filter dropdown
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, full_name, slug')
    .order('is_legend', { ascending: false })
    .order('full_name');

  // Favorites
  const [{ data: favJerseys }, { data: favPlayers }] = await Promise.all([
    userId
      ? supabase.from('favorite_jerseys').select('jersey_id').eq('user_id', userId)
      : Promise.resolve({ data: [] as { jersey_id: string }[] }),
    userId
      ? supabase.from('favorite_players').select('player_id').eq('user_id', userId)
      : Promise.resolve({ data: [] as { player_id: string }[] }),
  ]);
  const favJerseySet = new Set((favJerseys ?? []).map((f) => f.jersey_id));
  const favPlayerSet = new Set((favPlayers ?? []).map((f) => f.player_id));

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tightest leading-none">
          The <span className="text-bayern-red">Archive</span>
        </h1>
        <p className="text-bayern-muted mt-2 text-sm">
          Filter by season, competition, or search for a legend.
        </p>
      </div>

      <FilterBar
        seasons={seasons ?? []}
        competitions={competitions ?? []}
        players={allPlayers ?? []}
        initialSeason={seasonSlug ?? ''}
        initialCompetition={compSlug ?? ''}
        initialQuery={query ?? ''}
      />

      {query && matchedPlayers.length > 0 && (
        <PlayerSpotlight players={matchedPlayers} favorites={favPlayerSet} />
      )}

      <div className="mt-8">
        {(jerseys ?? []).length === 0 ? (
          <div className="border border-dashed border-bayern-border py-20 text-center text-bayern-muted">
            No jerseys match these filters.
          </div>
        ) : (
          <JerseyGrid
            jerseys={jerseys ?? []}
            seasons={seasons ?? []}
            competitionMap={competitionMap}
            galleryMap={galleryMap}
            playersByJersey={playersByJersey}
            favorites={favJerseySet}
          />
        )}
      </div>
    </div>
  );
}
