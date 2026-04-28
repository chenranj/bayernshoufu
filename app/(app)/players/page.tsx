import Link from 'next/link';
import { Star, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PlayersFilter } from '@/components/players-filter';

export const dynamic = 'force-dynamic';

type SearchParams = { q?: string; legend?: string };

export default async function PlayersPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const query = searchParams.q?.trim();
  const legendsOnly = searchParams.legend === '1';

  let q = supabase
    .from('players')
    .select('id, full_name, slug, photo_path, is_legend, position, shirt_number')
    .order('is_legend', { ascending: false })
    .order('full_name', { ascending: true });
  if (query) q = q.ilike('full_name', `%${query}%`);
  if (legendsOnly) q = q.eq('is_legend', true);
  const { data: players } = await q;

  const { data: favs } = userId
    ? await supabase.from('favorite_players').select('player_id').eq('user_id', userId)
    : { data: [] as { player_id: string }[] };
  const favSet = new Set((favs ?? []).map((f) => f.player_id));

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tightest leading-none">
          The <span className="text-bayern-red">Players</span>
        </h1>
        <p className="text-bayern-muted mt-2 text-sm">
          Tap a player to see every jersey they've worn in the archive.
        </p>
      </div>

      <PlayersFilter initialQuery={query ?? ''} initialLegend={legendsOnly} />

      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {(players ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/players/${p.slug}`}
            className="group bg-bayern-surface border border-bayern-border hover:border-bayern-red transition-colors"
          >
            <div className="relative aspect-square overflow-hidden bg-black">
              {p.photo_path ? (
                <img
                  src={`/api/image/players/${p.id}`}
                  alt={p.full_name}
                  loading="lazy"
                  draggable={false}
                  data-protected
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 select-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-bayern-muted text-xs">
                  No photo
                </div>
              )}
              {p.is_legend && (
                <div className="absolute top-2 left-2 bg-bayern-red text-white p-1.5">
                  <Star size={12} fill="currentColor" />
                </div>
              )}
              {favSet.has(p.id) && (
                <div className="absolute top-2 right-2 bg-black/70 text-bayern-red p-1.5 backdrop-blur">
                  <Heart size={12} fill="currentColor" />
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm leading-snug line-clamp-1">{p.full_name}</h3>
              <p className="text-[10px] uppercase tracking-widest text-bayern-muted mt-1">
                {p.position ?? '—'}
                {p.shirt_number != null && <> · #{p.shirt_number}</>}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {(players ?? []).length === 0 && (
        <div className="border border-dashed border-bayern-border py-20 text-center text-bayern-muted">
          No players match.
        </div>
      )}
    </div>
  );
}
