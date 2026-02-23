'use client';

import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Building2, Users, Settings as SettingsIcon, UserCog, FileEdit, FileText, GraduationCap, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsNavItems = [
  {
    name: 'College Profile',
    href: '/dashboard/settings/college',
    icon: Building2,
    roles: ['super_admin'],
  },
  {
    name: 'Account Settings',
    href: '/dashboard/settings/account',
    icon: SettingsIcon,
    roles: ['super_admin', 'admin', 'coordinator'],
  },
  {
    name: 'Notifications',
    href: '/dashboard/settings/notifications',
    icon: Bell,
    roles: ['admin'],
  },
  {
    name: 'SPOC Management',
    href: '/dashboard/settings/spocs',
    icon: UserCog,
    roles: ['admin'],
  },
  {
    name: 'Student Fields',
    href: '/dashboard/settings/student-fields',
    icon: Users,
    roles: ['admin'],
  },
  {
    name: 'Academic Config',
    href: '/dashboard/settings/academic',
    icon: GraduationCap,
    roles: ['admin'],
  },
  {
    name: 'Eligibility Templates',
    href: '/dashboard/settings/eligibility',
    icon: FileEdit,
    roles: ['admin'],
  },
  {
    name: 'Broadcast Templates',
    href: '/dashboard/settings/templates',
    icon: FileText,
    roles: ['admin'],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    if (pathname && pathname !== '/dashboard/settings') {
      localStorage.setItem('lastSettingsTab', pathname);
    }
  }, [pathname]);

  const userRole = user?.role || '';

  const filteredItems = settingsNavItems.filter(item => item.roles.includes(userRole));

  // Route Protection: basic check to ensure user doesn't access unauthorized tab
  // We can't easily check children props here during render for redirection, 
  // but we can check if the current pathname is allowed.
  
  // Find which item corresponds to current path
  // This is a bit loose but works for the tab structure
  // We skip this check for the root /settings since page.tsx handles that redirect
  if (pathname !== '/dashboard/settings') {
     const currentItem = settingsNavItems.find(item => pathname.startsWith(item.href));
     if (currentItem && !currentItem.roles.includes(userRole)) {
        // Unauthorized access - redirect to their default
        return (
          <div className="flex h-full items-center justify-center bg-gray-50 text-center p-8">
             <div className="max-w-lg space-y-4">
                <h2 className="text-xl text-slate-600">You need to be an admin or a coordinator to use this page</h2>
                <Link 
                   href="/dashboard/settings" 
                   className="inline-block bg-[#002147] text-white px-4 py-2 rounded-md hover:bg-[#002147]/90"
                >
                   Go to Settings
                </Link>
             </div>
          </div>
        )
     }
  }

  return (
    <div className="flex h-full bg-gray-50/50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 space-y-2">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#002147] px-3">Settings</h2>
        </div>
        
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#002147] hover:bg-gray-100 hover:text-slate-500 text-white hover:text-slate-700'
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
