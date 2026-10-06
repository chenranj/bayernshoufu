'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type BuyerDeclineOfferButtonProps = {
  offerId: string;
};

export function BuyerDeclineOfferButton({
  offerId,
}: BuyerDeclineOfferButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDecline() {
    const confirmed = window.confirm(
      'Are you sure you want to decline this counter offer? This action cannot be undone.'
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        '/api/offers/buyer-decline',
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
        setError(
          data?.error ||
            'Unable to decline this offer.'
        );

        return;
      }

      router.refresh();
    } catch (err) {
      console.error(
        '[BuyerDeclineOfferButton] failed',
        err
      );

      setError(
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleDecline}
        disabled={loading}
        className="w-full border border-red-500/50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Declining...' : 'Decline Offer'}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
