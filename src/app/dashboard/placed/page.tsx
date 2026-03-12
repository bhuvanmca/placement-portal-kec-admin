'use client';

import { useQuery } from '@tanstack/react-query';
import { DriveService } from '@/services/drive.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Trophy, 
  Building2, 
  DollarSign, 
  MapPin, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PlacedPage() {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const { data: drivesResponse, isLoading } = useQuery({
    queryKey: ['drives', 'placed'],
    queryFn: () => DriveService.getDrives({ page: 1, limit: 100 }), // Get many to filter
  });

  const placedDrives = drivesResponse?.drives?.filter(d => d.user_status === 'placed') || [];
  
  const filteredDrives = placedDrives.filter(d => 
    d.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.roles && d.roles[0]?.role_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3">
             <Trophy className="h-10 w-10 text-amber-500" />
             Placed Drives
          </h1>
          <p className="text-slate-500 mt-1">Companies where you've successfully secured a position</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search companies..."
            className="pl-10 h-12 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-20 text-center">Loading your achievements...</div>
      ) : placedDrives.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-24">
             <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Trophy className="h-10 w-10 text-slate-300" />
             </div>
             <p className="text-2xl font-black text-slate-400">No placed drives yet</p>
             <p className="text-slate-400 mt-2">Keep applying and preparing, your time will come!</p>
          </CardContent>
        </Card>
      ) : filteredDrives.length === 0 ? (
        <div className="p-20 text-center text-slate-400">No matching companies found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrives.map((drive) => (
            <Card 
              key={drive.id} 
              className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden rounded-3xl"
              onClick={() => router.push(`/dashboard/drives/${drive.id}`)}
            >
              <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400" />
              <CardHeader className="pb-2">
                 <div className="flex justify-between items-start">
                    <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center p-2 border border-slate-100 group-hover:scale-110 transition-transform">
                       {drive.logo_url ? (
                         <img src={drive.logo_url} alt={drive.company_name} className="max-h-full max-w-full object-contain" />
                       ) : (
                         <Building2 className="h-8 w-8 text-slate-300" />
                       )}
                    </div>
                    <Badge className="bg-emerald-500 text-white border-none font-bold px-3 py-1 flex items-center gap-1">
                       <Sparkles className="h-3 w-3" />
                       PLACED
                    </Badge>
                 </div>
                 <CardTitle className="text-2xl font-black mt-4 text-slate-900 group-hover:text-emerald-600 transition-colors">
                    {drive.company_name}
                 </CardTitle>
                 <p className="text-slate-500 font-bold">{drive.roles[0]?.role_name || 'N/A'}</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                       <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Package</p>
                       <p className="font-black text-slate-700 flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                          {drive.roles[0]?.ctc || 'N/A'}
                       </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                       <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Type</p>
                       <p className="font-black text-slate-700 flex items-center gap-1 uppercase">
                          {drive.drive_type}
                       </p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                       <MapPin className="h-4 w-4 text-slate-300" />
                       {drive.location || 'On-campus'}
                    </span>
                    <span className="flex items-center gap-1.5">
                       <Calendar className="h-4 w-4 text-slate-300" />
                       {new Date(drive.deadline_date).toLocaleDateString()}
                    </span>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
