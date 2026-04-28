'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';

export function PlayersFilter({
  initialQuery,
  initialLegend,
}: {
  initialQuery: string;
  initialLegend: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [legend, setLegend] = useState(initialLegend);
  const [, startTransition] = useTransition();

  function apply(nextQuery = query, nextLegend = legend) {
    const sp = new URLSearchParams(params.toString());
    if (nextQuery) sp.set('q', nextQuery);
    else sp.delete('q');
    if (nextLegend) sp.set('legend', '1');
    else sp.delete('legend');
    startTransition(() => router.replace(`/players?${sp.toString()}`));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="flex flex-col md:flex-row gap-3 md:items-stretch"
    >
      <div className="md:w-48">
        <select
          value={legend ? '1' : ''}
          onChange={(e) => {
            const v = e.target.value === '1';
            setLegend(v);
            apply(query, v);
          }}
          className="input appearance-none cursor-pointer"
          aria-label="Filter"
        >
          <option value="">All players</option>
          <option value="1">Legends only</option>
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
          placeholder="Type a name…"
          className="input pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              apply('', legend);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-bayern-muted hover:text-white"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <button type="submit" className="btn-primary uppercase tracking-widest text-sm whitespace-nowrap">
        Search
      </button>
    </form>
  );
}
