'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function BuyerCounterOfferForm({
  offerId,
}: {
  offerId: string;
}) {
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid counter amount.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/offers/buyer-counter', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          offer_id: offerId,
          amount: numericAmount,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.error || 'Unable to submit counter offer.'
        );
        return;
      }

      setAmount('');
      setMessage('');

      router.refresh();
    } catch {
      setError('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 border-t border-yellow-500/20 pt-5"
    >
      <p className="text-[10px] uppercase tracking-widest text-bayern-muted">
        Or Send Your Counter Offer
      </p>

      <div className="mt-3">
        <label className="block text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
          Counter Amount
        </label>

        <div className="flex items-center border border-bayern-border bg-black">
          <span className="px-4 text-sm text-bayern-muted">
            $
          </span>

          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="400.00"
            disabled={submitting}
            className="w-full bg-transparent px-0 py-3 pr-4 text-sm outline-none disabled:opacity-50"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[10px] uppercase tracking-widest text-bayern-muted mb-2">
          Message
        </label>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Optional message to the seller"
          rows={3}
          disabled={submitting}
          className="w-full resize-none border border-bayern-border bg-black p-3 text-sm outline-none focus:border-yellow-500 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full border border-yellow-500/60 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-yellow-400 transition-colors hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? 'Sending Counter...'
          : 'Send Counter Offer'}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
