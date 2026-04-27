'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace(redirectTo || '/jerseys');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="text-sm text-bayern-red border border-bayern-red/40 bg-bayern-red/10 px-3 py-2">
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full uppercase tracking-widest text-sm">
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-xs text-bayern-muted text-center">
        Account by invitation only. Contact an admin to get access.
      </p>
    </form>
  );
}
