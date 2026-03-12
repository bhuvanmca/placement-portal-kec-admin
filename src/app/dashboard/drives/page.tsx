'use client';

import { useQuery } from '@tanstack/react-query';
import { DriveService } from '@/services/drive.service';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar, MapPin, DollarSign, ArrowRight, Search, Building2, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function DrivesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['drives-list', search],
    queryFn: () => DriveService.getDrives({ page: 1, limit: 100, search }),
  });

  const drives = data?.drives || [];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Placement Drives</h1>
          <p className="text-slate-500 mt-2 text-lg">Your next career adventure starts here. Filter and find the best fit.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search company or role..."
            className="pl-12 h-14 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-primary/20 text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
           {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {drives.length > 0 ? (
            drives.map((drive) => (
              <Card 
                key={drive.id} 
                className="group hover:shadow-2xl transition-all duration-500 border-none shadow-sm overflow-hidden rounded-[2.5rem] bg-white cursor-pointer"
                onClick={() => router.push(`/dashboard/drives/${drive.id}`)}
              >
                <div className="h-3 bg-gradient-to-r from-primary/80 to-blue-400" />
                <CardHeader className="pb-2 p-8">
                  <div className="flex justify-between items-start mb-6">
                     <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center p-3 border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                        {drive.logo_url ? (
                          <img src={drive.logo_url} alt={drive.company_name} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Building2 className="h-8 w-8 text-slate-300" />
                        )}
                     </div>
                     <Badge className={`${drive.status === 'open' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-400'} hover:bg-transparent border-none font-black px-4 py-1.5 rounded-full text-[10px]`}>
                       <Timer className="h-3 w-3 mr-1" />
                       {drive.status.toUpperCase()}
                     </Badge>
                  </div>
                  <CardTitle className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight mb-2">
                    {drive.company_name}
                  </CardTitle>
                  <p className="text-slate-500 font-bold text-sm">
                    {drive.roles.length > 0 ? drive.roles[0].role_name : 'Multiple Roles'}
                    {drive.roles.length > 1 && <span className="text-primary/60 ml-1">+{drive.roles.length - 1} others</span>}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 px-8 pb-4">
                   <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                         <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Package</span>
                         <span className="font-black text-slate-900 flex items-center">
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                            {drive.roles[0]?.ctc || 'N/A'}
                         </span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Batch</span>
                         <span className="font-black text-slate-900">{drive.batch_year || '2025'}</span>
                      </div>
                   </div>
                </CardContent>
                <CardFooter className="p-8 pt-4">
                  <Button 
                    className="w-full h-12 text-sm font-black rounded-2xl bg-slate-50 text-slate-900 border-none hover:bg-primary hover:text-white transition-all shadow-none group/btn" 
                  >
                    Explore Opportunity
                    <ArrowRight className="ml-2 h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-32 text-center bg-white rounded-3xl border border-dashed border-slate-200">
               <Briefcase className="h-20 w-20 text-slate-200 mx-auto mb-6" />
               <p className="text-2xl font-black text-slate-400">No placement drives found</p>
               <p className="text-slate-400 mt-2">Try adjusting your search criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
