'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import type { Competition, Season } from '@/lib/types';

type PlayerOption = { id: string; full_name: string; slug: string };

const KIT_OPTIONS = [
  'Wisen',
  'home',
  'away',
  'third',
  'goalkeeper',
  'special',
  'training',
  'other',
] as const;

export function FilterBar({
  seasons,
  competitions = [],
  players = [],
  initialSeason,
  initialCompetition = '',
  initialKit = '',
  initialQuery,
}: {
  seasons: Season[];
  competitions?: Competition[];
  players?: PlayerOption[];
  initialSeason: string;
  initialCompetition?: string;
  initialKit?: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [season, setSeason] = useState(initialSeason);
  const [competition, setCompetition] = useState(initialCompetition);
  const [kit, setKit] = useState(initialKit);
  const [query, setQuery] = useState(initialQuery);

  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return players.slice(0, 50);

    return players
      .filter((p) => p.full_name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [players, query]);

  function apply(
    nextSeason = season,
    nextComp = competition,
    nextKit = kit,
    nextQuery = query
  ) {
    const sp = new URLSearchParams(params.toString());

    if (nextSeason) sp.set('season', nextSeason);
    else sp.delete('season');

    if (nextComp) sp.set('competition', nextComp);
    else sp.delete('competition');

    if (nextKit) sp.set('kit', nextKit);
    else sp.delete('kit');

    if (nextQuery) sp.set('q', nextQuery);
    else sp.delete('q');

    startTransition(() => {
      router.replace(`/jerseys?${sp.toString()}`);
    });
  }

  function pickPlayer(name: string) {
    setQuery(name);
    setOpen(false);
    apply(season, competition, kit, name);
  }

  function clear() {
    setSeason('');
    setCompetition('');
    setKit('');
    setQuery('');

    startTransition(() => {
      router.replace('/jerseys');
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="flex flex-col md:flex-row gap-3 md:items-stretch"
    >
      {/* Season */}
      <div className="md:w-44">
        <select
          value={season}
          onChange={(e) => {
            setSeason(e.target.value);
            apply(e.target.value, competition, kit, query);
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

      {/* Competition */}
      {competitions.length > 0 && (
        <div className="md:w-44">
          <select
            value={competition}
            onChange={(e) => {
              setCompetition(e.target.value);
              apply(season, e.target.value, kit, query);
            }}
            className="input appearance-none cursor-pointer"
            aria-label="Competition"
          >
            <option value="">All competitions</option>

            {competitions.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Kit */}
      <div className="md:w-44">
        <select
          value={kit}
          onChange={(e) => {
            setKit(e.target.value);
            apply(season, competition, e.target.value, query);
          }}
          className="input appearance-none cursor-pointer"
          aria-label="Kit"
        >
          <option value="">All kits</option>

          {KIT_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {/* Player */}
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-bayern-muted pointer-events-none"
        />

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Pick a player — Müller, Lahm, Kahn…"
          className="input pl-10 pr-16"
        />

        <ChevronDown
          size={14}
          className="absolute right-9 top-1/2 -translate-y-1/2 text-bayern-muted pointer-events-none"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              apply(season, competition, kit, '');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-bayern-muted hover:text-white"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}

        {open && filtered.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-bayern-surface border border-bayern-border max-h-72 overflow-auto shadow-xl">
            {filtered.map((p) => (
              <button
                type="button"
                key={p.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickPlayer(p.full_name);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-bayern-red hover:text-white transition-colors"
              >
                {p.full_name}
              </button>
            ))}
          </div>
        )}

        {open && query && filtered.length === 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-bayern-surface border border-bayern-border px-3 py-2 text-sm text-bayern-muted">
            No matches
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="flex gap-2">
        {(season || competition || kit || query) && (
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
