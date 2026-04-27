'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import type { Jersey, Season } from '@/lib/types';
import { cn } from '@/lib/utils';

const KIT_LABELS: Record<Jersey['kit_type'], string> = {
  home: 'Home',
  away: 'Away',
  third: 'Third',
  goalkeeper: 'GK',
  special: 'Special',
  training: 'Training',
  other: 'Kit',
};

export function JerseyCard({
  jersey,
  season,
  isFavorite,
}: {
  jersey: Jersey;
  season: Season | null;
  isFavorite: boolean;
}) {
  const [fav, setFav] = useState(isFavorite);
  const [, startTransition] = useTransition();

  function toggleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !fav;
    setFav(next);
    startTransition(async () => {
      await fetch('/api/favorites/jersey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jersey_id: jersey.id, favorite: next }),
      });
    });
  }

  return (
    <article className="group relative bg-bayern-surface border border-bayern-border hover:border-bayern-red transition-colors">
      <div className="relative aspect-[3/4] overflow-hidden bg-black">
        <img
          src={`/api/image/jerseys/${jersey.id}`}
          alt={jersey.name}
          loading="lazy"
          draggable={false}
          data-protected
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 select-none"
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <button
          type="button"
          onClick={toggleFav}
          aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
          className={cn(
            'absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black/70 backdrop-blur transition-colors',
            fav ? 'text-bayern-red' : 'text-white hover:text-bayern-red'
          )}
        >
          <Heart size={16} fill={fav ? 'currentColor' : 'none'} />
        </button>
        <div className="absolute top-3 left-3 px-2 py-1 bg-bayern-red text-white text-[10px] font-semibold uppercase tracking-widest">
          {KIT_LABELS[jersey.kit_type]}
        </div>
      </div>
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
          {season?.label ?? '—'}
        </p>
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{jersey.name}</h3>
      </div>
    </article>
  );
}
