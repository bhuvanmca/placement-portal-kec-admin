'use client';
import { useAuth } from '@/context/auth-context';
import { Bell, ChevronDown, Building2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from 'react';

export default function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const getPageTitle = () => {
        if (pathname === '/dashboard') return 'Company Details';
        return 'Company Details';
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#002147]/10 rounded-lg">
                    <Building2 size={20} className="text-[#002147]" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-[#002147]">{getPageTitle()}</h1>
                    <p className="text-xs text-gray-500">KEC Placement Cell</p>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center space-x-3 focus:outline-none" suppressHydrationWarning>
                        <Avatar className="h-9 w-9 border border-gray-200">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.name || 'Admin'}&background=random`} />
                            <AvatarFallback>AD</AvatarFallback>
                        </Avatar>
                        <div className="hidden md:flex flex-col items-start text-sm">
                            <span className="font-medium text-gray-700">{user?.name || 'Admin'}</span>
                        </div>
                        <ChevronDown size={14} className="text-gray-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Profile</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={logout}>
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
