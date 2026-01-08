'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LogOut 
} from 'lucide-react';
import { SIDEBAR_ITEMS } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  
  const sidebarItems = SIDEBAR_ITEMS;

  return (
    <div className="flex flex-col h-screen w-16 bg-[#2c3e50] items-center py-4 space-y-4">
      {sidebarItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link 
            key={item.id} 
            href={item.href}
            className={cn(
              "p-3 rounded-lg transition-colors duration-200 text-gray-300 hover:bg-[#34495e] hover:text-white",
              isActive && "bg-[#3498db] text-white"
            )}
            title={item.label}
          >
            <item.icon size={20} />
          </Link>
        );
      })}
      
      <div className="mt-auto pt-4 border-t border-gray-600 w-full flex justify-center">
        <button 
          onClick={logout}
          className="p-3 rounded-lg transition-colors duration-200 text-red-400 hover:bg-[#34495e] hover:text-red-300"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
}
