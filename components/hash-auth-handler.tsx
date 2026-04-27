'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Catches Supabase implicit-flow tokens in the URL hash
 * (legacy invite/recovery emails put #access_token=...&type=invite there).
 * Sets the session, clears the hash, and routes to the right next page.
 */
export function HashAuthHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (!accessToken || !refreshToken) return;

    (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      // Strip the hash so it doesn't re-trigger / leak in logs
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      if (error) return;

      const target = type === 'invite' || type === 'recovery' ? '/auth/set-password' : '/jerseys';
      router.replace(target);
      router.refresh();
    })();
  }, [router]);

  return null;
}
