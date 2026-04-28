'use client';

import { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

type Option = { id: string; full_name: string };

export function PlayerCombobox({
  name,
  options,
  defaultSelected = [],
  placeholder = 'Type to search players…',
}: {
  name: string;
  options: Option[];
  defaultSelected?: string[];
  placeholder?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = options.filter((o) => !selected.includes(o.id));
    if (!q) return pool.slice(0, 50);
    return pool.filter((o) => o.full_name.toLowerCase().includes(q)).slice(0, 50);
  }, [options, selected, query]);

  function add(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur : [...cur, id]));
    setQuery('');
    inputRef.current?.focus();
  }
  function remove(id: string) {
    setSelected((cur) => cur.filter((x) => x !== id));
  }

  return (
    <div className="relative">
      {/* Hidden inputs the form will pick up */}
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <div className="border border-bayern-border bg-black p-2 flex flex-wrap gap-1.5 min-h-[3rem]">
        {selected.map((id) => {
          const opt = byId.get(id);
          if (!opt) return null;
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 bg-bayern-red/20 border border-bayern-red/60 text-white text-xs uppercase tracking-widest px-2 py-1"
            >
              {opt.full_name}
              <button
                type="button"
                onClick={() => remove(id)}
                className="opacity-70 hover:opacity-100"
                aria-label={`Remove ${opt.full_name}`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selected.length ? '' : placeholder}
          className="flex-1 min-w-[10rem] bg-transparent outline-none text-sm px-2 py-1"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-bayern-surface border border-bayern-border max-h-64 overflow-auto shadow-xl">
          {filtered.map((o) => (
            <button
              type="button"
              key={o.id}
              onMouseDown={(e) => {
                e.preventDefault();
                add(o.id);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-bayern-red hover:text-white transition-colors"
            >
              {o.full_name}
            </button>
          ))}
        </div>
      )}

      {open && query && filtered.length === 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-bayern-surface border border-bayern-border px-3 py-2 text-sm text-bayern-muted">
          No matches
        </div>
      )}
    </div>
  );
}
