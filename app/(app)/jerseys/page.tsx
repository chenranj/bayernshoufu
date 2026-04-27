import { createClient } from '@/lib/supabase/server';
import { FilterBar } from '@/components/filter-bar';
import { JerseyGrid } from '@/components/jersey-grid';
import { PlayerSpotlight } from '@/components/player-spotlight';

export const dynamic = 'force-dynamic';

type SearchParams = { season?: string; q?: string };

export default async function JerseysPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();

  const [{ data: seasons }, { data: user }] = await Promise.all([
    supabase.from('seasons').select('*').order('year_start', { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const userId = user.user?.id ?? null;
  const seasonSlug = searchParams.season?.trim();
  const query = searchParams.q?.trim();

  // 1) Resolve season filter to id
  let seasonId: string | null = null;
  if (seasonSlug) {
    const found = seasons?.find((s) => s.slug === seasonSlug);
    seasonId = found?.id ?? null;
  }

  // 2) If query present, find matching players
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

  // 3) Build jersey query
  let jerseyIds: string[] | null = null;
  if (matchedPlayers.length > 0) {
    const { data: links } = await supabase
      .from('jersey_players')
      .select('jersey_id')
      .in(
        'player_id',
        matchedPlayers.map((p) => p.id)
      );
    jerseyIds = Array.from(new Set((links ?? []).map((l) => l.jersey_id)));
  } else if (query && matchedPlayers.length === 0) {
    jerseyIds = [];
  }

  let q = supabase
    .from('jerseys')
    .select('id, name, season_id, kit_type, image_path, description, release_year, sort_order')
    .order('sort_order', { ascending: true })
    .order('release_year', { ascending: false });

  if (seasonId) q = q.eq('season_id', seasonId);
  if (jerseyIds !== null) q = q.in('id', jerseyIds.length ? jerseyIds : ['00000000-0000-0000-0000-000000000000']);

  const { data: jerseys } = await q;

  // 4) Favorites for current user
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
          Filter by season or search for a legend.
        </p>
      </div>

      <FilterBar seasons={seasons ?? []} initialSeason={seasonSlug ?? ''} initialQuery={query ?? ''} />

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
            favorites={favJerseySet}
          />
        )}
      </div>
    </div>
  );
}
