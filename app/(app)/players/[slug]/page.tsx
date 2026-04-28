import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { JerseyGrid } from '@/components/jersey-grid';

export const dynamic = 'force-dynamic';

export default async function PlayerDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: player } = await supabase
    .from('players')
    .select('id, full_name, slug, photo_path, is_legend, position, shirt_number, bio')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!player) notFound();

  const [
    { data: links },
    { data: { user } },
    { data: seasons },
    { data: competitions },
  ] = await Promise.all([
    supabase.from('jersey_players').select('jersey_id').eq('player_id', player.id),
    supabase.auth.getUser(),
    supabase.from('seasons').select('*').order('year_start', { ascending: false }),
    supabase.from('competitions').select('*').order('sort_order').order('name'),
  ]);

  const jerseyIds = (links ?? []).map((l) => l.jersey_id);
  const { data: jerseys } = jerseyIds.length
    ? await supabase
        .from('jerseys')
        .select('id, name, season_id, competition_id, kit_type, image_path, description, release_year, sort_order')
        .in('id', jerseyIds)
        .order('release_year', { ascending: false })
    : { data: [] as any[] };

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

  const userId = user?.id ?? null;
  const { data: favs } = userId
    ? await supabase.from('favorite_jerseys').select('jersey_id').eq('user_id', userId)
    : { data: [] as { jersey_id: string }[] };
  const favSet = new Set((favs ?? []).map((f) => f.jersey_id));

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <Link
        href="/players"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-bayern-muted hover:text-white mb-6"
      >
        <ArrowLeft size={14} /> All players
      </Link>

      <div className="flex flex-col md:flex-row gap-6 mb-12">
        <div className="md:w-56 shrink-0">
          {player.photo_path ? (
            <img
              src={`/api/image/players/${player.id}`}
              alt={player.full_name}
              draggable={false}
              data-protected
              className="w-full aspect-square object-cover border border-bayern-border bg-black"
            />
          ) : (
            <div className="w-full aspect-square border border-bayern-border bg-bayern-surface flex items-center justify-center text-bayern-muted text-xs">
              No photo
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tightest leading-none flex items-center gap-3">
            {player.full_name}
            {player.is_legend && <Star size={28} className="text-bayern-red" fill="currentColor" />}
          </h1>
          <p className="text-bayern-muted mt-3 text-sm uppercase tracking-widest">
            {player.position ?? '—'}
            {player.shirt_number != null && <> · #{player.shirt_number}</>}
          </p>
          {player.bio && <p className="mt-4 text-sm leading-relaxed">{player.bio}</p>}
        </div>
      </div>

      <h2 className="font-display text-2xl uppercase tracking-tightest mb-4">
        Jerseys ({(jerseys ?? []).length})
      </h2>
      {(jerseys ?? []).length === 0 ? (
        <div className="border border-dashed border-bayern-border py-20 text-center text-bayern-muted">
          No jerseys linked to this player yet.
        </div>
      ) : (
        <JerseyGrid
          jerseys={jerseys ?? []}
          seasons={seasons ?? []}
          competitionMap={competitionMap}
          galleryMap={galleryMap}
          playersByJersey={playersByJersey}
          favorites={favSet}
        />
      )}
    </div>
  );
}
