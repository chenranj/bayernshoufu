'use client';

import { JerseyCard } from './jersey-card';
import type { Jersey, Season } from '@/lib/types';

type LinkedPlayer = { id: string; full_name: string; slug: string };

export function JerseyGrid({
  jerseys,
  seasons,
  competitionMap,
  galleryMap,
  playersByJersey,
  favorites,
}: {
  jerseys: Jersey[];
  seasons: Season[];
  competitionMap: Map<string, string>;
  galleryMap: Map<string, string[]>;
  playersByJersey: Map<string, LinkedPlayer[]>;
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
          competitionName={j.competition_id ? competitionMap.get(j.competition_id) ?? null : null}
          galleryImageIds={galleryMap.get(j.id) ?? []}
          players={playersByJersey.get(j.id) ?? []}
          isFavorite={favorites.has(j.id)}
        />
      ))}
    </div>
  );
}
