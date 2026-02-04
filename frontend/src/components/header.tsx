'use client';
import { useAuth } from '@/context/auth-context';
import { Bell, Search, ChevronDown, Slash } from 'lucide-react';
import { usePathname } from 'next/navigation';
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { 
  Calendar, 
  Home, 
  Briefcase, 
  Users, 
  Settings, 
  LogOut 
} from 'lucide-react';

// Map route segments to readable labels
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Home',
  students: 'Manage Students',
  drive: 'Drives',
  create: 'New Drive',
  quick: 'Quick Drive',
  calendar: 'Calendar',
  messages: 'Messages',
  analytics: 'Analytics',
  settings: 'Settings',
};

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const router = useRouter(); // We need to import useRouter from next/navigation

  // Toggle with Ctrl+K or Cmd+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    
    // If we are just at /dashboard, show only Home
    if (segments.length === 1 && segments[0] === 'dashboard') {
      return (
        <BreadcrumbItem>
          <BreadcrumbPage>Home</BreadcrumbPage>
        </BreadcrumbItem>
      );
    }

    return segments.map((segment, index) => {
      const isLast = index === segments.length - 1;
      const href = `/${segments.slice(0, index + 1).join('/')}`;
      const label = ROUTE_LABELS[segment.toLowerCase()] || segment.charAt(0).toUpperCase() + segment.slice(1);

      return (
        <React.Fragment key={href}>
          <BreadcrumbItem>
            {isLast ? (
              <BreadcrumbPage>{label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {!isLast && <BreadcrumbSeparator />}
        </React.Fragment>
      );
    });
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center space-x-4">
        <Breadcrumb>
          <BreadcrumbList>
            {generateBreadcrumbs()}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center space-x-6">
        <div className="relative w-64 hidden md:block">
           <Button
            variant="outline"
            className={cn(
              "relative h-9 w-64 justify-start bg-gray-50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12",
            )}
            onClick={() => setOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Search...</span>
            <kbd className="pointer-events-none absolute right-[0.3rem] top-[50%] translate-y-[-50%] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
                  <Home className="mr-2 h-4 w-4" />
                  <span>Home</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/students'))}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Manage Students</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/drive/create'))}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>New Drive</span>
                </CommandItem>
                 <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/calendar'))}>
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Calendar</span>
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Settings">
                 <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/settings'))}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => logout())}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
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
