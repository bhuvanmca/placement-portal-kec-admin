import { 
  Calendar, 
  Home, 
  Zap, 
  Briefcase, 
  Users, 
  MessageSquare, 
  BarChart2, 
  Settings 
} from 'lucide-react';

export const APP_ROUTES = {
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  SIGNUP: '/signup', // Kept for reference, though unused
};

export const SIDEBAR_ITEMS = [
  { id: 'calendar', icon: Calendar, label: 'Calendar', href: '/dashboard/calendar' },
  { id: 'home', icon: Home, label: 'Home', href: '/dashboard' },
  { id: 'drives', icon: Briefcase, label: 'Drives', href: '/dashboard/drives' },
  { id: 'students', icon: Users, label: 'Students', href: '/dashboard/students' },
  { id: 'messages', icon: MessageSquare, label: 'Messages', href: '/dashboard/messages' },
  { id: 'analytics', icon: BarChart2, label: 'Analytics', href: '/dashboard/analytics' },
  { id: 'settings', icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];
