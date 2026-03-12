'use client';

import { useQuery } from '@tanstack/react-query';
import { DriveService } from '@/services/drive.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Briefcase, CheckCircle, Clock, Users, ArrowRight, Bell, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const router = useRouter();
  
  const { data, isLoading } = useQuery({
    queryKey: ['drives', 'recent'],
    queryFn: () => DriveService.getDrives({ page: 1, limit: 10 }),
  });

  const drives = data?.drives || [];
  const appliedCount = drives.filter(d => d.user_status === 'applied' || d.user_status === 'placed').length;
  const placedCount = drives.filter(d => d.user_status === 'placed').length;

  const stats = [
    { name: 'Active Drives', value: data?.total || 0, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Your Applications', value: appliedCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Successfully Placed', value: placedCount, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Avg. CTC', value: '6.5 LPA', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">KEC Placement Portal</h1>
          <p className="text-slate-500 mt-2 text-lg">Your gateway to dream careers. Stay ahead, stay placed.</p>
        </div>
        <Button onClick={() => router.push('/dashboard/profile')} className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105">
           Update Profile
           <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden group">
            <CardContent className="flex items-center p-8">
              <div className={`${stat.bg} p-4 rounded-2xl mr-5 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.name}</p>
                <p className="text-3xl font-black text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <CardTitle className="text-2xl font-black text-slate-800">Recent Opportunities</CardTitle>
            <Button variant="ghost" className="text-primary font-bold hover:bg-primary/5 rounded-xl" onClick={() => router.push('/dashboard/drives')}>
               View All
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                 {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse" />)}
              </div>
            ) : drives && drives.length > 0 ? (
              <div className="space-y-4">
                {drives.slice(0, 5).map((drive) => (
                  <div 
                    key={drive.id} 
                    className="group flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all cursor-pointer"
                    onClick={() => router.push(`/dashboard/drives/${drive.id}`)}
                  >
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center p-2 border border-slate-100 group-hover:scale-105 transition-transform">
                          <Building2 className="text-slate-400" />
                       </div>
                       <div>
                         <p className="font-black text-slate-900 group-hover:text-primary transition-colors">{drive.company_name}</p>
                         <p className="text-sm text-slate-500 font-medium">{drive.roles[0]?.role_name || 'Multiple Roles'}</p>
                       </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                       <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-bold">
                          {drive.roles[0]?.ctc || 'N/A'}
                       </Badge>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          Deadline: {new Date(drive.deadline_date).toLocaleDateString()}
                       </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 grayscale opacity-50">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 italic">No active drives found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl p-4 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-2">
               <Bell className="h-5 w-5 text-primary" />
               Latest Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
               <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                  <p className="text-primary text-[10px] font-black uppercase mb-1">New Announcement</p>
                  <p className="font-bold text-sm">Resume validation started for Microsoft Drive.</p>
                  <p className="text-white/40 text-[10px] mt-2">2 hours ago</p>
               </div>
               <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer opacity-70">
                  <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Update</p>
                  <p className="font-bold text-sm">Cognizant interview results uploaded.</p>
                  <p className="text-white/40 text-[10px] mt-2">Yesterday</p>
               </div>
               <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-black h-12" onClick={() => router.push('/dashboard/notifications')}>
                  View All Notifications
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
