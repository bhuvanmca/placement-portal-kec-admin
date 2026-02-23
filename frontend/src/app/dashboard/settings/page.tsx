'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;

    const lastTab = localStorage.getItem('lastSettingsTab');
    if (lastTab) {
      router.push(lastTab);
      return;
    }

    if (user.role === 'super_admin') {
      router.push('/dashboard/settings/college');
    } else if (user.role === 'admin') {
      router.push('/dashboard/settings/spocs');
    } else {
      router.push('/dashboard/settings/account');
    }
  }, [router, user, isLoading]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-2">
         <div className="w-8 h-8 border-4 border-[#002147] border-t-transparent rounded-full animate-spin"></div>
         <p className="text-muted-foreground text-sm">Redirecting...</p>
      </div>
    </div>
  );
}
