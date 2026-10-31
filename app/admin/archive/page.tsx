
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SoldArchivePage() {
  await requireAdmin();

  const admin = createAdminClient();

  const { data: jerseys, error } = await admin
    .from('jerseys')
    .select('id, name, price, sale_type, sold_at')
    .eq('is_sold', true)
    .order('sold_at', { ascending: false });

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">
        Sold Archive
      </h1>

      <p className="mt-2 text-sm text-bayern-muted">
        Sold jerseys are preserved here for your records.
      </p>

      {error ? (
        <p className="mt-6 text-red-400">
          Unable to load sold jerseys.
        </p>
      ) : !jerseys?.length ? (
        <div className="mt-8 border border-bayern-border p-8 text-center text-bayern-muted">
          No sold jerseys yet.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jerseys.map((jersey) => (
            <div
              key={jersey.id}
              className="overflow-hidden border border-bayern-border bg-bayern-surface"
            >
              <div className="relative aspect-[3/4] bg-black">
                <img
                  src={`/api/image/jerseys/${jersey.id}`}
                  alt={jersey.name}
                  className="h-full w-full object-contain"
                />
                <span className="absolute left-3 top-3 bg-bayern-red px-3 py-1 text-xs font-bold uppercase text-white">
                  Sold
                </span>
              </div>

              <div className="p-4">
                <h2 className="font-semibold">
                  {jersey.name}
                </h2>

                <p className="mt-2 text-sm text-bayern-muted">
                  {jersey.sale_type === 'offer_only'
                    ? 'By Offer Only'
                    : jersey.price != null
                      ? `$${Number(jersey.price).toFixed(2)}`
                      : 'Price unavailable'}
                </p>

                <p className="mt-2 text-xs text-bayern-muted">
                  Sold: {jersey.sold_at
                    ? new Date(jersey.sold_at).toLocaleDateString('en-CA')
                    : 'Date unavailable'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/admin/jerseys"
          className="text-sm text-bayern-red hover:underline"
        >
          Back to Jerseys
        </Link>
      </div>
    </div>
  );
}
