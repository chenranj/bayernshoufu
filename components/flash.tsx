'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Check, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Flash() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'ok' | 'err'>('ok');

  const ok = params.get('saved');
  const err = params.get('error');

  useEffect(() => {
    if (!ok && !err) return;
    setKind(err ? 'err' : 'ok');
    setMessage(err || decodeURIComponent(ok ?? '') || 'Saved!');
    setShow(true);

    const sp = new URLSearchParams(params.toString());
    sp.delete('saved');
    sp.delete('error');
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

    const t = window.setTimeout(() => setShow(false), 2500);
    return () => window.clearTimeout(t);
  }, [ok, err, params, router, pathname]);

  if (!show) return null;

  return (
    <div className="fixed top-20 right-4 z-50 pointer-events-none">
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-2 px-4 py-3 border shadow-xl backdrop-blur animate-slide-up',
          kind === 'ok'
            ? 'bg-bayern-red text-white border-bayern-red'
            : 'bg-black text-white border-bayern-red'
        )}
      >
        {kind === 'ok' ? <Check size={16} /> : <AlertTriangle size={16} />}
        <span className="text-sm font-semibold uppercase tracking-widest">{message}</span>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="ml-2 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
