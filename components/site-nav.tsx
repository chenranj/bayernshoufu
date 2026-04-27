'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Heart, User, Shield, Home, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/jerseys', label: 'Jerseys', icon: Home },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/account', label: 'Account', icon: User },
];

export function SiteNav({
  email,
  displayName,
  isAdmin,
}: {
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-bayern-border sticky top-0 bg-black/95 backdrop-blur z-40">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/jerseys" className="flex items-center gap-2.5 group">
          <div className="w-2.5 h-8 bg-bayern-red transition-all group-hover:h-9" />
          <span className="font-display text-xl tracking-tightest uppercase">Bayernshofu</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-4 py-2 text-sm uppercase tracking-widest font-semibold flex items-center gap-2 transition-colors',
                pathname.startsWith(href)
                  ? 'text-white border-b-2 border-bayern-red'
                  : 'text-bayern-muted hover:text-white'
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'px-4 py-2 text-sm uppercase tracking-widest font-semibold flex items-center gap-2 transition-colors',
                pathname.startsWith('/admin')
                  ? 'text-bayern-red border-b-2 border-bayern-red'
                  : 'text-bayern-red/70 hover:text-bayern-red'
              )}
            >
              <Shield size={14} />
              Admin
            </Link>
          )}
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="px-4 py-2 text-sm uppercase tracking-widest font-semibold text-bayern-muted hover:text-white flex items-center gap-2"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </form>
        </nav>

        <button
          type="button"
          className="md:hidden text-white"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-bayern-border bg-black">
          <div className="px-4 py-4 flex flex-col gap-1">
            <p className="text-xs text-bayern-muted px-3 mb-2">{displayName || email}</p>
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'px-3 py-3 text-sm uppercase tracking-widest font-semibold flex items-center gap-3',
                  pathname.startsWith(href)
                    ? 'bg-bayern-surface text-white'
                    : 'text-bayern-muted'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="px-3 py-3 text-sm uppercase tracking-widest font-semibold text-bayern-red flex items-center gap-3"
              >
                <Shield size={16} /> Admin
              </Link>
            )}
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="w-full text-left px-3 py-3 text-sm uppercase tracking-widest font-semibold text-bayern-muted flex items-center gap-3"
              >
                <LogOut size={16} /> Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
