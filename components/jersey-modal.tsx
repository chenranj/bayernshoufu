'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight, X, Heart } from 'lucide-react';
import type { Jersey, Season } from '@/lib/types';
import { cn } from '@/lib/utils';

const KIT_LABELS: Record<Jersey['kit_type'], string> = {
  home: 'Home',
  away: 'Away',
  third: 'Third',
  goalkeeper: 'Goalkeeper',
  special: 'Special',
  training: 'Training',
  other: 'Kit',
};

type LinkedPlayer = { id: string; full_name: string; slug: string };

export function JerseyModal({
  jersey,
  season,
  competitionName,
  galleryImageIds,
  players,
  isFavorite,
  onToggleFavorite,
  onClose,
}: {
  jersey: Jersey;
  season: Season | null;
  competitionName: string | null;
  galleryImageIds: string[];
  players: LinkedPlayer[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);

  const slides: { src: string; key: string }[] = [
    { src: `/api/image/jerseys/${jersey.id}`, key: `cover-${jersey.id}` },
    ...galleryImageIds.map((id) => ({
      src: `/api/image/jersey-images/${id}`,
      key: id,
    })),
  ];
  const total = slides.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + total) % total);
      else if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % total);
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, total]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-bayern-surface border border-bayern-border w-full max-w-5xl max-h-[92dvh] overflow-y-auto grid grid-cols-1 md:grid-cols-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 bg-black/80 hover:bg-bayern-red text-white flex items-center justify-center"
        >
          <X size={18} />
        </button>

        <div className="md:col-span-3 relative bg-black aspect-[3/4] md:aspect-auto md:min-h-[60dvh]">
          {slides.map((s, i) => (
            <img
              key={s.key}
              src={s.src}
              alt={jersey.name}
              draggable={false}
              data-protected
              className={cn(
                'absolute inset-0 w-full h-full object-contain transition-opacity duration-300 select-none',
                i === idx ? 'opacity-100' : 'opacity-0'
              )}
            />
          ))}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIdx((i) => (i - 1 + total) % total)}
                aria-label="Previous"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 hover:bg-bayern-red backdrop-blur text-white flex items-center justify-center"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIdx((i) => (i + 1) % total)}
                aria-label="Next"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 hover:bg-bayern-red backdrop-blur text-white flex items-center justify-center"
              >
                <ChevronRight size={18} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to image ${i + 1}`}
                    onClick={() => setIdx(i)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      i === idx ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
                    )}
                  />
                ))}
              </div>
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/80 text-white text-[10px] font-semibold uppercase tracking-widest">
                {idx + 1} / {total}
              </div>
            </>
          )}
        </div>

        <div className="md:col-span-2 p-5 md:p-7 flex flex-col gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
              {season?.label ?? '—'}
              {jersey.release_year && <> · {jersey.release_year}</>}
            </p>
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tightest leading-none">
              {jersey.name}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 bg-bayern-red text-white text-[10px] font-semibold uppercase tracking-widest">
              {KIT_LABELS[jersey.kit_type]}
            </span>
            {competitionName && (
              <span className="px-2.5 py-1 bg-black border border-bayern-border text-white text-[10px] font-semibold uppercase tracking-widest">
                {competitionName}
              </span>
            )}
            <button
              type="button"
              onClick={onToggleFavorite}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-semibold uppercase tracking-widest transition-colors',
                isFavorite
                  ? 'bg-bayern-red border-bayern-red text-white'
                  : 'bg-transparent border-bayern-border text-white hover:border-bayern-red'
              )}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={11} fill={isFavorite ? 'currentColor' : 'none'} />
              {isFavorite ? 'Saved' : 'Save'}
            </button>
          </div>

          {jersey.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
                Description
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{jersey.description}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
              Players ({players.length})
            </p>
            {players.length === 0 ? (
              <p className="text-sm text-bayern-muted">No players linked.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {players.map((p) => (
                  <Link
                    key={p.id}
                    href={`/players/${p.slug}`}
                    onClick={onClose}
                    className="inline-flex items-center px-2.5 py-1 bg-black border border-bayern-border hover:border-bayern-red hover:text-bayern-red text-xs font-semibold transition-colors"
                  >
                    {p.full_name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
