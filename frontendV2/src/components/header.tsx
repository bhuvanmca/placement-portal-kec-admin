'use client';
import { useAuth } from '@/context/auth-context';
import { Bell, Search, ChevronDown, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center space-x-4">
        {/* Logo or Breadcrumbs */}
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-semibold text-gray-900">Drives</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-[#3498db] font-medium">New Drive</span>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="relative w-64 hidden md:block">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
           <Input 
             type="text" 
             placeholder="Search... (Ctrl+K)" 
             className="pl-9 h-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
           />
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <Bell size={20} />
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-3 focus:outline-none">
              <Avatar className="h-9 w-9 border border-gray-200">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.name || 'Admin'}&background=random`} />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-sm">
                <span className="font-medium text-gray-700">{user?.name || 'Admin'}</span>
                {/* <span className="text-xs text-gray-500">{user?.role || 'Administrator'}</span> */}
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={logout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
