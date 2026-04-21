'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Users,
  Home,
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme-toggle';

interface SidebarProps {
  orgSlug: string;
  orgName: string;
}

const navItems = [
  { label: 'Dashboard', href: '', icon: Home },
  { label: 'Placements', href: '/placements', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ orgSlug, orgName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-950 text-white">
      {/* Logo & Org */}
      <div className="border-b border-white/[0.08] px-5 py-5">
        <Link href={`/${orgSlug}`} className="block">
          <Image
            src="/placd-mark.png"
            alt="Placd"
            width={120}
            height={40}
            className="h-8 w-auto mb-2"
          />
        </Link>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-slate-400 truncate">{orgName}</p>
          <ThemeToggle />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const href = `/${orgSlug}${item.href}`;
          const isActive = item.href === ''
            ? pathname === `/${orgSlug}` || pathname === `/${orgSlug}/`
            : pathname?.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-blue-600/20 to-teal-500/10 text-white border border-white/[0.08]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]',
              )}
            >
              <item.icon className={cn('h-4 w-4', isActive && 'text-blue-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-white/[0.08] px-3 py-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
