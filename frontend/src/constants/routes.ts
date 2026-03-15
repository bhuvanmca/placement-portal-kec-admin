import { 
  Calendar, 
  Home, 
  Briefcase, 
  Users, 
  MessageSquare, 
  BarChart2, 
  HardDrive,
  Settings,
  Shield,
  Activity,
  UserCog,
  Contact,
  LucideIcon
} from 'lucide-react';
import { UserRole } from '@/types/auth';

export const APP_ROUTES = {
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  SIGNUP: '/signup', // Kept for reference, though unused
};

export interface SidebarItem {
  id: string;
  icon: LucideIcon;
  label: string;
  href: string;
  /** Which roles can see this item. If undefined, all roles can see it. */
  allowedRoles?: UserRole[];
  /** If set, the user must have this permission to see the item. */
  requiredPermission?: string;
}

// Sidebar items visible to admin and coordinator
const ADMIN_ITEMS: SidebarItem[] = [
  { id: 'calendar', icon: Calendar, label: 'Calendar', href: '/dashboard/calendar' },
  { id: 'home', icon: Home, label: 'Home', href: '/dashboard' },
  { id: 'drives', icon: Briefcase, label: 'Drives', href: '/dashboard/drives', requiredPermission: 'manage_drives' },
  { id: 'students', icon: Users, label: 'Students', href: '/dashboard/students', requiredPermission: 'manage_students' },
  { id: 'messages', icon: MessageSquare, label: 'Chat', href: '/dashboard/chat' },
  { id: 'analytics', icon: BarChart2, label: 'Analytics', href: '/dashboard/analytics', requiredPermission: 'view_analytics' },

  { id: 'settings', icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

// Sidebar items visible only to super_admin
const SUPER_ADMIN_ITEMS: SidebarItem[] = [
  { id: 'home', icon: Home, label: 'Home', href: '/dashboard' },
  { id: 'users', icon: UserCog, label: 'Users', href: '/dashboard/users' },
  { id: 'spocs', icon: Contact, label: 'SPOCs', href: '/dashboard/spocs' },
  { id: 'activity', icon: Activity, label: 'Activity Log', href: '/dashboard/activity' },
  { id: 'settings', icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  { id: 'storage', icon: HardDrive, label: 'Storage', href: '/dashboard/storage' },
];

/**
 * Returns the sidebar items filtered by user role and permissions.
 */
export function getSidebarItems(role: UserRole, permissions: string[] = []): SidebarItem[] {
  if (role === 'super_admin') {
    return SUPER_ADMIN_ITEMS;
  }

  return ADMIN_ITEMS.filter(item => {
    // Check role restriction
    if (item.allowedRoles && !item.allowedRoles.includes(role)) {
      return false;
    }
    // Check permission restriction
    if (item.requiredPermission && !permissions.includes(item.requiredPermission)) {
      return false;
    }
    return true;
  });
}

// Keep legacy export for backwards compat (will show all items)
export const SIDEBAR_ITEMS = ADMIN_ITEMS;
