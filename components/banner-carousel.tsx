'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function BannerCarousel({
  bannerIds,
  captions,
  intervalMs,
  fadeMs,
}: {
  bannerIds: string[];
  captions: string[];
  intervalMs: number;
  fadeMs: number;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (bannerIds.length <= 1) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % bannerIds.length);
    }, Math.max(2000, intervalMs));
    return () => window.clearInterval(id);
  }, [bannerIds.length, intervalMs]);

  if (bannerIds.length === 0) {
    // Fallback: animated gradient when no banner is configured
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-bayern-red via-black to-bayern-blue" />
    );
  }

  return (
    <>
      {bannerIds.map((id, i) => (
        <div
          key={id}
          className={cn(
            'absolute inset-0 transition-opacity ease-in-out',
            i === active ? 'opacity-100' : 'opacity-0'
          )}
          style={{ transitionDuration: `${fadeMs}ms` }}
        >
          <img
            src={`/api/image/banners/${id}`}
            alt={captions[i] || ''}
            className="w-full h-full object-cover select-none"
            draggable={false}
            data-protected
          />
        </div>
      ))}
      {captions[active] && (
        <div
          className="absolute bottom-6 left-6 right-6 lg:bottom-10 lg:left-auto lg:right-10 lg:max-w-md lg:text-right transition-opacity"
          style={{ transitionDuration: `${fadeMs}ms` }}
        >
          <p className="font-display text-2xl md:text-3xl lg:text-4xl uppercase tracking-tight leading-[1.05] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] break-words">
            {captions[active]}
          </p>
        </div>
      )}
    </>
  );
}
