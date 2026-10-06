import { createClient } from '@/lib/supabase/server';
import { DeleteAccountForm } from '@/components/delete-account-form';
import { AcceptCounterOfferButton } from '@/components/accept-counter-offer-button';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // ---------------------------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------------------------

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, display_name, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  // ---------------------------------------------------------------------------
  // MY OFFERS
  // RLS will make sure the buyer only sees their own offers.
  // ---------------------------------------------------------------------------

  const { data: offers } = await supabase
    .from('offers')
    .select(
      'id, jersey_id, initial_amount, current_amount, status, accepted_amount, payment_expires_at, created_at, updated_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const jerseyIds = Array.from(
    new Set((offers ?? []).map((offer) => offer.jersey_id))
  );

  const offerIds = (offers ?? []).map((offer) => offer.id);

  // ---------------------------------------------------------------------------
  // JERSEYS
  // ---------------------------------------------------------------------------

  const { data: jerseys } = jerseyIds.length
    ? await supabase
        .from('jerseys')
        .select('id, name, buyer_premium')
        .in('id', jerseyIds)
    : { data: [] as any[] };

  const jerseyMap = new Map(
    (jerseys ?? []).map((jersey) => [jersey.id, jersey])
  );

  // ---------------------------------------------------------------------------
  // OFFER MESSAGES
  // ---------------------------------------------------------------------------

  const { data: messages } = offerIds.length
    ? await supabase
        .from('offer_messages')
        .select('id, offer_id, sender_id, message, amount, created_at')
        .in('offer_id', offerIds)
        .order('created_at', { ascending: true })
    : { data: [] as any[] };

  const messagesByOffer = new Map<string, any[]>();

  for (const message of messages ?? []) {
    const list = messagesByOffer.get(message.offer_id) ?? [];

    list.push(message);

    messagesByOffer.set(message.offer_id, list);
  }

  function formatMoney(amount: number | null) {
    if (amount == null) return '—';

    return `$${Number(amount).toLocaleString('en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function statusClasses(status: string) {
    switch (status) {
      case 'pending':
        return 'border-blue-500/50 text-blue-400';

      case 'countered':
        return 'border-yellow-500/50 text-yellow-400';

      case 'accepted':
        return 'border-green-500/50 text-green-400';

      case 'declined':
        return 'border-red-500/50 text-red-400';

      case 'expired':
        return 'border-zinc-500/50 text-zinc-400';

      case 'paid':
        return 'border-green-500/50 text-green-400';

      default:
        return 'border-bayern-border text-bayern-muted';
    }
  }

  return (
    <div className="px-4 lg:px-8 py-8 max-w-3xl mx-auto">
      <h1 className="font-display text-4xl uppercase tracking-tightest leading-none mb-8">
        Account
      </h1>

      {/* PROFILE */}
      <section className="border border-bayern-border p-6 mb-8 bg-bayern-surface">
        <h2 className="text-xs uppercase tracking-widest text-bayern-muted mb-4">
          Profile
        </h2>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-bayern-border pb-2 gap-4">
            <dt className="text-bayern-muted">Email</dt>

            <dd className="font-mono text-right">
              {profile?.email}
            </dd>
          </div>

          <div className="flex justify-between border-b border-bayern-border pb-2 gap-4">
            <dt className="text-bayern-muted">Name</dt>

            <dd className="text-right">
              {profile?.display_name ?? '—'}
            </dd>
          </div>

          <div className="flex justify-between border-b border-bayern-border pb-2 gap-4">
            <dt className="text-bayern-muted">Role</dt>

            <dd className="uppercase">
              {profile?.role}
            </dd>
          </div>

          <div className="flex justify-between gap-4">
            <dt className="text-bayern-muted">Joined</dt>

            <dd>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* MY OFFERS */}
      <section className="mb-8">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-2xl uppercase tracking-tightest">
              My Offers
            </h2>

            <p className="mt-1 text-sm text-bayern-muted">
              View your offers and seller responses.
            </p>
          </div>

          <span className="text-xs uppercase tracking-widest text-bayern-muted">
            {(offers ?? []).length}{' '}
            {(offers ?? []).length === 1 ? 'Offer' : 'Offers'}
          </span>
        </div>

        {(offers ?? []).length === 0 ? (
          <div className="border border-dashed border-bayern-border p-8 text-center text-sm text-bayern-muted">
            You have not submitted any offers yet.
          </div>
        ) : (
          <div className="space-y-6">
            {(offers ?? []).map((offer) => {
              const jersey = jerseyMap.get(offer.jersey_id);

              const offerMessages =
                messagesByOffer.get(offer.id) ?? [];

              return (
                <article
                  key={offer.id}
                  className="border border-bayern-border bg-bayern-surface"
                >
                  {/* OFFER HEADER */}
                  <div className="p-5 border-b border-bayern-border">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
                          Jersey
                        </p>

                        <h3 className="font-display text-xl uppercase leading-tight">
                          {jersey?.name ?? 'Jersey'}
                        </h3>
                      </div>

                      <span
                        className={`self-start border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest ${statusClasses(
                          offer.status
                        )}`}
                      >
                        {offer.status}
                      </span>
                    </div>
                  </div>

                  {/* OFFER DETAILS */}
                  <div className="grid grid-cols-2 md:grid-cols-3 border-b border-bayern-border">
                    <div className="p-4 border-r border-bayern-border">
                      <p className="text-[10px] uppercase tracking-widest text-bayern-muted">
                        Your Original Offer
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatMoney(offer.initial_amount)}
                      </p>
                    </div>

                    <div className="p-4 md:border-r border-bayern-border">
                      <p className="text-[10px] uppercase tracking-widest text-bayern-muted">
                        Current Offer
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatMoney(offer.current_amount)}
                      </p>
                    </div>

                    <div className="p-4 col-span-2 md:col-span-1 border-t md:border-t-0 border-bayern-border">
                      <p className="text-[10px] uppercase tracking-widest text-bayern-muted">
                        Buyer&apos;s Premium
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {jersey?.buyer_premium ?? 10}%
                      </p>
                    </div>
                  </div>

                  {/* ACCEPTED INFORMATION */}
                  {offer.status === 'accepted' && (
                    <div className="p-5 border-b border-bayern-border bg-green-500/5">
                      <p className="text-[10px] uppercase tracking-widest text-green-400 mb-2">
                        Offer Accepted
                      </p>

                      <p className="text-xl font-semibold">
                        {formatMoney(
                          offer.accepted_amount ??
                            offer.current_amount
                        )}
                      </p>

                      {offer.payment_expires_at && (
                        <>
                          <p className="mt-4 text-[10px] uppercase tracking-widest text-bayern-muted">
                            Payment Deadline
                          </p>

                          <p className="mt-1 text-sm">
                            {new Date(
                              offer.payment_expires_at
                            ).toLocaleString()}
                          </p>

                          <p className="mt-2 text-xs text-bayern-muted">
                            Payment must be completed within the
                            24-hour payment window.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* OFFER HISTORY */}
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-4">
                      Offer History
                    </p>

                    {offerMessages.length === 0 ? (
                      <p className="text-sm text-bayern-muted">
                        No messages yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {offerMessages.map((message) => {
                          const isBuyer =
                            message.sender_id === user.id;

                          return (
                            <div
                              key={message.id}
                              className={
                                isBuyer
                                  ? 'border border-bayern-border p-4'
                                  : 'border border-bayern-red/40 bg-bayern-red/5 p-4'
                              }
                            >
                              <div className="flex items-center justify-between gap-4">
                                <span
                                  className={
                                    isBuyer
                                      ? 'text-[10px] uppercase tracking-widest text-bayern-muted'
                                      : 'text-[10px] uppercase tracking-widest text-bayern-red'
                                  }
                                >
                                  {isBuyer
                                    ? 'You'
                                    : 'Seller'}
                                </span>

                                <span className="text-[10px] text-bayern-muted">
                                  {new Date(
                                    message.created_at
                                  ).toLocaleString()}
                                </span>
                              </div>

                              {message.amount != null && (
                                <p className="mt-3 text-lg font-semibold">
                                  {formatMoney(message.amount)}
                                </p>
                              )}

                              {message.message && (
                                <p className="mt-2 text-sm leading-relaxed">
                                  {message.message}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* COUNTER NOTICE */}
{offer.status === 'countered' && (
  <div className="border-t border-yellow-500/30 bg-yellow-500/5 p-5">
    <p className="text-xs uppercase tracking-widest text-yellow-400 font-semibold">
      Seller Counter Offer
    </p>

    <p className="mt-2 text-2xl font-semibold">
      {formatMoney(offer.current_amount)}
    </p>

    <p className="mt-2 text-sm text-bayern-muted">
      The seller has sent you a counter offer.
    </p>

    <AcceptCounterOfferButton
      offerId={offer.id}
      amount={Number(offer.current_amount)}
    />
  </div>
)}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* DANGER ZONE */}
      <section className="border border-bayern-red/40 p-6 bg-bayern-red/5">
        <h2 className="text-xs uppercase tracking-widest text-bayern-red mb-2">
          Danger zone
        </h2>

        <p className="text-sm text-bayern-muted mb-4">
          Permanently delete your account, favorites, and any
          session data. This cannot be undone.
        </p>

        <DeleteAccountForm
          email={profile?.email ?? user.email ?? ''}
        />
      </section>
    </div>
  );
}
