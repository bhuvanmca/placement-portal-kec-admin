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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  
  const sidebarItems = SIDEBAR_ITEMS;

  return (
    <div className="flex flex-col h-screen w-16 bg-sidebar items-center py-4 space-y-4 border-r border-sidebar-border/10">
      {sidebarItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <Link 
                href={item.href}
                className={cn(
                  "p-3 rounded-lg transition-all duration-200",
                  !isActive && "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  isActive && "bg-background text-sidebar-primary-foreground shadow-md hover:opacity-50"
                )}
              >
                <item.icon size={20} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
      
      <div className="mt-auto pt-4 border-t border-sidebar-foreground/20 w-full flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={logout}
              className="p-3 rounded-lg transition-colors duration-200 text-red-300 hover:bg-sidebar-accent hover:text-red-200"
            >
              <LogOut size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Logout</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
