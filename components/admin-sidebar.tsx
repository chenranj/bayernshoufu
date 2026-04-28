'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Calendar, Star, Shirt, Image as ImageIcon, Trophy } from 'lucide-react';

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/seasons', label: 'Seasons', icon: Calendar },
  { href: '/admin/competitions', label: 'Competitions', icon: Trophy },
  { href: '/admin/players', label: 'Players', icon: Star },
  { href: '/admin/jerseys', label: 'Jerseys', icon: Shirt },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="lg:w-56 lg:border-r lg:border-bayern-border lg:min-h-[calc(100dvh-4rem)] lg:py-6">
      <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 px-2 py-3 lg:px-3 border-b lg:border-b-0 border-bayern-border">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-widest font-semibold whitespace-nowrap transition-colors',
                active
                  ? 'bg-bayern-red text-white'
                  : 'text-bayern-muted hover:text-white hover:bg-bayern-surface'
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
