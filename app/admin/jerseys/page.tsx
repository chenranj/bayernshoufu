import Link from 'next/link';
import { CompressedFileInput } from '@/components/compressed-file-input';
import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';
import {
  createJersey,
  updateJersey,
  deleteJersey,
  deleteJerseyImage,
} from '../_actions';
import { PlayerCombobox } from '@/components/player-combobox';

export const dynamic = 'force-dynamic';

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

const BUYER_PREMIUM_OPTIONS = Array.from(
  { length: 20 },
  (_, i) => i + 1
);

const LOAD_SIZE = 20;

type JerseysAdminProps = {
  searchParams?: {
    q?: string;
    visibility?: string;
    limit?: string;
    saved?: string;
    error?: string;
  };
};

export default async function JerseysAdmin({
  searchParams,
}: JerseysAdminProps) {
  await requireAdmin();

  const admin = createAdminClient();

  // ===========================================================================
  // SEARCH
  // ===========================================================================

  const query =
    typeof searchParams?.q === 'string'
      ? searchParams.q.trim()
      : '';

  const visibilityFilter =
  searchParams?.visibility === 'public' ||
  searchParams?.visibility === 'private'
    ? searchParams.visibility
    : '';
  
  // ===========================================================================
  // LOAD MORE
  // Default: 20
  // Every click: +20
  // ===========================================================================

  const requestedLimit = Number(
    searchParams?.limit || LOAD_SIZE
  );

  const loadedCount =
    Number.isInteger(requestedLimit) &&
    requestedLimit > 0
      ? requestedLimit
      : LOAD_SIZE;

  // ===========================================================================
  // JERSEYS
  // Only load the number of jerseys currently requested.
  // ===========================================================================

  let jerseyQuery = admin
    .from('jerseys')
    .select('*', { count: 'exact' });

  if (query) {
    jerseyQuery = jerseyQuery.ilike(
      'name',
      `%${query}%`
    );
  }

  if (visibilityFilter) {
  jerseyQuery = jerseyQuery.eq(
    'visibility',
    visibilityFilter
  );
}

  const {
    data: jerseys,
    count,
    error: jerseysError,
  } = await jerseyQuery
    .order('created_at', { ascending: false })
    .range(0, loadedCount - 1);

  if (jerseysError) {
    throw new Error(jerseysError.message);
  }

  const totalJerseys = count ?? 0;

  const actualLoadedCount =
    jerseys?.length ?? 0;

  const hasMore =
    actualLoadedCount < totalJerseys;

  const nextLimit = Math.min(
    loadedCount + LOAD_SIZE,
    totalJerseys
  );

  const jerseyIds = (jerseys ?? []).map(
    (jersey) => jersey.id
  );

  // ===========================================================================
  // SHARED ADMIN DATA
  // ===========================================================================

  const [
    { data: seasons },
    { data: competitions },
    { data: players },
  ] = await Promise.all([
    admin
      .from('seasons')
      .select('id, label, slug')
      .order('year_start', {
        ascending: false,
      }),

    admin
      .from('competitions')
      .select('id, name, slug')
      .order('sort_order')
      .order('name'),

    admin
      .from('players')
      .select('id, full_name')
      .order('full_name'),
  ]);

  // ===========================================================================
  // ONLY LOAD PLAYER LINKS + IMAGES FOR CURRENTLY LOADED JERSEYS
  // ===========================================================================

  let links: {
    jersey_id: string;
    player_id: string;
  }[] = [];

  let images: {
    id: string;
    jersey_id: string;
    image_path: string;
    sort_order: number;
  }[] = [];

  if (jerseyIds.length > 0) {
    const [
      { data: currentLinks },
      { data: currentImages },
    ] = await Promise.all([
      admin
        .from('jersey_players')
        .select('jersey_id, player_id')
        .in('jersey_id', jerseyIds),

      admin
        .from('jersey_images')
        .select(
          'id, jersey_id, image_path, sort_order'
        )
        .in('jersey_id', jerseyIds)
        .order('sort_order'),
    ]);

    links = currentLinks ?? [];
    images = currentImages ?? [];
  }

  // ===========================================================================
  // PLAYER MAP
  // ===========================================================================

  const linkMap = new Map<
    string,
    Set<string>
  >();

  for (const l of links) {
    if (!linkMap.has(l.jersey_id)) {
      linkMap.set(
        l.jersey_id,
        new Set<string>()
      );
    }

    linkMap
      .get(l.jersey_id)!
      .add(l.player_id);
  }

  // ===========================================================================
  // IMAGE MAP
  // ===========================================================================

  const imagesByJersey = new Map<
    string,
    {
      id: string;
      sort_order: number;
    }[]
  >();

  for (const img of images) {
    const arr =
      imagesByJersey.get(img.jersey_id) ??
      [];

    arr.push({
      id: img.id,
      sort_order: img.sort_order,
    });

    imagesByJersey.set(
      img.jersey_id,
      arr
    );
  }

  // ===========================================================================
  // LOAD MORE URL
  // ===========================================================================

  function loadMoreHref() {
    const params = new URLSearchParams();

    if (query) {
      params.set('q', query);
    }

    if (visibilityFilter) {
  params.set('visibility', visibilityFilter);
}

    params.set(
      'limit',
      String(nextLimit)
    );

return `/admin/jerseys?${params.toString()}`;
  }

  return (
    <div>
      <h1 className="font-display text-3xl uppercase tracking-tightest mb-6">
        Jerseys
      </h1>

      {/* ================================================================
          STATUS MESSAGE
      ================================================================ */}

      {searchParams?.saved && (
        <div className="fixed top-6 right-6 z-50 bg-bayern-surface border border-green-500/50 px-5 py-4 shadow-2xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-green-400 mb-1">
            Request complete
          </p>

          <p className="text-sm text-white">
            ✓ {searchParams.saved}
          </p>
        </div>
      )}

      {searchParams?.error && (
        <div className="fixed top-6 right-6 z-50 bg-bayern-surface border border-bayern-red px-5 py-4 shadow-2xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-bayern-red mb-1">
            Request failed
          </p>

          <p className="text-sm text-white">
            {searchParams.error}
          </p>
        </div>
      )}

      {/* ================================================================
          ADD NEW JERSEY
      ================================================================ */}

      <form
        action={createJersey}
        encType="multipart/form-data"
        className="bg-bayern-surface border border-bayern-border p-5 mb-8 grid grid-cols-1 md:grid-cols-12 gap-3"
      >
        <div className="md:col-span-6">
          <label className="label">
            Name
          </label>

          <input
            name="name"
            required
            className="input"
            placeholder="Home Kit 2023/24"
          />
        </div>

        <div className="md:col-span-3">
          <label className="label">
            Season
          </label>

          <select
            name="season_id"
            required
            className="input"
          >
            <option value="">
              Choose…
            </option>

            {(seasons ?? []).map((s) => (
              <option
                key={s.id}
                value={s.id}
              >
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="label">
            Kit
          </label>

          <select
            name="kit_type"
            className="input"
          >
            {KIT_OPTIONS.map((k) => (
              <option
                key={k}
                value={k}
              >
                {k}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <label className="label">
            Competition
          </label>

          <select
            name="competition_id"
            className="input"
            defaultValue=""
          >
            <option value="">
              — None —
            </option>

            {(competitions ?? []).map((c) => (
              <option
                key={c.id}
                value={c.id}
              >
                {c.name}
              </option>
            ))}
          </select>

          <p className="text-[10px] text-bayern-muted mt-1">
            Manage list at{' '}
            <a
              href="/admin/competitions"
              className="underline"
            >
              Competitions
            </a>
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="label">
            Release year
          </label>

          <input
            name="release_year"
            type="number"
            className="input"
          />
        </div>

        <div className="md:col-span-2">
          <label className="label">
            Sort
          </label>

          <input
            name="sort_order"
            type="number"
            className="input"
            defaultValue={0}
          />
        </div>

        <div className="md:col-span-2">
          <label className="label">
            Visibility
          </label>

          <select
            name="visibility"
            className="input"
            defaultValue="public"
          >
            <option value="public">
              Public
            </option>

            <option value="private">
              Private
            </option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="label">
            Sale Type
          </label>

          <select
            name="sale_type"
            className="input"
            defaultValue="fixed_price"
          >
            <option value="fixed_price">
              Fixed Price
            </option>

            <option value="offer_only">
              By Offer Only
            </option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="label">
            Price
          </label>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bayern-muted">
              $
            </span>

            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              className="input pl-7"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="label">
            Buyer's Premium
          </label>

          <select
            name="buyer_premium"
            className="input"
            defaultValue="10"
          >
            {BUYER_PREMIUM_OPTIONS.map(
              (premium) => (
                <option
                  key={premium}
                  value={premium}
                >
                  {premium}%
                </option>
              )
            )}
          </select>
        </div>

        <div className="md:col-span-6">
          <label className="label">
            Images (pick multiple)
          </label>

          <CompressedFileInput
            name="images"
            multiple
            required
            className="input"
          />

          <p className="text-[10px] text-bayern-muted mt-1">
            First photo becomes the cover.
            Cmd/Ctrl-click or drag in to add
            several.
          </p>
        </div>

        <div className="md:col-span-12">
          <label className="label">
            Description
          </label>

          <textarea
            name="description"
            rows={2}
            className="input"
            placeholder="Caption shown on the home page"
          />
        </div>

        <div className="md:col-span-12">
          <label className="label">
            Players
          </label>

          <PlayerCombobox
            name="player_ids"
            options={players ?? []}
          />
        </div>

        <button
          type="submit"
          className="btn-primary uppercase tracking-widest text-sm md:col-span-12"
        >
          Add jersey
        </button>
      </form>

      {/* ================================================================
          SEARCH
      ================================================================ */}

      <div className="bg-bayern-surface border border-bayern-border p-4 mb-4">
        <form
          method="get"
          className="flex flex-col md:flex-row md:items-end gap-3"
        >
          <div className="flex-1">
            <label className="label">
              Search Jerseys
            </label>

            <input
              type="search"
              name="q"
              defaultValue={query}
              className="input"
              placeholder="Search by jersey name..."
            />
          </div>

          <div className="w-full md:w-52">
  <label className="label">
    Visibility Filter
  </label>

  <select
    name="visibility"
    defaultValue={visibilityFilter}
    className="input"
  >
    <option value="">All Jerseys</option>
    <option value="public">Public Only</option>
    <option value="private">Private Only</option>
  </select>
</div>
          
          <button
            type="submit"
            className="btn-primary uppercase tracking-widest text-xs px-6 h-[42px]"
          >
            Search
          </button>

          {query && (
            <Link
              href="/admin/jerseys"
              className="btn-ghost uppercase tracking-widest text-xs h-[42px] flex items-center justify-center px-6"
            >
              Clear
            </Link>
          )}
        </form>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-4 pt-3 border-t border-bayern-border">
          <p className="text-[10px] uppercase tracking-widest text-bayern-muted">
            {query
              ? `${totalJerseys} result${
                  totalJerseys === 1
                    ? ''
                    : 's'
                } for "${query}"`
              : `${totalJerseys} jerseys`}
          </p>

          <p className="text-[10px] uppercase tracking-widest text-bayern-muted">
            Showing {actualLoadedCount} of{' '}
            {totalJerseys}
          </p>
        </div>
      </div>

      {/* ================================================================
          NO RESULTS
      ================================================================ */}

      {(jerseys ?? []).length === 0 && (
        <div className="bg-bayern-surface border border-bayern-border p-8 text-center mb-4">
          <p className="text-sm uppercase tracking-widest">
            No jerseys found
          </p>

          {query && (
            <p className="text-xs text-bayern-muted mt-2">
              Try a different search.
            </p>
          )}
        </div>
      )}

      {/* ================================================================
          EXISTING JERSEYS
      ================================================================ */}

      <div className="space-y-4">
        {(jerseys ?? []).map((j) => {
          const linked = Array.from(
            linkMap.get(j.id) ??
              new Set<string>()
          );

          const gallery =
            imagesByJersey.get(j.id) ?? [];

          return (
            <form
              key={j.id}
              id={`jersey-${j.id}`}
              action={updateJersey}
              encType="multipart/form-data"
              className="bg-bayern-surface border border-bayern-border p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start scroll-mt-6"
            >
              {/* Remember how many jerseys are currently loaded */}
              <input
                type="hidden"
                name="loaded_count"
                value={loadedCount}
              />

              {/* Remember current search */}
              <input
                type="hidden"
                name="admin_query"
                value={query}
              />

              <input
                type="hidden"
                name="id"
                value={j.id}
              />

              <input
                type="hidden"
                name="admin_visibility"
                value={visibilityFilter}
              />

              <div className="md:col-span-2">
                <img
                  src={`/api/image/jerseys/${j.id}`}
                  alt={j.name}
                  loading="lazy"
                  className="w-full aspect-[3/4] object-cover border border-bayern-border"
                  draggable={false}
                />

                {gallery.length > 1 && (
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-bayern-muted">
                    {gallery.length} photos
                  </p>
                )}
              </div>

              <div className="md:col-span-10 grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6">
                  <label className="label">
                    Name
                  </label>

                  <input
                    name="name"
                    defaultValue={j.name}
                    className="input"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="label">
                    Season
                  </label>

                  <select
                    name="season_id"
                    defaultValue={
                      j.season_id
                    }
                    className="input"
                  >
                    {(seasons ?? []).map(
                      (s) => (
                        <option
                          key={s.id}
                          value={s.id}
                        >
                          {s.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="label">
                    Kit
                  </label>

                  <select
                    name="kit_type"
                    defaultValue={
                      j.kit_type
                    }
                    className="input"
                  >
                    {KIT_OPTIONS.map((k) => (
                      <option
                        key={k}
                        value={k}
                      >
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="label">
                    Competition
                  </label>

                  <select
                    name="competition_id"
                    defaultValue={
                      j.competition_id ?? ''
                    }
                    className="input"
                  >
                    <option value="">
                      — None —
                    </option>

                    {(competitions ?? []).map(
                      (c) => (
                        <option
                          key={c.id}
                          value={c.id}
                        >
                          {c.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="label">
                    Release year
                  </label>

                  <input
                    name="release_year"
                    type="number"
                    defaultValue={
                      j.release_year ?? ''
                    }
                    className="input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">
                    Sort
                  </label>

                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={
                      j.sort_order ?? 0
                    }
                    className="input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">
                    Visibility
                  </label>

                  <select
                    name="visibility"
                    defaultValue={
                      j.visibility ??
                      'public'
                    }
                    className="input"
                  >
                    <option value="public">
                      Public
                    </option>

                    <option value="private">
                      Private
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="label">
                    Sale Type
                  </label>

                  <select
                    name="sale_type"
                    defaultValue={
                      j.sale_type ??
                      'fixed_price'
                    }
                    className="input"
                  >
                    <option value="fixed_price">
                      Fixed Price
                    </option>

                    <option value="offer_only">
                      By Offer Only
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="label">
                    Price
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bayern-muted">
                      $
                    </span>

                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={
                        j.price ?? ''
                      }
                      className="input pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="label">
                    Buyer's Premium
                  </label>

                  <select
                    name="buyer_premium"
                    defaultValue={String(
                      j.buyer_premium ?? 10
                    )}
                    className="input"
                  >
                    {BUYER_PREMIUM_OPTIONS.map(
                      (premium) => (
                        <option
                          key={premium}
                          value={premium}
                        >
                          {premium}%
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="md:col-span-6">
                  <label className="label">
                    Add more images
                  </label>

                  <CompressedFileInput
                    name="images"
                    multiple
                    className="input"
                  />

                  <label className="flex items-center gap-2 text-xs mt-1">
                    <input
                      type="checkbox"
                      name="replace_cover"
                    />

                    Replace cover with first
                    new image
                  </label>
                </div>

                <div className="md:col-span-12">
                  <label className="label">
                    Description
                  </label>

                  <textarea
                    name="description"
                    defaultValue={
                      j.description ?? ''
                    }
                    rows={2}
                    className="input"
                  />
                </div>

                <div className="md:col-span-12">
                  <label className="label">
                    Players
                  </label>

                  <PlayerCombobox
                    name="player_ids"
                    options={players ?? []}
                    defaultSelected={
                      linked
                    }
                  />
                </div>

                {gallery.length > 0 && (
                  <div className="md:col-span-12">
                    <label className="label">
                      Gallery
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {gallery.map((g) => (
                        <div
                          key={g.id}
                          className="relative w-20"
                        >
                          <img
                            src={`/api/image/jersey-images/${g.id}`}
                            alt=""
                            loading="lazy"
                            className="w-20 h-24 object-cover border border-bayern-border"
                            draggable={false}
                          />

                          <button
                            type="submit"
                            formAction={deleteJerseyImage.bind(null, g.id)}
                            className="absolute top-1 right-1 bg-black/80 hover:bg-bayern-red text-white text-[10px] uppercase tracking-widest px-1.5 py-0.5"
                            title="Remove this photo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="md:col-span-12 flex gap-2">
                  <button
                    type="submit"
                    className="btn-ghost uppercase tracking-widest text-xs"
                  >
                    Save
                  </button>

                  <button
                    type="submit"
                    formAction={
                      deleteJersey
                    }
                    className="border border-bayern-red/40 hover:bg-bayern-red text-bayern-red hover:text-white px-3 text-xs uppercase tracking-widest transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </form>
          );
        })}
      </div>

      {/* ================================================================
          LOAD MORE
      ================================================  href={loadMoreHref()}================ */}

      <div
        id="load-more"
        className="scroll-mt-8 mt-6"
      >
        {hasMore ? (
          <div className="bg-bayern-surface border border-bayern-border p-5 text-center">
            <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-3">
              Showing {actualLoadedCount} of{' '}
              {totalJerseys} jerseys
            </p>

            <Link
              href={loadMoreHref()}
              scroll={false}
              className="btn-primary uppercase tracking-[0.2em] text-xs inline-flex items-center justify-center px-10 py-3"
            >
              Load More
            </Link>

            <p className="text-[10px] uppercase tracking-widest text-bayern-muted mt-3">
              Load next{' '}
              {Math.min(
                LOAD_SIZE,
                totalJerseys -
                  actualLoadedCount
              )}{' '}
              jerseys
            </p>
          </div>
        ) : (
          totalJerseys > 0 && (
            <div className="border-t border-bayern-border py-6 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-bayern-muted">
                All {totalJerseys} jerseys
                loaded
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
