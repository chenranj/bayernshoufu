'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteAccountForm({ email }: { email: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (confirm !== email) {
      setError('Type your email exactly to confirm.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Failed to delete account.');
        return;
      }
      router.replace('/login?error=Account+deleted');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="text"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={`Type ${email} to confirm`}
        className="input"
      />
      {error && <p className="text-sm text-bayern-red">{error}</p>}
      <button
        type="submit"
        disabled={isPending || confirm !== email}
        className="btn-primary uppercase tracking-widest text-sm"
      >
        {isPending ? 'Deleting…' : 'Delete my account'}
      </button>
    </form>
  );
}
