'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationService } from '@/services/notification.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  BellOff, 
  Trash2, 
  Clock, 
  CheckCheck,
  MoreVertical,
  Circle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => NotificationService.getNotifications(),
  });

  const clearAllMutation = useMutation({
    mutationFn: () => NotificationService.clearAll(),
    onSuccess: () => {
      toast.success('All notifications cleared');
      queryClient.setQueryData(['notifications'], []);
    },
    onError: () => toast.error('Failed to clear notifications')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => NotificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">Stay updated with the latest drive announcements</p>
        </div>
        {notifications && notifications.length > 0 && (
          <Button 
            variant="ghost" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold"
            onClick={() => {
              if (confirm('Clear all notification history?')) {
                clearAllMutation.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-20 text-center">Loading notifications...</div>
      ) : !notifications || notifications.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 shadow-none rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center py-24 grayscale opacity-50">
             <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <BellOff className="h-10 w-10 text-slate-300" />
             </div>
             <p className="text-2xl font-black text-slate-400">No notifications yet</p>
             <p className="text-slate-400 mt-2">We'll notify you when there's something important</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notifications.map((notif) => (
            <Card 
              key={notif.id} 
              className={`border-none shadow-sm transition-all hover:shadow-md rounded-3xl overflow-hidden ${!notif.isRead ? 'bg-white border-l-4 border-l-primary' : 'bg-slate-50/50'}`}
              onClick={() => !notif.isRead && markReadMutation.mutate(notif.id)}
            >
              <CardContent className="p-6">
                <div className="flex gap-6 items-start">
                   <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${!notif.isRead ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                      <Bell className="h-6 w-6" />
                   </div>
                   <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                         <h3 className={`text-xl font-bold ${!notif.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                           {notif.title}
                         </h3>
                         {!notif.isRead && <Circle className="h-3 w-3 fill-primary text-primary" />}
                      </div>
                      <p className={`text-base leading-relaxed ${!notif.isRead ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                        {notif.body}
                      </p>
                      <div className="flex items-center gap-4 pt-3">
                         <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                            <Clock className="h-3 w-3" />
                            {format(new Date(notif.sentTime), 'MMM d, h:mm a')}
                         </span>
                         {notif.isRead && (
                           <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                              <CheckCheck className="h-3 w-3" />
                              Seen
                           </span>
                         )}
                      </div>
                   </div>
                   <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 rounded-xl" onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(notif.id);
                   }}>
                      <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
