'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Heart,
} from 'lucide-react';
import type { Jersey, Season } from '@/lib/types';
import { cn } from '@/lib/utils';

const KIT_LABELS: Record<Jersey['kit_type'], string> = {
  Wisen: 'Wisen',
  home: 'Home',
  away: 'Away',
  third: 'Third',
  goalkeeper: 'Goalkeeper',
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

export function JerseyModal({
  jersey,
  season,
  competitionName,
  galleryImageIds,
  players,
  isFavorite,
  userRole,
  onToggleFavorite,
  onClose,
}: {
  jersey: Jersey;
  season: Season | null;
  competitionName: string | null;
  galleryImageIds: string[];
  players: LinkedPlayer[];
  isFavorite: boolean;
  userRole: UserRole | null;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);

  // Offer modal
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (offerOpen) {
          setOfferOpen(false);
        } else {
          onClose();
        }
      } else if (!offerOpen && e.key === 'ArrowLeft') {
        setIdx((i) => (i - 1 + total) % total);
      } else if (!offerOpen && e.key === 'ArrowRight') {
        setIdx((i) => (i + 1) % total);
      }
    }

    window.addEventListener('keydown', onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, total, offerOpen]);

  function openOfferModal() {
    setOfferError('');
    setOfferSuccess(false);
    setLoginRequired(false);
    setOfferOpen(true);
  }

  function closeOfferModal() {
    if (offerSubmitting) return;

    setOfferOpen(false);
    setOfferError('');
    setLoginRequired(false);
  }

  async function submitOffer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setOfferError('');
    setOfferSuccess(false);
    setLoginRequired(false);

    const amount = Number(offerAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setOfferError('Please enter a valid offer amount.');
      return;
    }

    setOfferSubmitting(true);

    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jersey_id: jersey.id,
          amount,
          message: offerMessage.trim(),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setLoginRequired(true);
        setOfferError(
          data.error || 'Please log in to make an offer.'
        );
        return;
      }

      if (!response.ok) {
        setOfferError(
          data.error || 'Unable to submit your offer.'
        );
        return;
      }

      setOfferSuccess(true);
      setOfferAmount('');
      setOfferMessage('');
    } catch (error) {
      console.error('Submit offer error:', error);

      setOfferError(
        'Something went wrong. Please try again.'
      );
    } finally {
      setOfferSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="relative bg-bayern-surface border border-bayern-border w-full max-w-7xl max-h-[94dvh] overflow-hidden grid grid-cols-1 md:grid-cols-5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 z-20 w-9 h-9 bg-black/80 hover:bg-bayern-red text-white flex items-center justify-center"
          >
            <X size={18} />
          </button>

          <div className="md:col-span-4 relative bg-black min-h-[68dvh] md:min-h-[88dvh] flex items-center justify-center overflow-hidden">
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
                  onClick={() =>
                    setIdx(
                      (i) => (i - 1 + total) % total
                    )
                  }
                  aria-label="Previous"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 hover:bg-bayern-red backdrop-blur text-white flex items-center justify-center"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setIdx((i) => (i + 1) % total)
                  }
                  aria-label="Next"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 hover:bg-bayern-red backdrop-blur text-white flex items-center justify-center"
                >
                  <ChevronRight size={18} />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to image ${i + 1}`}
                      onClick={() => setIdx(i)}
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        i === idx
                          ? 'bg-white'
                          : 'bg-white/40 hover:bg-white/70'
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

          <div className="md:col-span-1 p-5 md:p-6 flex flex-col gap-5 overflow-y-auto max-h-[94dvh]">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
                {season?.label ?? '—'}
                {jersey.release_year && (
                  <> · {jersey.release_year}</>
                )}
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
                aria-label={
                  isFavorite
                    ? 'Remove from favorites'
                    : 'Add to favorites'
                }
              >
                <Heart
                  size={11}
                  fill={
                    isFavorite ? 'currentColor' : 'none'
                  }
                />
                {isFavorite ? 'Saved' : 'Save'}
              </button>
            </div>

            {jersey.sort_order != null && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                  Sort
                </p>

                <p className="text-sm font-semibold">
                  {jersey.sort_order}
                </p>
              </div>
            )}

            {jersey.description && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
                  Description
                </p>

                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {jersey.description}
                </p>
              </div>
            )}

            {/* SALE TYPE / PRICE / BUYER'S PREMIUM */}
            <div className="border-t border-bayern-border pt-5">
              {jersey.sale_type === 'offer_only' ? (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                      Sale Type
                    </p>

                    <p className="text-xl font-semibold uppercase">
                      By Offer Only
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                      Buyer&apos;s Premium
                    </p>

                    <p className="text-sm font-semibold">
                      {jersey.buyer_premium ?? 10}%
                    </p>
                  </div>

                  {userRole !== 'admin' && (
                    <button
                      type="button"
                      onClick={openOfferModal}
                      className="mt-5 w-full bg-bayern-red hover:bg-red-700 text-white px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors"
                    >
                      Make an Offer
                    </button>
                  )}
                </>
              ) : (
                <>
                  {jersey.price != null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                        Price
                      </p>

                      <p className="text-xl font-semibold">
                        $
                        {Number(
                          jersey.price
                        ).toLocaleString('en-CA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                      Buyer&apos;s Premium
                    </p>

                    <p className="text-sm font-semibold">
                      {jersey.buyer_premium ?? 10}%
                    </p>
                  </div>
                </>
              )}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
                Players ({players.length})
              </p>

              {players.length === 0 ? (
                <p className="text-sm text-bayern-muted">
                  No players linked.
                </p>
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

      {/* MAKE AN OFFER MODAL */}
      {offerOpen && userRole !== 'admin' && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={closeOfferModal}
        >
          <div
            className="relative w-full max-w-md bg-bayern-surface border border-bayern-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeOfferModal}
              disabled={offerSubmitting}
              aria-label="Close offer form"
              className="absolute top-3 right-3 w-9 h-9 bg-black hover:bg-bayern-red text-white flex items-center justify-center disabled:opacity-50"
            >
              <X size={18} />
            </button>

            {offerSuccess ? (
              <div className="py-6 text-center">
                <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
                  Offer Submitted
                </p>

                <h3 className="font-display text-3xl uppercase">
                  Thank You
                </h3>

                <p className="mt-3 text-sm text-bayern-muted leading-relaxed">
                  Your offer has been submitted successfully.
                  We will review it and respond to you.
                </p>

                <button
                  type="button"
                  onClick={closeOfferModal}
                  className="mt-6 w-full bg-bayern-red hover:bg-red-700 text-white px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
                  By Offer Only
                </p>

                <h3 className="font-display text-3xl uppercase leading-none pr-10">
                  Make an Offer
                </h3>

                <p className="mt-3 text-sm text-bayern-muted leading-relaxed">
                  {jersey.name}
                </p>

                <form
                  onSubmit={submitOffer}
                  className="mt-6"
                >
                  <div>
                    <label
                      htmlFor="offer-amount"
                      className="block text-[10px] uppercase tracking-widest text-bayern-muted mb-2"
                    >
                      Your Offer
                    </label>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold">
                        $
                      </span>

                      <input
                        id="offer-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        value={offerAmount}
                        onChange={(e) =>
                          setOfferAmount(e.target.value)
                        }
                        placeholder="0.00"
                        required
                        disabled={offerSubmitting}
                        className="w-full bg-black border border-bayern-border px-8 py-3 text-sm outline-none focus:border-bayern-red disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <label
                      htmlFor="offer-message"
                      className="block text-[10px] uppercase tracking-widest text-bayern-muted mb-2"
                    >
                      Message (Optional)
                    </label>

                    <textarea
                      id="offer-message"
                      value={offerMessage}
                      onChange={(e) =>
                        setOfferMessage(e.target.value)
                      }
                      rows={4}
                      maxLength={1000}
                      placeholder="Add a message about your offer..."
                      disabled={offerSubmitting}
                      className="w-full resize-none bg-black border border-bayern-border px-3 py-3 text-sm outline-none focus:border-bayern-red disabled:opacity-50"
                    />
                  </div>

                  <div className="mt-4 border border-bayern-border bg-black/40 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted">
                      Buyer&apos;s Premium
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      + {jersey.buyer_premium ?? 10}%
                    </p>
                  </div>

                  {offerError && (
                    <div className="mt-4 border border-bayern-red/60 bg-bayern-red/10 p-3">
                      <p className="text-xs text-red-400">
                        {offerError}
                      </p>
                    </div>
                  )}

                  {loginRequired ? (
                    <Link
                      href="/login"
                      className="mt-5 flex w-full items-center justify-center bg-bayern-red hover:bg-red-700 text-white px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors"
                    >
                      Login to Make an Offer
                    </Link>
                  ) : (
                    <button
                      type="submit"
                      disabled={offerSubmitting}
                      className="mt-5 w-full bg-bayern-red hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors"
                    >
                      {offerSubmitting
                        ? 'Submitting...'
                        : 'Submit Offer'}
                    </button>
                  )}

                  <p className="mt-3 text-[10px] leading-relaxed text-bayern-muted">
                    Submitting an offer does not complete a
                    purchase. If an offer is accepted, payment
                    instructions will be provided separately.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
