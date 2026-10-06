'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AcceptCounterOfferButton({
  offerId,
  amount,
}: {
  offerId: string;
  amount: number;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatMoney(value: number) {
    return `$${Number(value).toLocaleString('en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  async function handleAccept() {
    const confirmed = window.confirm(
      `Accept the seller's counter offer of ${formatMoney(
        amount
      )}?\n\nYou will have 24 hours to complete payment after accepting.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        '/api/offers/accept-counter',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            offer_id: offerId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to accept this offer.'
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to accept this offer.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={handleAccept}
        disabled={loading}
        className="w-full bg-bayern-red px-5 py-3 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? 'Accepting...'
          : `Accept ${formatMoney(amount)} Offer`}
      </button>

      <p className="mt-2 text-xs text-bayern-muted">
        By accepting this counter offer, you agree to complete
        payment within 24 hours.
      </p>

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
