'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, User, Bell, LayoutDashboard, LogOut, CheckCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AuthService } from '@/services/auth.service';
import { toast } from 'sonner';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Drives', href: '/dashboard/drives', icon: Briefcase },
  { name: 'Placed', href: '/dashboard/placed', icon: CheckCircle },
  { name: 'Requests', href: '/dashboard/requests', icon: Send },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await AuthService.logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold text-primary">KEC Portal</span>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 px-4',
              pathname === item.href ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-slate-600'
            )}
            onClick={() => router.push(item.href)}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Button>
        ))}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
