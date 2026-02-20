import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import apiClient from '@/lib/api';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Request {
  id: number;
  student_id: number;
  student_name: string;
  register_number: string;
  field_name: string;
  old_value: string;
  new_value: string;
  reason: string;
  created_at: string;
}

export function RequestsWidget() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchRequests = async () => {
    try {
      const response = await apiClient.get('/v1/admin/requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReview = async (id: number, action: 'approve' | 'reject') => {
    setProcessing(id);
    try {
      // For rejection, we might need a dialog for reason. For now simple reject.
      await apiClient.put(`/v1/admin/requests/${id}`, { 
        action, 
        rejection_reason: action === 'reject' ? 'Rejected by admin via dashboard' : undefined 
      });
      toast.success(`Request ${action}d successfully`);
      fetchRequests();
    } catch (error) {
      toast.error(`Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Mark Update Requests</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
            <span>Mark Update Requests</span>
            <Badge variant="secondary">{requests.length} Pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {requests.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No pending requests
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="flex flex-col space-y-2 p-3 border rounded-lg bg-card/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{req.student_name}</div>
                      <div className="text-xs text-muted-foreground">{req.register_number}</div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {req.field_name.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Original: <span className="text-foreground">{req.old_value}</span></div>
                    <div className="text-muted-foreground">New: <span className="text-foreground font-medium text-green-600 dark:text-green-400">{req.new_value}</span></div>
                  </div>

                  {req.reason && (
                    <div className="text-xs italic text-muted-foreground bg-muted p-2 rounded">
                      "{req.reason}"
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={processing === req.id}
                      onClick={() => handleReview(req.id, 'approve')}
                    >
                        {processing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                        Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="flex-1"
                      disabled={processing === req.id}
                      onClick={() => handleReview(req.id, 'reject')}
                    >
                        {processing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                        Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
