'use client';

import Link from 'next/link';
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
    <aside className="flex h-full w-64 flex-col border-r bg-white">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">Placd</h1>
        <p className="text-sm text-muted-foreground">{orgName}</p>
      </div>
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
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-3 py-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
