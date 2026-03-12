'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StudentService } from '@/services/student.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  AlertCircle, 
  ArrowRight,
  MessageSquare,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RequestsPage() {
  const queryClient = useQueryClient();

  const { data: changeRequests, isLoading: isLoadingChanges } = useQuery({
    queryKey: ['changeRequests'],
    queryFn: () => StudentService.getRequests(),
  });

  const { data: driveRequests, isLoading: isLoadingDrives } = useQuery({
    queryKey: ['driveRequests'],
    queryFn: () => StudentService.getDriveRequests(),
  });

  const deleteChangeMutation = useMutation({
    mutationFn: (id: number) => StudentService.deleteChangeRequest(id),
    onSuccess: () => {
      toast.success('Request cleared');
      queryClient.invalidateQueries({ queryKey: ['changeRequests'] });
    }
  });

  const deleteDriveMutation = useMutation({
    mutationFn: (id: number) => StudentService.deleteDriveRequest(id),
    onSuccess: () => {
      toast.success('Drive request cleared');
      queryClient.invalidateQueries({ queryKey: ['driveRequests'] });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'opted_in':
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-900">My Requests</h1>
          <p className="text-slate-500 mt-1">Track your profile updates and drive attendance requests</p>
        </div>
      </div>

      <Tabs defaultValue="mark-updates" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 mb-8">
          <TabsTrigger value="mark-updates" className="rounded-xl px-8 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm text-base font-bold">
            Mark Updates 
            {changeRequests && changeRequests.length > 0 && <span className="ml-2 bg-primary text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center">{changeRequests.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="drive-requests" className="rounded-xl px-8 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm text-base font-bold">
            Drive Requests
            {driveRequests && driveRequests.length > 0 && <span className="ml-2 bg-primary text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center">{driveRequests.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mark-updates">
          {isLoadingChanges ? (
             <div className="p-20 text-center">Loading requests...</div>
          ) : !changeRequests || changeRequests.length === 0 ? (
             <Card className="border-2 border-dashed border-slate-200 shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                    <History className="h-16 w-16 mb-4 text-slate-300" />
                    <p className="text-xl font-bold text-slate-500">No mark update requests</p>
                    <p className="text-slate-400">Your profile update requests will appear here</p>
                </CardContent>
             </Card>
          ) : (
            <div className="grid gap-4">
              {changeRequests.map((req) => (
                <Card key={req.id} className="border-slate-100 hover:shadow-md transition-all overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 justify-between">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                           <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                             {req.field_name.replace(/_/g, ' ')}
                           </h3>
                           {getStatusBadge(req.status)}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Current Value</p>
                             <p className="font-bold text-slate-700">{req.old_value || 'N/A'}</p>
                          </div>
                          <ArrowRight className="text-slate-300 shrink-0" />
                          <div className="flex-1 bg-primary/5 p-3 rounded-xl border border-primary/10">
                             <p className="text-[10px] text-primary/60 font-bold uppercase mb-1">Proposed Value</p>
                             <p className="font-bold text-primary">{req.new_value}</p>
                          </div>
                        </div>

                        {req.reason && (
                           <div className="flex items-start gap-2 text-slate-500 text-sm italic bg-slate-50/50 p-3 rounded-lg">
                              <AlertCircle className="h-4 w-4 shrink-0 text-slate-400" />
                              <span>"{req.reason}"</span>
                           </div>
                        )}

                        {req.admin_comment && (
                           <div className="flex items-start gap-2 text-primary font-medium text-sm bg-primary/5 p-3 rounded-lg border border-primary/10">
                              <MessageSquare className="h-4 w-4 shrink-0" />
                              <span>Admin: {req.admin_comment}</span>
                           </div>
                        )}

                        <p className="text-[10px] text-slate-400">Requested on {format(new Date(req.created_at), 'PPP pp')}</p>
                      </div>

                      <div className="flex md:flex-col justify-end gap-2">
                        <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => deleteChangeMutation.mutate(req.id)}>
                           <Trash2 className="h-4 w-4 mr-2" /> Clear Request
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drive-requests">
          {isLoadingDrives ? (
             <div className="p-20 text-center">Loading drive requests...</div>
          ) : !driveRequests || driveRequests.length === 0 ? (
             <Card className="border-2 border-dashed border-slate-200 shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                    <Building2 className="h-16 w-16 mb-4 text-slate-300" />
                    <p className="text-xl font-bold text-slate-500">No drive requests</p>
                    <p className="text-slate-400">Your requests to attend placement drives will appear here</p>
                </CardContent>
             </Card>
          ) : (
            <div className="grid gap-4">
               {driveRequests.map((req) => (
                 <Card key={req.drive_id} className="border-slate-100 hover:shadow-md transition-all">
                    <CardContent className="p-6">
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                             <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center p-2">
                                <Building2 className="text-slate-400" />
                             </div>
                             <div>
                                <h3 className="text-xl font-black text-slate-900">{req.company_name}</h3>
                                <p className="text-slate-500 font-medium">Applied Roles: {req.applied_role_names || 'General'}</p>
                             </div>
                          </div>
                          {getStatusBadge(req.status)}
                       </div>

                       {req.remarks && (
                          <div className="bg-slate-50 p-4 rounded-2xl text-slate-600 text-sm mb-4 border border-slate-100">
                             <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Your Remarks</span>
                             {req.remarks}
                          </div>
                       )}

                       <div className="flex justify-between items-center mt-6">
                          <p className="text-[10px] text-slate-400">Request ID: #{req.drive_id}</p>
                          <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => deleteDriveMutation.mutate(req.drive_id)}>
                             <Trash2 className="h-4 w-4 mr-2" /> Cancel Request
                          </Button>
                       </div>
                    </CardContent>
                 </Card>
               ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
