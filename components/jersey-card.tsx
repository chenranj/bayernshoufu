'use client';

import { useState, useTransition } from 'react';
import { Heart, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import type { Jersey, Season } from '@/lib/types';
import { cn } from '@/lib/utils';
import { JerseyModal } from './jersey-modal';

const KIT_LABELS: Record<Jersey['kit_type'], string> = {
  home: 'Home',
  away: 'Away',
  third: 'Third',
  goalkeeper: 'GK',
  special: 'Special',
  training: 'Training',
  other: 'Kit',
};

type LinkedPlayer = { id: string; full_name: string; slug: string };

export function JerseyCard({
  jersey,
  season,
  competitionName,
  galleryImageIds,
  players,
  isFavorite,
}: {
  jersey: Jersey;
  season: Season | null;
  competitionName: string | null;
  galleryImageIds: string[];
  players: LinkedPlayer[];
  isFavorite: boolean;
}) {
  const [fav, setFav] = useState(isFavorite);
  const [, startTransition] = useTransition();
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);

  const slides: { src: string; key: string }[] = [
    { src: `/api/image/jerseys/${jersey.id}`, key: `cover-${jersey.id}` },
    ...galleryImageIds.map((id) => ({
      src: `/api/image/jersey-images/${id}`,
      key: id,
    })),
  ];
  const total = slides.length;

  function toggleFav() {
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

  function nav(delta: number) {
    setIdx((i) => (i + delta + total) % total);
  }

  return (
    <>
      <article
        onClick={() => setOpen(true)}
        className="group relative bg-bayern-surface border border-bayern-border hover:border-bayern-red transition-colors cursor-pointer"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-black">
          {slides.map((s, i) => (
            <img
              key={s.key}
              src={s.src}
              alt={jersey.name}
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
              data-protected
              className={cn(
                'absolute inset-0 w-full h-full object-cover transition-opacity duration-300 select-none',
                i === idx ? 'opacity-100' : 'opacity-0'
              )}
            />
          ))}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nav(-1);
                }}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/70 backdrop-blur flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nav(1);
                }}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/70 backdrop-blur flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight size={14} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-colors',
                      i === idx ? 'bg-white' : 'bg-white/40'
                    )}
                  />
                ))}
              </div>
              <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 bg-black/70 backdrop-blur text-white text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5">
                <Images size={10} /> {total}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFav();
            }}
            aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
            className={cn(
              'absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black/70 backdrop-blur transition-colors',
              fav ? 'text-bayern-red' : 'text-white hover:text-bayern-red'
            )}
          >
            <Heart size={16} fill={fav ? 'currentColor' : 'none'} />
          </button>
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <span className="px-2 py-1 bg-bayern-red text-white text-[10px] font-semibold uppercase tracking-widest">
              {KIT_LABELS[jersey.kit_type]}
            </span>
            {competitionName && (
              <span className="px-2 py-1 bg-black/80 text-white text-[10px] font-semibold uppercase tracking-widest border border-white/20">
                {competitionName}
              </span>
            )}
          </div>
        </div>
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
            {season?.label ?? '—'}
          </p>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2">{jersey.name}</h3>
          {jersey.description && (
            <p className="mt-1.5 text-xs text-bayern-muted leading-relaxed line-clamp-2">
              {jersey.description}
            </p>
          )}
        </div>
      </article>

      {open && (
        <JerseyModal
          jersey={jersey}
          season={season}
          competitionName={competitionName}
          galleryImageIds={galleryImageIds}
          players={players}
          isFavorite={fav}
          onToggleFavorite={toggleFav}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
