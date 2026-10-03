'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/jerseys`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    });
  }

  return (
    <main className="min-h-dvh bg-black flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">

        <div className="flex items-center gap-4 mb-10">
          <div className="w-3 h-14 bg-bayern-red" />

          <div className="flex flex-col">
            <span className="font-mono text-[30px] tracking-[0.15em] text-white uppercase">
              SHOUFU JERSEY®
            </span>

            <span className="font-mono text-[16px] tracking-[0.15em] text-gray-400 mt-2 uppercase">
              PRIVATE ARCHIVE • EST. 2021
            </span>
          </div>
        </div>

        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tightest leading-[0.95] mb-3">
          Join the
          <br />
          <span className="text-bayern-red">Archive.</span>
        </h1>

        <p className="text-bayern-muted text-sm mb-10">
          Create an account to save your favorite Bayern jerseys.
        </p>

        {success ? (
          <div>
            <div className="border border-bayern-red/40 bg-bayern-red/10 p-5 mb-6">
              <h2 className="text-white font-semibold uppercase tracking-widest mb-2">
                Check your email
              </h2>

              <p className="text-sm text-bayern-muted leading-relaxed">
                We sent a confirmation link to{' '}
                <span className="text-white">{email}</span>.
                Open the email and confirm your account to continue.
              </p>
            </div>

            <Link
              href="/login"
              className="flex items-center justify-center w-full border border-bayern-border py-4 text-sm font-semibold uppercase tracking-widest text-white hover:border-white transition-colors"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            autoComplete="on"
          >
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>

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
              <label className="label" htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="text-sm text-bayern-red border border-bayern-red/40 bg-bayern-red/10 px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full uppercase tracking-widest text-sm"
            >
              {isPending ? 'Creating account…' : 'Sign up'}
            </button>

            <div className="pt-2 text-center">
              <p className="text-xs uppercase tracking-widest text-bayern-muted mb-4">
                Already have an account?
              </p>

              <Link
                href="/login"
                className="flex items-center justify-center w-full border border-bayern-border py-4 text-sm font-semibold uppercase tracking-widest text-white hover:border-white transition-colors"
              >
                Sign in
              </Link>
            </div>
          </form>
        )}

        <p className="mt-10 text-xs text-bayern-muted leading-relaxed">
          This site is a non-commercial fan archive and is not affiliated with
          FC Bayern München AG. All marks and content are the property of their
          respective owners.
        </p>
      </div>
    </main>
  );
}
