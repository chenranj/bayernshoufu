'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Heart, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type SpotlightPlayer = {
  id: string;
  full_name: string;
  slug: string;
  photo_path: string | null;
  is_legend: boolean;
};

export function PlayerSpotlight({
  players,
  favorites,
}: {
  players: SpotlightPlayer[];
  favorites: Set<string>;
}) {
  return (
    <div className="mt-6">
      <p className="text-xs uppercase tracking-widest text-bayern-muted mb-3">
        Players matching your search
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
        {players.map((p) => (
          <PlayerChip key={p.id} player={p} initialFav={favorites.has(p.id)} />
        ))}
      </div>
    </div>
  );
}

function PlayerChip({ player, initialFav }: { player: SpotlightPlayer; initialFav: boolean }) {
  const [fav, setFav] = useState(initialFav);
  const [, startTransition] = useTransition();
  function toggle() {
    const next = !fav;
    setFav(next);
    startTransition(async () => {
      await fetch('/api/favorites/player', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ player_id: player.id, favorite: next }),
      });
    });
  }
  return (
    <div className="shrink-0 w-32 group">
      <Link href={`/players/${player.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden border border-bayern-border bg-bayern-surface group-hover:border-bayern-red transition-colors">
          {player.photo_path ? (
            <img
              src={`/api/image/players/${player.id}`}
              alt={player.full_name}
              loading="lazy"
              draggable={false}
              data-protected
              className="w-full h-full object-cover select-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bayern-muted text-xs">
              No photo
            </div>
          )}
          {player.is_legend && (
            <div className="absolute top-1.5 left-1.5 bg-bayern-red text-white p-1">
              <Star size={10} fill="currentColor" />
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle();
            }}
            aria-label="Toggle favorite"
            className={cn(
              'absolute bottom-1.5 right-1.5 w-7 h-7 bg-black/70 flex items-center justify-center backdrop-blur',
              fav ? 'text-bayern-red' : 'text-white'
            )}
          >
            <Heart size={12} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>
        <p className="mt-2 text-xs font-semibold leading-tight line-clamp-2">{player.full_name}</p>
      </Link>
    </div>
  );
}
