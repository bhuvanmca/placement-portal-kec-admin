'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Users, Settings as SettingsIcon, UserCog, FileEdit, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsNavItems = [
  {
    name: 'College Profile',
    href: '/dashboard/settings/college',
    icon: Building2,
  },
  {
    name: 'SPOC Management',
    href: '/dashboard/settings/spocs',
    icon: UserCog,
  },
  {
    name: 'Student Fields',
    href: '/dashboard/settings/student-fields',
    icon: Users,
  },
  {
    name: 'Account Settings',
    href: '/dashboard/settings/account',
    icon: SettingsIcon,
  },
  {
    name: 'Platform Settings',
    href: '/dashboard/settings/platform',
    icon: FileEdit,
  },
  {
    name: 'Placement Policy',
    href: '/dashboard/settings/policy',
    icon: FileText,
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full bg-gray-50/50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 space-y-2">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#002147] px-3">Settings</h2>
        </div>
        
        <nav className="space-y-1">
          {settingsNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#002147] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
