'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import type { Season } from '@/lib/types';

export function FilterBar({
  seasons,
  initialSeason,
  initialQuery,
}: {
  seasons: Season[];
  initialSeason: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [season, setSeason] = useState(initialSeason);
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  function apply(nextSeason = season, nextQuery = query) {
    const sp = new URLSearchParams(params.toString());
    if (nextSeason) sp.set('season', nextSeason);
    else sp.delete('season');
    if (nextQuery) sp.set('q', nextQuery);
    else sp.delete('q');
    startTransition(() => router.replace(`/jerseys?${sp.toString()}`));
  }

  function clear() {
    setSeason('');
    setQuery('');
    startTransition(() => router.replace('/jerseys'));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="flex flex-col md:flex-row gap-3 md:items-stretch"
    >
      <div className="md:w-56">
        <select
          value={season}
          onChange={(e) => {
            setSeason(e.target.value);
            apply(e.target.value, query);
          }}
          className="input appearance-none cursor-pointer"
          aria-label="Season"
        >
          <option value="">All seasons</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-bayern-muted pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a player — Müller, Lahm, Kahn…"
          className="input pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              apply(season, '');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-bayern-muted hover:text-white"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary uppercase tracking-widest text-sm whitespace-nowrap">
          Search
        </button>
        {(season || query) && (
          <button
            type="button"
            onClick={clear}
            className="btn-ghost uppercase tracking-widest text-sm whitespace-nowrap"
          >
            Reset
          </button>
        )}
      </div>
    </form>
  );
}
