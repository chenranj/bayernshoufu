import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';
import {
  acceptOffer,
  counterOffer,
  declineOffer,
  saveTrackingInfo,
} from '../_actions';

export const dynamic = 'force-dynamic';

type OfferRow = {
  id: string;
  jersey_id: string;
  user_id: string;
  purchase_type: 'offer' | 'fixed_price';
  initial_amount: number;
  current_amount: number;
  status: string;
  accepted_amount: number | null;
  payment_expires_at: string | null;
  created_at: string;
  updated_at: string;
  shipping_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
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
  const { user: adminUser } = await requireAdmin();

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
        <div className="space-y-6">
          {offers.map((offer) => {
            const jersey = jerseyMap.get(offer.jersey_id);
            const buyer = profileMap.get(offer.user_id);

            const offerMessages = messages.filter(
              (message) => message.offer_id === offer.id
            );

            const canManage =
            offer.purchase_type === 'offer' &&
            (offer.status === 'pending' ||
              offer.status === 'countered');

            return (
              <div
                key={offer.id}
                className="border border-bayern-border bg-bayern-surface overflow-hidden"
              >
                {/* HEADER */}
                <div className="p-5 border-b border-bayern-border">
                  <div className="mb-4">
  <span
    className={`inline-flex border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest ${
      offer.purchase_type === 'fixed_price'
        ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
        : 'border-bayern-red/50 bg-bayern-red/10 text-white'
    }`}
  >
    {offer.purchase_type === 'fixed_price'
      ? 'BUY NOW'
      : 'OFFER'}
  </span>
</div>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
                        Jersey
                      </p>

                      <h2 className="font-display text-2xl uppercase tracking-tightest">
                        {jersey?.name ?? 'Unknown Jersey'}
                      </h2>

                      <p className="mt-2 text-xs text-bayern-muted">
                        {offer.purchase_type === 'fixed_price'
  ? 'Order ID: '
  : 'Offer ID: '}
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

                {/* OFFER INFO */}
                <div className="grid grid-cols-1 md:grid-cols-4 border-b border-bayern-border">
                  <div className="p-4 md:border-r border-bayern-border">
                    <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                      {offer.purchase_type === 'fixed_price'
  ? 'Purchase Price'
  : 'Current Offer'}
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

                {/* ACCEPTED INFORMATION */}
                {offer.status === 'accepted' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 border-b border-bayern-border bg-green-500/5">
                    <div className="p-4 md:border-r border-bayern-border">
                      <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                        Accepted Amount
                      </p>

                      <p className="text-xl font-semibold text-green-400">
                        {money(offer.accepted_amount)}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-1">
                        Payment Deadline
                      </p>

                      <p className="text-sm font-semibold">
                        {offer.payment_expires_at
                          ? new Date(
                              offer.payment_expires_at
                            ).toLocaleString('en-CA')
                          : '—'}
                      </p>

                      <p className="mt-1 text-[10px] uppercase tracking-widest text-bayern-muted">
                        24 hour payment window
                      </p>
                    </div>
                  </div>
                )}

                

{/* SHIPPING TRACKING */}
{offer.status === 'paid' && (
  <div className="p-5 border-b border-bayern-border">
    <p className="text-xs font-semibold uppercase tracking-widest mb-4">
      Shipping Information
    </p>

    {offer.shipped_at ? (
      <div className="border border-green-500/30 bg-green-500/5 p-5">
        <p className="text-sm font-semibold uppercase tracking-widest text-green-400">
          SHIPPED
        </p>

        <p className="mt-2 text-xs text-bayern-muted">
          Your jersey has been shipped.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-bayern-muted">
              Shipping Carrier
            </p>
            <p className="mt-1 text-sm font-semibold">
              {offer.shipping_carrier || '—'}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-bayern-muted">
              Tracking Number
            </p>
            <p className="mt-1 text-sm font-mono break-all">
              {offer.tracking_number || '—'}
            </p>
          </div>

          {offer.tracking_url && (
            <a
              href={offer.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-green-500/50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-green-400 hover:bg-green-500/10"
            >
              TRACK PACKAGE ↗
            </a>
          )}

          <p className="text-xs text-bayern-muted">
            First shipped:{' '}
            {new Date(offer.shipped_at).toLocaleString('en-CA')}
          </p>
        </div>

        <details className="mt-5 border-t border-green-500/20 pt-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-green-400 hover:opacity-80">
            EDIT TRACKING
          </summary>

          <form
            action={saveTrackingInfo}
            className="mt-4 space-y-4 border border-bayern-border bg-black/40 p-4"
          >
            <input
              type="hidden"
              name="offer_id"
              value={offer.id}
            />

            <div>
              <label className="label">
                Shipping Carrier
              </label>
              <input
                name="shipping_carrier"
                type="text"
                required
                maxLength={100}
                defaultValue={offer.shipping_carrier ?? ''}
                className="input"
              />
            </div>

            <div>
              <label className="label">
                Tracking Number
              </label>
              <input
                name="tracking_number"
                type="text"
                required
                maxLength={200}
                defaultValue={offer.tracking_number ?? ''}
                className="input"
              />
            </div>

            <div>
              <label className="label">
                Tracking URL (Optional)
              </label>
              <input
                name="tracking_url"
                type="url"
                maxLength={2000}
                defaultValue={offer.tracking_url ?? ''}
                placeholder="https://..."
                className="input"
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto bg-bayern-red hover:opacity-90 text-white px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-opacity"
            >
              SAVE TRACKING INFORMATION
            </button>
          </form>
        </details>
      </div>
    ) : (
      <div>
        <div className="border border-yellow-500/30 bg-yellow-500/5 p-4 mb-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
            PROCESSING
          </p>
          <p className="mt-2 text-xs text-bayern-muted">
            Payment received. Awaiting shipment and tracking information.
          </p>
        </div>

        <form
          action={saveTrackingInfo}
          className="space-y-4 border border-bayern-border bg-black/40 p-4"
        >
          <input
            type="hidden"
            name="offer_id"
            value={offer.id}
          />

          <div>
            <label className="label">
              Shipping Carrier
            </label>
            <input
              name="shipping_carrier"
              type="text"
              required
              maxLength={100}
              placeholder="DHL, FedEx, UPS, Canada Post..."
              className="input"
            />
          </div>

          <div>
            <label className="label">
              Tracking Number
            </label>
            <input
              name="tracking_number"
              type="text"
              required
              maxLength={200}
              placeholder="Enter tracking number"
              className="input"
            />
          </div>

          <div>
            <label className="label">
              Tracking URL (Optional)
            </label>
            <input
              name="tracking_url"
              type="url"
              maxLength={2000}
              placeholder="https://..."
              className="input"
            />
          </div>

          <button
            type="submit"
            className="w-full md:w-auto bg-bayern-red hover:opacity-90 text-white px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-opacity"
          >
            SAVE TRACKING INFORMATION
          </button>
        </form>
      </div>
    )}
  </div>
)}


                
                {/* OFFER HISTORY */}
              {offer.purchase_type === 'offer' && (
                <div className="p-5 border-b border-bayern-border">
                  <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-3">
                    Offer History
                  </p>

                  {offerMessages.length === 0 ? (
                    <div className="border border-bayern-border bg-black/40 p-4">
                      <p className="text-sm text-bayern-muted">
                        No messages yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {offerMessages.map((message) => {
                        const isAdmin =
                          message.sender_id === adminUser.id;

                        return (
                          <div
                            key={message.id}
                            className={`border p-4 ${
                              isAdmin
                                ? 'border-bayern-red/40 bg-bayern-red/5'
                                : 'border-bayern-border bg-black/40'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <p
                                className={`text-[10px] font-semibold uppercase tracking-widest ${
                                  isAdmin
                                    ? 'text-bayern-red'
                                    : 'text-bayern-muted'
                                }`}
                              >
                                {isAdmin ? 'Admin' : 'Buyer'}
                              </p>

                              <p className="text-[10px] text-bayern-muted">
                                {new Date(
                                  message.created_at
                                ).toLocaleString('en-CA')}
                              </p>
                            </div>

                            {message.amount != null && (
                              <p className="mt-3 text-lg font-semibold">
                                {money(message.amount)}
                              </p>
                            )}

                            {message.message && (
                              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">
                                {message.message}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                )}

                {/* ADMIN ACTIONS */}
                <div className="p-5">
                  <p className="text-[10px] uppercase tracking-widest text-bayern-muted mb-4">
                    Admin Actions
                  </p>

                  {canManage ? (
                    <div className="space-y-5">
                      {/* ACCEPT */}
                      <div className="border border-green-500/30 bg-green-500/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest">
                          Accept Current Offer
                        </p>

                        <p className="mt-2 text-xs text-bayern-muted">
                          Accept {money(offer.current_amount)} and
                          start the buyer&apos;s 24 hour payment
                          window.
                        </p>

                        <form
                          action={acceptOffer}
                          className="mt-4"
                        >
                          <input
                            type="hidden"
                            name="offer_id"
                            value={offer.id}
                          />

                          <button
                            type="submit"
                            className="w-full md:w-auto bg-green-600 hover:bg-green-500 text-white px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors"
                          >
                            Accept Offer
                          </button>
                        </form>
                      </div>

                      {/* COUNTER */}
                      <div className="border border-yellow-500/30 bg-yellow-500/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest">
                          Counter Offer
                        </p>

                        <p className="mt-2 text-xs text-bayern-muted">
                          Send the buyer a new offer amount. The
                          24 hour payment window does not start
                          until an offer is accepted.
                        </p>

                        <form
                          action={counterOffer}
                          className="mt-4 space-y-3"
                        >
                          <input
                            type="hidden"
                            name="offer_id"
                            value={offer.id}
                          />

                          <div>
                            <label className="label">
                              Counter Amount
                            </label>

                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold">
                                $
                              </span>

                              <input
                                name="counter_amount"
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                placeholder="0.00"
                                className="input pl-8"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="label">
                              Message
                            </label>

                            <textarea
                              name="message"
                              rows={3}
                              maxLength={1000}
                              placeholder="Optional message to the buyer..."
                              className="input resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full md:w-auto border border-yellow-500/60 hover:bg-yellow-500 hover:text-black px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors"
                          >
                            Send Counter Offer
                          </button>
                        </form>
                      </div>

                      {/* DECLINE */}
                      <div className="border border-red-500/30 bg-red-500/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest">
                          Decline Offer
                        </p>

                        <form
                          action={declineOffer}
                          className="mt-4 space-y-3"
                        >
                          <input
                            type="hidden"
                            name="offer_id"
                            value={offer.id}
                          />

                          <div>
                            <label className="label">
                              Message
                            </label>

                            <textarea
                              name="message"
                              rows={3}
                              maxLength={1000}
                              placeholder="Optional reason for declining..."
                              className="input resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full md:w-auto border border-red-500/60 text-red-400 hover:bg-red-600 hover:text-white px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors"
                          >
                            Decline Offer
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-bayern-border bg-black/40 p-4">
                      <p className="text-sm font-semibold uppercase">
                        {offer.status === 'accepted' &&
                          'Offer Accepted'}

                        {offer.status === 'declined' &&
                          'Offer Declined'}

                        {offer.status === 'expired' &&
                          'Payment Window Expired'}

                        {offer.status === 'paid' &&
                          'Payment Completed'}
                        {offer.status === 'checkout_pending' &&
                          'Awaiting Checkout Payment'}
                      </p>

                      <p className="mt-2 text-xs text-bayern-muted">
                        {offer.purchase_type === 'fixed_price'
                        ? 'Manage shipping above once payment is completed.'
                        : 'No further admin action is available for this offer.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
