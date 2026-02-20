'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LogOut 
} from 'lucide-react';
import { getSidebarItems } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import apiClient from '@/lib/api';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'SA', color: 'bg-red-500' },
  admin: { label: 'AD', color: 'bg-blue-500' },
  coordinator: { label: 'CO', color: 'bg-emerald-500' },
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, collegeSettings } = useAuth();
  
  const logoUrl = collegeSettings.college_logo_url;
  const collegeName = collegeSettings.college_name;
  
  const role = user?.role || 'admin';
  const permissions = user?.permissions || [];
  const sidebarItems = getSidebarItems(role, permissions);
  const roleInfo = ROLE_LABELS[role] || { label: 'AD', color: 'bg-blue-500' };

  return (
    <div className="flex flex-col h-screen w-16 bg-sidebar items-center py-4 space-y-4 border-r border-sidebar-border/10">
      {/* College Logo or Role Badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
             {logoUrl ? (
                <div className="w-10 h-10 rounded-sm bg-white p-1 shadow-md overflow-hidden flex items-center justify-center">
                   <img src={logoUrl} alt="College Logo" className="w-full h-full object-contain" />
                </div>
             ) : (
                <div className={cn(
                  "w-9 h-9 rounded-sm flex items-center justify-center text-white text-xs font-bold shadow-md",
                  roleInfo.color
                )}>
                  {roleInfo.label}
                </div>
             )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{collegeName || (user?.name || role.replace('_', ' '))}</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-8 border-t border-sidebar-foreground/20" />

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
