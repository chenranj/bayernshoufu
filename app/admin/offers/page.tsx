import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type OfferRow = {
  id: string;
  jersey_id: string;
  user_id: string;
  initial_amount: number;
  current_amount: number;
  status: string;
  accepted_amount: number | null;
  payment_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type JerseyRow = {
  id: string;
  name: string;
  buyer_premium: number;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

type MessageRow = {
  id: string;
  offer_id: string;
  sender_id: string;
  message: string | null;
  amount: number | null;
  created_at: string;
};

function money(value: number | null) {
  if (value == null) return '—';

  return `$${Number(value).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusClass(status: string) {
  switch (status) {
    case 'accepted':
      return 'border-green-500/50 text-green-400 bg-green-500/10';

    case 'declined':
      return 'border-red-500/50 text-red-400 bg-red-500/10';

    case 'countered':
      return 'border-yellow-500/50 text-yellow-300 bg-yellow-500/10';

    case 'expired':
      return 'border-zinc-500/50 text-zinc-400 bg-zinc-500/10';

    case 'paid':
      return 'border-blue-500/50 text-blue-300 bg-blue-500/10';

    default:
      return 'border-bayern-red/50 text-white bg-bayern-red/10';
  }
}

export default async function OffersAdmin() {
  await requireAdmin();

  const admin = createAdminClient();

  const { data: offersData, error: offersError } = await admin
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false });

  if (offersError) {
    return (
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tightest mb-6">
          Offers
        </h1>

        <div className="border border-bayern-red bg-bayern-red/10 p-4 text-sm">
          Unable to load offers: {offersError.message}
        </div>
      </div>
    );
  }

  const offers = (offersData ?? []) as OfferRow[];

  const jerseyIds = Array.from(
    new Set(offers.map((offer) => offer.jersey_id))
  );

  const userIds = Array.from(
    new Set(offers.map((offer) => offer.user_id))
  );

  const offerIds = offers.map((offer) => offer.id);

  let jerseys: JerseyRow[] = [];
  let profiles: ProfileRow[] = [];
  let messages: MessageRow[] = [];

  if (jerseyIds.length > 0) {
    const { data } = await admin
      .from('jerseys')
      .select('id, name, buyer_premium')
      .in('id', jerseyIds);

    jerseys = (data ?? []) as JerseyRow[];
  }

  if (userIds.length > 0) {
    const { data } = await admin
      .from('profiles')
      .select('id, email, display_name')
      .in('id', userIds);

    profiles = (data ?? []) as ProfileRow[];
  }

  if (offerIds.length > 0) {
    const { data } = await admin
      .from('offer_messages')
      .select(
        'id, offer_id, sender_id, message, amount, created_at'
      )
      .in('offer_id', offerIds)
      .order('created_at', { ascending: true });

    messages = (data ?? []) as MessageRow[];
  }

  const jerseyMap = new Map(
    jerseys.map((jersey) => [jersey.id, jersey])
  );

  const profileMap = new Map(
    profiles.map((profile) => [profile.id, profile])
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-tightest">
          Offers
        </h1>

        <p className="mt-2 text-sm text-bayern-muted">
          Review and manage buyer offers.
        </p>
      </div>

      {offers.length === 0 ? (
        <div className="border border-bayern-border bg-bayern-surface p-8 text-center">
          <p className="text-sm text-bayern-muted">
            No offers yet.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {offers.map((offer) => {
            const jersey = jerseyMap.get(offer.jersey_id);
            const buyer = profileMap.get(offer.user_id);

            const offerMessages = messages.filter(
              (message) => message.offer_id === offer.id
            );

            const firstMessage = offerMessages[0];

            return (
              <div
                key={offer.id}
                className="border border-bayern-border bg-bayern-surface overflow-hidden"
              >
                <div className="p-5 border-b border-bayern-border">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
                        Jersey
                      </p>

                      <h2 className="font-display text-2xl uppercase tracking-tightest">
                        {jersey?.name ?? 'Unknown Jersey'}
                      </h2>

                      <p className="mt-2 text-xs text-bayern-muted">
                        Offer ID:{' '}
                        <span className="font-mono">
                          {offer.id}
                        </span>
                      </p>
                    </div>

                    <span
                      className={`inline-flex self-start border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest ${statusClass(
                        offer.status
                      )}`}
                    >
                      {offer.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 border-b border-bayern-border">
                  <div className="p-4 md:border-r border-bayern-border">
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                      Current Offer
                    </p>

                    <p className="text-xl font-semibold">
                      {money(offer.current_amount)}
                    </p>
                  </div>

                  <div className="p-4 md:border-r border-bayern-border">
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                      Buyer&apos;s Premium
                    </p>

                    <p className="text-xl font-semibold">
                      {jersey?.buyer_premium ?? 10}%
                    </p>
                  </div>

                  <div className="p-4 md:border-r border-bayern-border">
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                      Buyer
                    </p>

                    <p className="text-sm font-semibold break-all">
                      {buyer?.display_name ||
                        buyer?.email ||
                        'Unknown User'}
                    </p>

                    {buyer?.display_name && buyer?.email && (
                      <p className="mt-1 text-xs text-bayern-muted break-all">
                        {buyer.email}
                      </p>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                      Submitted
                    </p>

                    <p className="text-sm font-semibold">
                      {new Date(
                        offer.created_at
                      ).toLocaleString('en-CA')}
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
                    Buyer Message
                  </p>

                  <div className="border border-bayern-border bg-black/40 p-4">
                    <p className="text-sm whitespace-pre-line">
                      {firstMessage?.message ||
                        'No message provided.'}
                    </p>

                    {firstMessage?.amount != null && (
                      <p className="mt-3 text-xs text-bayern-muted">
                        Offer amount:{' '}
                        <span className="text-white font-semibold">
                          {money(firstMessage.amount)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <div className="border-t border-bayern-border pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted">
                      Admin Actions
                    </p>

                    <p className="mt-2 text-xs text-bayern-muted">
                      Accept, Counter, Decline and messaging
                      controls will be added next.
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
