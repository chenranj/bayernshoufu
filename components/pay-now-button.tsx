
'use client';

import { useState } from 'react';

type PayNowButtonProps = {
  offerId: string;
};

export function PayNowButton({ offerId }: PayNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePayment() {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/offers/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ offerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to start payment.');
      }

      if (
        typeof data.url !== 'string' ||
        !data.url.startsWith('https://checkout.stripe.com/')
      ) {
        throw new Error('Invalid Stripe checkout URL.');
      }

      window.location.assign(data.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Payment could not be started.'
      );
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {loading ? 'REDIRECTING TO STRIPE...' : 'PAY NOW'}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
