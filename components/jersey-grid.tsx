'use client';

import { JerseyCard } from './jersey-card';
import type { Jersey, Season } from '@/lib/types';

export function JerseyGrid({
  jerseys,
  seasons,
  favorites,
}: {
  jerseys: Jersey[];
  seasons: Season[];
  favorites: Set<string>;
}) {
  const seasonMap = new Map(seasons.map((s) => [s.id, s]));
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {jerseys.map((j) => (
        <JerseyCard
          key={j.id}
          jersey={j}
          season={seasonMap.get(j.season_id) ?? null}
          isFavorite={favorites.has(j.id)}
        />
      ))}
    </div>
  );
}
