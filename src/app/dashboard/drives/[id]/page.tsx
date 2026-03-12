'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DriveService } from '@/services/drive.service';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar, MapPin, DollarSign, ArrowLeft, Info, CheckCircle2, Globe, Building2, Users, FileText, LayoutList, History } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

export default function DriveDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  const { data: drive, isLoading } = useQuery({
    queryKey: ['drive', id],
    queryFn: () => DriveService.getDriveById(Number(id)),
  });

  const applyMutation = useMutation({
    mutationFn: () => DriveService.applyForDrive(Number(id), selectedRoles),
    onSuccess: () => {
      toast.success('Successfully applied for the drive!');
      queryClient.invalidateQueries({ queryKey: ['drive', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to apply');
    },
  });

  const requestMutation = useMutation({
    mutationFn: () => DriveService.requestToAttend(Number(id), selectedRoles),
    onSuccess: () => {
      toast.success('Request to attend submitted!');
      queryClient.invalidateQueries({ queryKey: ['drive', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit request');
    },
  });

  if (isLoading) return <div className="flex justify-center p-20">Loading drive details...</div>;
  if (!drive) return <div className="p-20 text-center">Drive not found.</div>;

  const isApplied = drive.user_status === 'applied';
  const isPending = drive.user_status === 'pending';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Button variant="ghost" className="mb-4 gap-2 hover:bg-slate-100" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back to Drives
      </Button>

      <div className="flex flex-col md:flex-row gap-6 items-start justify-between bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
         <div className="flex items-start gap-6">
            <div className="bg-slate-100 h-24 w-24 rounded-2xl flex items-center justify-center p-4 border border-slate-200">
               {drive.logo_url ? (
                 <img src={drive.logo_url} alt={drive.company_name} className="max-h-full max-w-full object-contain" />
               ) : (
                 <Building2 className="h-12 w-12 text-slate-400" />
               )}
            </div>
            <div>
               <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-4xl font-black text-slate-900">{drive.company_name}</h1>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none px-3 py-1 font-bold">
                    {drive.drive_type.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-500 font-medium">
                    {drive.status.toUpperCase()}
                  </Badge>
               </div>
               <div className="flex items-center gap-6 text-slate-500 font-medium">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <a href={drive.website} target="_blank" className="hover:text-primary underline-offset-4 hover:underline">{drive.website || 'No website'}</a>
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {drive.location || 'Flexible'}
                  </span>
               </div>
            </div>
         </div>
         <div className="text-right">
            <p className="text-slate-400 text-sm mb-1">Company Category</p>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none font-bold text-lg px-4 py-2">
              {drive.company_category}
            </Badge>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Detailed Description */}
          <section className="space-y-4">
             <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
               <Info className="h-6 w-6 text-primary" />
               About Job
             </h3>
             <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-6">
                   <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {drive.job_description || 'No detailed description provided.'}
                   </div>
                </CardContent>
             </Card>
          </section>

          {/* Job Roles */}
          <section className="space-y-4">
             <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
               <LayoutList className="h-6 w-6 text-primary" />
               Available Roles
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {drive.roles.map((role) => (
                 <Card key={role.id} className={`border-2 transition-all cursor-pointer ${selectedRoles.includes(role.id) ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                   onClick={() => {
                     if (isApplied || isPending) return;
                     setSelectedRoles(prev => 
                       prev.includes(role.id) ? prev.filter(id => id !== role.id) : [...prev, role.id]
                     )
                   }}
                 >
                   <CardHeader className="pb-2">
                     <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-bold">{role.role_name}</CardTitle>
                        {(isApplied || isPending) ? (
                           <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                           <div className={`h-5 w-5 rounded-full border-2 ${selectedRoles.includes(role.id) ? 'bg-primary border-primary' : 'border-slate-300'}`} />
                        )}
                     </div>
                   </CardHeader>
                   <CardContent>
                      <div className="flex items-center gap-4">
                         <div className="flex items-center gap-1 text-primary font-black text-lg">
                            <DollarSign className="h-4 w-4" />
                            {role.ctc}
                         </div>
                         {role.stipend && (
                            <Badge variant="outline" className="text-slate-500 font-medium">Stipend: {role.stipend}</Badge>
                         )}
                      </div>
                   </CardContent>
                 </Card>
               ))}
             </div>
          </section>

          {/* Rounds Timeline */}
          {drive.rounds && drive.rounds.length > 0 && (
            <section className="space-y-4">
               <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                 <History className="h-6 w-6 text-primary" />
                 Recruitment Process
               </h3>
               <div className="space-y-0 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {drive.rounds.map((round, index) => (
                    <div key={index} className="flex gap-6 pb-8 last:pb-0 relative">
                       <div className="h-12 w-12 rounded-full border-4 border-white bg-primary text-white flex items-center justify-center font-bold shadow-md shrink-0 z-10">
                          {index + 1}
                       </div>
                       <div className="pt-2">
                          <p className="font-bold text-slate-900 text-lg">{round.name}</p>
                          <p className="text-slate-500 text-sm flex items-center gap-2 mb-2">
                             <Calendar className="h-3 w-3" />
                             {new Date(round.date).toLocaleDateString()}
                          </p>
                          <p className="text-slate-600">{round.description}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </section>
          )}

          {/* Attachments */}
          {drive.attachments && drive.attachments.length > 0 && (
             <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  Important Documents
                </h3>
                <div className="flex flex-wrap gap-4">
                  {drive.attachments.map((file, idx) => (
                    <Button key={idx} variant="outline" className="bg-white border-slate-200 hover:bg-slate-50 gap-2 h-auto py-3 px-6 rounded-2xl" onClick={() => window.open(file.url, '_blank')}>
                       <FileText className="h-5 w-5 text-red-500" />
                       <div className="text-left">
                          <p className="font-bold text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-400">PDF Document</p>
                       </div>
                    </Button>
                  ))}
                </div>
             </section>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl sticky top-8 overflow-hidden bg-slate-900 text-white">
             <div className="h-2 bg-gradient-to-r from-primary to-blue-400" />
             <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                   <Users className="h-5 w-5 text-primary-foreground/60" />
                   Application Box
                </CardTitle>
             </CardHeader>
             <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                      <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Applicants</p>
                      <p className="text-xl font-black">{drive.applicant_count || 0}</p>
                   </div>
                   <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                      <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Status</p>
                      <p className="text-xl font-black text-emerald-400">OPEN</p>
                   </div>
                </div>

                <div className="space-y-4 bg-white/5 p-4 rounded-3xl border border-white/10">
                   <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Eligibility</span>
                      {drive.is_eligible ? (
                         <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 border-none font-bold">PASSED</Badge>
                      ) : (
                         <Badge variant="destructive" className="font-bold">INELIGIBLE</Badge>
                      )}
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Min CGPA</span>
                      <span className="font-bold">{drive.min_cgpa}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Deadline</span>
                      <span className="font-bold text-amber-400">{new Date(drive.deadline_date).toLocaleDateString()}</span>
                   </div>
                </div>

                <div className="pt-2">
                   {isApplied ? (
                      <div className="text-center p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                         <div className="bg-emerald-500 h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                            <CheckCircle2 className="h-6 w-6" />
                         </div>
                         <p className="font-black text-emerald-400 text-xl">APPLICATION SENT</p>
                         <p className="text-white/40 text-xs mt-1">Keep track of your notifications for updates.</p>
                      </div>
                   ) : isPending ? (
                      <div className="text-center p-6 bg-amber-500/10 rounded-3xl border border-amber-500/20">
                         <div className="bg-amber-500 h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                            <History className="h-6 w-6" />
                         </div>
                         <p className="font-black text-amber-400 text-xl">REQUEST PENDING</p>
                         <p className="text-white/40 text-xs mt-1">Your request to attend is under review.</p>
                      </div>
                   ) : (
                      <>
                        <p className="text-[10px] text-white/30 mb-4 px-2 italic">
                          Please select at least one role to proceed with the application.
                        </p>
                        {drive.is_eligible ? (
                           <Button 
                              className="w-full h-14 text-lg font-black bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95" 
                              onClick={() => applyMutation.mutate()}
                              disabled={applyMutation.isPending || selectedRoles.length === 0}
                           >
                              {applyMutation.isPending ? 'PROCESSING...' : 'APPLY FOR DRIVE'}
                           </Button>
                        ) : (
                           <Button 
                              className="w-full h-14 text-lg font-black bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-500/20" 
                              onClick={() => requestMutation.mutate()}
                              disabled={requestMutation.isPending || selectedRoles.length === 0}
                           >
                              {requestMutation.isPending ? 'SUBMITTING...' : 'REQUEST TO ATTEND'}
                           </Button>
                        )}
                      </>
                   )}
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
