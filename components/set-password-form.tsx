'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return setError(error.message);
      router.replace('/jerseys');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="pw">New password</label>
        <input
          id="pw"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="label" htmlFor="pw2">Confirm</label>
        <input
          id="pw2"
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="text-sm text-bayern-red border border-bayern-red/40 bg-bayern-red/10 px-3 py-2">
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full uppercase tracking-widest text-sm">
        {isPending ? 'Saving…' : 'Save password'}
      </button>
    </form>
  );
}
