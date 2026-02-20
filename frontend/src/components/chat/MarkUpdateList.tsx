import { useState, useEffect, useMemo } from 'react';
import apiClient from '@/lib/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, X, CheckSquare, Square, Filter } from 'lucide-react';
import { toast } from 'sonner';

export function MarkUpdateList() {
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    // Selection state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Filters
    const [filterTime, setFilterTime] = useState<string>('all');

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/v1/admin/requests');
            setPendingRequests(res.data || []);
        } catch (err: any) {
            if (!err.handled) {
                console.error("Failed to load requests", err);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Time filter logic
    const isWithinTimeRange = (dateStr: string, range: string): boolean => {
        if (range === 'all') return true;
        const now = new Date();
        const date = new Date(dateStr);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (range) {
            case 'today':
                return date >= today;
            case 'yesterday': {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return date >= yesterday && date < today;
            }
            case 'week': {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date >= weekAgo;
            }
            case 'month': {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return date >= monthAgo;
            }
            default: return true;
        }
    };

    const filteredRequests = useMemo(() => {
        return pendingRequests.filter(r => {
            if (filterTime !== 'all' && !isWithinTimeRange(r.created_at, filterTime)) return false;
            return true;
        });
    }, [pendingRequests, filterTime]);

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        setSelectedIds(new Set(filteredRequests.map(r => r.id)));
    };

    const deselectAll = () => setSelectedIds(new Set());

    const allSelected = filteredRequests.length > 0 && filteredRequests.every(r => selectedIds.has(r.id));

    const handleReviewRequest = async (id: number, action: 'approve' | 'reject') => {
        setProcessingRequestId(id);
        try {
            await apiClient.put(`/v1/admin/requests/${id}`, { 
                action,
                rejection_reason: action === 'reject' ? 'Rejected via Admin Panel' : undefined
            });
            setPendingRequests(prev => prev.filter(r => r.id !== id));
            toast.success(`Request ${action}d`);
        } catch (err: any) {
            if (err?.response?.status === 409) {
                 const conflictMsg = err.response.data.error || "Request already processed";
                 toast.info("Update", { description: conflictMsg });
                 setPendingRequests(prev => prev.filter(r => r.id !== id));
            } else if (!err.handled) {
                 toast.error(`Failed to ${action} request`);
            }
        } finally {
            setProcessingRequestId(null);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.size === 0) return;
        setIsBulkProcessing(true);

        let successCount = 0;
        const ids = Array.from(selectedIds);

        for (const id of ids) {
            try {
                await apiClient.put(`/v1/admin/requests/${id}`, { action: 'approve' });
                setPendingRequests(prev => prev.filter(r => r.id !== id));
                successCount++;
            } catch (err: any) {
                if (err?.response?.status === 409) {
                    setPendingRequests(prev => prev.filter(r => r.id !== id));
                    successCount++;
                }
            }
        }

        toast.success(`Approved ${successCount} request(s)`);
        setSelectedIds(new Set());
        setSelectionMode(false);
        setIsBulkProcessing(false);
    };

    const hasActiveFilters = filterTime !== 'all';

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            {pendingRequests.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        variant={selectionMode ? "default" : "outline"}
                        className={`h-8 text-xs ${selectionMode ? 'bg-[#002147] hover:bg-[#003366]' : ''}`}
                        onClick={() => {
                            setSelectionMode(!selectionMode);
                            if (selectionMode) deselectAll();
                        }}
                    >
                        {selectionMode ? <CheckSquare className="h-3.5 w-3.5 mr-1.5" /> : <Square className="h-3.5 w-3.5 mr-1.5" />}
                        {selectionMode ? 'Cancel' : 'Select'}
                    </Button>

                    {selectionMode && (
                        <>
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={allSelected ? deselectAll : selectAll}>
                                {allSelected ? 'Deselect All' : 'Select All'}
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 text-xs bg-green-600 hover:bg-green-700"
                                onClick={handleBulkApprove}
                                disabled={selectedIds.size === 0 || isBulkProcessing}
                            >
                                {isBulkProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                Approve Selected ({selectedIds.size})
                            </Button>
                        </>
                    )}

                    <div className="flex-1" />

                    <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <Select value={filterTime} onValueChange={setFilterTime}>
                            <SelectTrigger className="h-8 text-xs w-[120px]">
                                <SelectValue placeholder="Time" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="week">Past Week</SelectItem>
                                <SelectItem value="month">Past Month</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setFilterTime('all')}>
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            {filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? 'No requests match your filters' : 'No pending mark updates'}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map(req => (
                        <div key={req.id} className={`p-4 border rounded-lg bg-gray-50/50 space-y-3 transition-all ${selectedIds.has(req.id) ? 'ring-2 ring-[#002147] border-[#002147]/30' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    {selectionMode && (
                                        <Checkbox
                                            checked={selectedIds.has(req.id)}
                                            onCheckedChange={() => toggleSelect(req.id)}
                                            className="data-[state=checked]:bg-[#002147] data-[state=checked]:border-[#002147]"
                                        />
                                    )}
                                    <div>
                                        <div className="font-semibold text-sm">{req.student_name}</div>
                                        <div className="text-xs text-muted-foreground">{req.register_number}</div>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[10px] capitalize">
                                    {req.field_name?.replace('_', ' ')}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="p-2 bg-white rounded border">
                                    <span className="text-muted-foreground">Current:</span> {req.old_value}
                                </div>
                                <div className="p-2 bg-white rounded border border-green-200">
                                    <span className="text-green-600 font-medium">New:</span> {req.new_value}
                                </div>
                            </div>
                            {req.reason && (
                                <div className="text-xs italic text-muted-foreground bg-white p-2 rounded border border-dashed">
                                    &quot;{req.reason}&quot;
                                </div>
                            )}
                            {!selectionMode && (
                                <div className="flex gap-2 pt-1">
                                    <Button 
                                        size="sm" 
                                        className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                                        onClick={() => handleReviewRequest(req.id, 'approve')}
                                        disabled={processingRequestId === req.id}
                                    >
                                        {processingRequestId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                        Approve
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="destructive" 
                                        className="flex-1 h-8 text-xs"
                                        onClick={() => handleReviewRequest(req.id, 'reject')}
                                        disabled={processingRequestId === req.id}
                                    >
                                        {processingRequestId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                                        Reject
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
