'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { Loader2, Check, X, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/notification-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChangeRequest {
  id: number;
  student_id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  status: string;
  created_at: string;
  student_name: string;
  register_number: string;
  field_label: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { requests, chatGroups, refreshRequests, isLoading } = useNotification();
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      // Updated path to use /v1
      await apiClient.post(`/v1/admin/requests/${id}?action=${action}`);
      toast.success(`Request ${action}d successfully`);
      refreshRequests();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || `Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
  };

  const router = useRouter(); 
  
  if (user?.role === 'super_admin') {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <h1 className="text-4xl font-bold text-gray-200 mb-4">404</h1>
            <p className="text-gray-500">Page not found</p>
            <Button variant="link" onClick={() => router.back()}>Go Back</Button>
        </div>
      );
  }

  if (user?.role !== 'admin' && user?.role !== 'coordinator') {
     return <div className="p-10 text-center">Unauthorized</div>;
  }

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const unreadChats = chatGroups.filter(g => (g.unread_count || 0) > 0);
  const totalNotifications = requests.length + unreadChats.length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold text-[#002147] flex items-center gap-2">
            <Bell className="h-6 w-6"/> Notifications
         </h1>
         <Badge variant="secondary">{totalNotifications} Total</Badge>
      </div>
      
      {totalNotifications === 0 ? (
         <Card className="text-center py-20 bg-gray-50/50 border-dashed">
            <CardContent>
               <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="bg-white p-4 rounded-full shadow-sm border border-gray-100">
                    <Bell className="h-10 w-10 opacity-40"/>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-600">No new notifications</p>
                    <p className="text-sm">You are all caught up! 🎉</p>
                  </div>
               </div>
            </CardContent>
         </Card>
      ) : (
         <div className="space-y-8">
            {/* Chat Notifications Section */}
            {unreadChats.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  Chat Messages <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">{unreadChats.length}</Badge>
                </h3>
                <div className="grid gap-4">
                  {unreadChats.map(group => (
                    <Card 
                      key={`chat-${group.id}`} 
                      className="cursor-pointer hover:border-primary/40 transition-all hover:shadow-md bg-white group"
                      onClick={() => router.push(`/dashboard/chat?groupId=${group.id}`)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border border-gray-100 group-hover:scale-105 transition-transform">
                            <AvatarImage src={group.image || `https://api.dicebear.com/7.x/initials/svg?seed=${group.name}`} />
                            <AvatarFallback>{group.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#002147]">{group.name}</span>
                              <Badge className="bg-primary hover:bg-primary">{group.unread_count} New</Badge>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {group.last_message || "New message received"}
                            </p>
                            <span className="text-xs text-gray-400">
                              {group.last_message_at ? formatDistanceToNow(new Date(group.last_message_at), { addSuffix: true }) : 'Recently'}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5">Open Chat</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Change Requests Section */}
            {requests.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  Student Requests <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">{requests.length}</Badge>
                </h3>
                <div className="space-y-4">
                  {requests.map(req => (
                    <Card key={`req-${req.id}`} className="bg-white border-gray-200">
                        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                          <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#002147]">{req.student_name}</span>
                                <span className="text-sm text-gray-500">({req.register_number})</span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Requested update for <span className="font-medium text-black">{req.field_label || req.field_name}</span>
                                <span className="text-gray-400 text-xs ml-2">• {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs uppercase font-bold text-gray-400">From</span>
                                    <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-100 line-through">
                                      {req.old_value || <span className="italic opacity-50">Empty</span>}
                                    </span>
                                </div>
                                <div className="hidden sm:block text-gray-300">→</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs uppercase font-bold text-gray-400">To</span>
                                    <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-100 font-semibold">
                                      {req.new_value}
                                    </span>
                                </div>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                              <Button 
                                size="sm" 
                                onClick={() => handleAction(req.id, 'approve')} 
                                disabled={!!processingId}
                                className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-initial"
                              >
                                {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4 mr-1"/>}
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleAction(req.id, 'reject')} 
                                disabled={!!processingId}
                                className="border-red-200 text-red-600 hover:bg-red-50 flex-1 md:flex-initial"
                              >
                                  <X className="h-4 w-4 mr-1"/> Deny
                              </Button>
                          </div>
                        </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
         </div>
      )}
    </div>
  );
}
