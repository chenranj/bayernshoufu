'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Images,
} from 'lucide-react';
import type { Jersey, Season } from '@/lib/types';
import { cn } from '@/lib/utils';
import { JerseyModal } from './jersey-modal';

const KIT_LABELS: Record<Jersey['kit_type'], string> = {
  Wisen: 'Wisen',
  home: 'Home',
  away: 'Away',
  third: 'Third',
  goalkeeper: 'GK',
  special: 'Special',
  training: 'Training',
  other: 'Kit',
};

type LinkedPlayer = {
  id: string;
  full_name: string;
  slug: string;
};

type UserRole = 'user' | 'viewer' | 'admin';

export function JerseyCard({
  jersey,
  season,
  competitionName,
  galleryImageIds,
  players,
  isFavorite,
  isLoggedIn,
  userRole,
}: {
  jersey: Jersey;
  season: Season | null;
  competitionName: string | null;
  galleryImageIds: string[];
  players: LinkedPlayer[];
  isFavorite: boolean;
  isLoggedIn: boolean;
  userRole: UserRole | null;
}) {
  const [fav, setFav] = useState(isFavorite);
  const [, startTransition] = useTransition();
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);

  const router = useRouter();

  const slides: { src: string; key: string }[] = [
    {
      src: `/api/image/jerseys/${jersey.id}`,
      key: `cover-${jersey.id}`,
    },
    ...galleryImageIds.map((id) => ({
      src: `/api/image/jersey-images/${id}`,
      key: id,
    })),
  ];

  const total = slides.length;

  function toggleFav() {
    if (!isLoggedIn) {
      setLoginPrompt(true);
      return;
    }

    const next = !fav;
    setFav(next);

    startTransition(async () => {
      await fetch('/api/favorites/jersey', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jersey_id: jersey.id,
          favorite: next,
        }),
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
            aria-label={
              fav
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
            className={cn(
              'absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black/70 backdrop-blur transition-colors',
              fav
                ? 'text-bayern-red'
                : 'text-white hover:text-bayern-red'
            )}
          >
            <Heart
              size={16}
              fill={fav ? 'currentColor' : 'none'}
            />
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

          <h3 className="font-semibold text-sm leading-snug line-clamp-2">
            {jersey.name}
          </h3>

          {jersey.description && (
            <p className="mt-1.5 text-xs text-bayern-muted leading-relaxed line-clamp-2">
              {jersey.description}
            </p>
          )}

          {/* SALE TYPE / PRICE / BUYER'S PREMIUM */}
          <div className="mt-3 pt-3 border-t border-bayern-border">
            {jersey.sale_type === 'offer_only' ? (
              <>
                <p className="text-base font-semibold tracking-tight uppercase">
                  By Offer Only
                </p>

                <p className="mt-1 text-[10px] uppercase tracking-widest text-bayern-muted">
                  + {jersey.buyer_premium ?? 10}% Buyer&apos;s Premium
                </p>
              </>
            ) : (
              <>
                {jersey.price != null && (
                  <p className="text-base font-semibold tracking-tight">
                    $
                    {Number(jersey.price).toLocaleString('en-CA', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}

                <p className="mt-1 text-[10px] uppercase tracking-widest text-bayern-muted">
                  + {jersey.buyer_premium ?? 10}% Buyer&apos;s Premium
                </p>
              </>
            )}
          </div>
        </div>
      </article>

      {loginPrompt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4"
          onClick={() => setLoginPrompt(false)}
        >
          <div
            className="w-full max-w-sm border border-bayern-border bg-black p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart
              size={24}
              className="mx-auto mb-4 text-bayern-red"
            />

            <h3 className="font-display text-2xl uppercase">
              Favorites
            </h3>

            <p className="mt-2 text-sm text-bayern-muted">
              Please log in to add jerseys to your favorites.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setLoginPrompt(false)}
                className="flex-1 border border-bayern-border px-4 py-3 text-xs font-semibold uppercase tracking-widest hover:border-white transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="flex-1 bg-bayern-red px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-red-700 transition-colors"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <JerseyModal
          jersey={jersey}
          season={season}
          competitionName={competitionName}
          galleryImageIds={galleryImageIds}
          players={players}
          isFavorite={fav}
          userRole={userRole}
          onToggleFavorite={toggleFav}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
