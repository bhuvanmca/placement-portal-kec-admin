'use client';
import { useAuth } from '@/context/auth-context';
import { useNotification } from '@/context/notification-context';
import { Bell, Search, ChevronDown, Slash, X } from 'lucide-react';
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
import { Badge } from "@/components/ui/badge";
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
  CommandShortcut,
} from "@/components/ui/command"
import { 
  Calendar, 
  Home, 
  Briefcase, 
  Users, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { getSidebarItems } from '@/constants/routes';

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

const SHORTCUT_MAP: Record<string, string> = {
  home: 'H',
  calendar: 'C',
  drives: 'D',
  students: 'S',  // S for Students? Or U? User prefers intuitive.
  users: 'U',     
  messages: 'M',
  analytics: 'A',
  activity: 'L',
  storage: 'B',
  settings: 'E', // Settings (S is taken by Students?) Or keep S for Settings and change Students?
  // Let's stick to:
  // Home: H
  // Manage Students: S (Students)
  // Drives: D
  // Calendar: C
  // Settings: E (sEttings) or , (comma)? 
  // User said "cmd s for settings".
  // Okay.
  // Students: U (Users)?
};

// Re-defining to match user request better
const GLOBAL_SHORTCUTS: Record<string, string> = {
    'home': 'H',
    'students': 'U', // Users
    'drives': 'D',
    'calendar': 'C',
    'settings': 'S', // Settings
    'storage': 'G', // G for StoraGe to avoid conflict with Settings
    'analytics': 'A',
    'activity': 'L',
    'users': 'U', // Super admin users
    'messages': 'E', // E for Exchange/Email (M is browser conflict)
};

const getShortcut = (id: string, label: string) => {
  return GLOBAL_SHORTCUTS[id] || label.charAt(0).toUpperCase();
};

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const router = useRouter(); 
  
  const { requests, unreadChatCount, totalUnreadCount, chatGroups, refreshRequests } = useNotification();
  const [collegeName, setCollegeName] = React.useState<string | null>(null);
  const [notifOpen, setNotifOpen] = React.useState(false);
  
  // Fetch College Name
  React.useEffect(() => {
    const fetchSettings = async () => {
        try {
            const { data } = await (await import('@/lib/api')).default.get('/v1/settings'); // Use API directly or service
             if (data.settings && data.settings.college_name) {
                setCollegeName(data.settings.college_name);
             }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        }
    };
    fetchSettings();
  }, []);

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

  // Global Shortcut Listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Enforce Shift + Meta/Ctrl to avoid browser conflicts
        if (!((e.metaKey || e.ctrlKey) && e.shiftKey)) return;
        
        // Ignore if focus is in an input/textarea (though for nav shortcuts, maybe we want them global? 
        // Standards say yes, unless it conflicts with native copy/paste. 
        // Our shortcuts are keys like H, U, D. Typically fine unless editing text.
        // Cmd+H hides window on Mac. We might override it? User said "cmd h for home".
        // Overriding browser/OS shortcuts is risky but requested.
        // Let's try.
        
        const role = user?.role || 'admin';
        const permissions = user?.permissions || [];
        const allItems = getSidebarItems(role, permissions);
        const key = e.key.toUpperCase();
        
        // Find item matching Key
        const target = allItems.find(item => getShortcut(item.id, item.label) === key);
        if (target) {
            e.preventDefault();
            router.push(target.href);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, router]);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  const fetchRequests = async () => {
    refreshRequests();
  };

  const handleRequestAction = async (id: number, action: 'approve' | 'reject', e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown close or navigation
    try {
        const { settingsService } = await import('@/services/settings.service');
        await settingsService.handleRequest(id, action);
        // import toast locally or use global if available. Assuming not available, so maybe just refresh.
        // Actually toast should be imported.
        // Let's rely on refresh.
        fetchRequests();
    } catch (error) {
        console.error("Action failed", error);
    }
  };

  const handleBatchAction = async (action: 'approve' | 'reject') => {
    try {
        const { settingsService } = await import('@/services/settings.service');
        await Promise.all(
            requests.map(req => settingsService.handleRequest(req.id, action))
        );
        fetchRequests();
    } catch (error) {
        console.error(`Batch ${action} failed`, error);
    }
  };

  const handleClearAll = () => {
    // Optional: Implement dismiss all logic in context if needed
  };

  const handleCloseNotification = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // In NotificationContext, we don't have a direct clear yet, 
    // but we can just ignore it for now or implement local hiding if critical.
    // For now, let's just refresh.
    refreshRequests();
  };
  
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

  // Calculate default value for CommandDialog
  const role = user?.role || 'admin';
  const permissions = user?.permissions || [];
  const allItems = getSidebarItems(role, permissions);
  const currentItem = allItems.find(i => i.href === pathname);
  // Default to current page label if found, otherwise 'Home' or first item?
  // User said: "if none ... highlight the current page option".
  const defaultCommandValue = currentItem ? currentItem.label : undefined;


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
        {/* Role Badge */}
        <div className="hidden md:flex">
             <span className={`text-[10px] font-semibold px-2 py-1 rounded-full leading-none border ${
              user?.role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-200' :
              user?.role === 'coordinator' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {user?.role === 'super_admin' ? 'Super Admin' :
               user?.role === 'coordinator' ? `Coordinator${user?.department_code ? ` — ${user.department_code}` : ''}` :
               'Admin'}
            </span>
        </div>

        {/* Search Bar */}
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
          <CommandDialog 
            open={open} 
            onOpenChange={setOpen}
            commandProps={{
                defaultValue: defaultCommandValue
            }}
          >
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {(() => {
                const settingsItem = allItems.find(i => i.id === 'settings');
                const navItems = allItems.filter(i => i.id !== 'settings');

                return (
                  <>
                    <CommandGroup heading="Pages">
                      {navItems.map((item) => {
                        const shortcut = getShortcut(item.id, item.label);
                        return (
                          <CommandItem
                            key={item.id}
                            value={item.label} 
                            onSelect={() => runCommand(() => router.push(item.href))}
                          >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.label}</span>
                            <CommandShortcut>⇧⌘{shortcut}</CommandShortcut>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                    <CommandGroup heading="Settings">
                      {settingsItem && (
                         <CommandItem
                            key={settingsItem.id}
                            value={settingsItem.label}
                            onSelect={() => runCommand(() => router.push(settingsItem.href))}
                         >
                            <settingsItem.icon className="mr-2 h-4 w-4" />
                            <span>{settingsItem.label}</span>
                            <CommandShortcut>⇧⌘S</CommandShortcut>
                         </CommandItem>
                      )}
                      <CommandItem onSelect={() => runCommand(() => logout())} value="Logout">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                );
              })()}
            </CommandList>
          </CommandDialog>
        </div>

        <div className="flex items-center space-x-4">
          {user?.role !== 'super_admin' && (
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
                <button 
                    className="relative p-2 text-gray-500 hover:bg-primary/5 rounded-full transition-all focus:outline-none group"
                    onMouseEnter={() => setNotifOpen(true)}
                >
                    <Bell size={20} className={notifOpen ? "text-primary scale-110" : "group-hover:text-primary transition-all"} />
                    {totalUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white tabular-nums">
                            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                className="w-80 p-0 mr-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-200 border-gray-100 shadow-none border bg-white" 
                align="end"
                onMouseLeave={() => setNotifOpen(false)}
            >
                <div className="p-3 font-semibold border-b flex justify-between items-center bg-gray-50">
                    <span>Notifications</span>
                    {requests.length > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{requests.length} New</span>}
                </div>
                
                {/* Batch Action Buttons */}
                {requests.length > 0 && (
                    <div className="p-2 border-b bg-gray-50 flex gap-2">
                        <Button 
                            size="sm" 
                            variant="default" 
                            className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBatchAction('approve');
                            }}
                        >
                            Approve All
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBatchAction('reject');
                            }}
                        >
                            Deny All
                        </Button>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            className="flex-1 h-7 text-xs text-gray-600 hover:bg-gray-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClearAll();
                            }}
                        >
                            Clear All
                        </Button>
                    </div>
                )}

                <div className="max-h-[500px] overflow-y-auto p-3 space-y-3">
                    {totalUnreadCount === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            <div className="bg-primary/5 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Bell className="h-6 w-6 text-primary/30" />
                            </div>
                            No new notifications
                        </div>
                    ) : (
                        <>
                            {/* Chat Notifications */}
                            {chatGroups.filter(g => (g.unread_count || 0) > 0).map((group) => (
                                <div 
                                    key={`chat-${group.id}`} 
                                    className="p-3 bg-primary/5 border border-primary/10 rounded-xl hover:bg-primary/[0.08] transition-all cursor-pointer group/item"
                                    onClick={() => {
                                        setNotifOpen(false);
                                        router.push(`/dashboard/chat?groupId=${group.id}`);
                                    }}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                            <AvatarImage src={group.image || `https://api.dicebear.com/7.x/initials/svg?seed=${group.name}`} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{group.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-900 truncate">{group.name}</span>
                                                <Badge className="h-4 px-1.5 text-[9px] bg-primary border-none text-white uppercase tracking-wider font-extrabold">
                                                    {group.unread_count} New
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                                                {group.last_message || "New message received"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-gray-400 text-right font-medium">
                                        {group.last_message_at ? new Date(group.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                </div>
                            ))}

                            {/* Request Notifications */}
                            {requests.map((req) => (
                                <div 
                                    key={`req-${req.id}`} 
                                    className="relative p-3 bg-white border border-gray-100 rounded-xl hover:border-primary/20 hover:bg-primary/[0.02] transition-all group/req"
                                >
                                    {/* Close Button */}
                                    <button
                                        className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover/req:opacity-100"
                                        onClick={(e) => handleCloseNotification(req.id, e)}
                                        title="Dismiss"
                                    >
                                        <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                                    </button>

                                    {/* Content */}
                                    <div 
                                        className="cursor-pointer pr-6"
                                        onClick={() => {
                                            setNotifOpen(false);
                                            router.push(`/dashboard/students/${req.register_number}?highlight=${req.field_name}`);
                                        }}
                                    >
                                        <div className="flex items-start justify-between mb-1.5">
                                            <span className="text-sm font-bold text-primary">{req.student_name || req.register_number}</span>
                                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">{new Date(req.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-3 font-medium">
                                            Requested update for <span className="text-gray-900 font-bold">{req.field_label || req.field_name}</span>
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="default" 
                                            className="flex-1 h-8 text-[11px] font-bold bg-green-600 hover:bg-green-700 border-none shadow-none"
                                            onClick={(e) => handleRequestAction(req.id, 'approve', e)}
                                        >
                                            Approve
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="flex-1 h-8 text-[11px] font-bold border-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700 hover:border-red-100 bg-white"
                                            onClick={(e) => handleRequestAction(req.id, 'reject', e)}
                                        >
                                            Deny
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
                <div className="p-2 border-t bg-gray-50 text-center">
                    <Button 
                        variant="link" 
                        size="sm" 
                        className="text-xs text-blue-600 w-full"
                        onClick={() => router.push('/dashboard/settings/notifications')}
                    >
                        View All Notifications
                    </Button>
                </div>
            </DropdownMenuContent>
          </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-3 focus:outline-none" suppressHydrationWarning>
              <Avatar className="h-9 w-9 border border-gray-200">
                <AvatarImage src={user?.profile_photo_url || `https://ui-avatars.com/api/?name=${user?.name || 'Admin'}&background=random`} />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-sm">
                <span className="font-medium text-gray-700">{user?.name || 'Admin'}</span>
                <div className="flex flex-col items-start gap-0.5">
                  {/* College Name */}
                  {collegeName && (
                     <span className="text-[10px] text-gray-400 leading-tight truncate max-w-[150px]" title={collegeName}>
                        {collegeName}
                     </span>
                  )}
                </div>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings/account')} className="cursor-pointer">
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50" onClick={logout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
