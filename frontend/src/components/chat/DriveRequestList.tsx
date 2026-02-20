import { useState, useEffect, useMemo } from 'react';
import { driveService, DriveRequest } from '@/services/drive.service';
import { DriveRequestCard } from './DriveRequestCard';
import { Loader2, CheckSquare, Square, Check, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function DriveRequestList() {
    const [requests, setRequests] = useState<DriveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [processingKey, setProcessingKey] = useState<string | null>(null);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    // Selection state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    // Filter state
    const [filterDept, setFilterDept] = useState<string>('all');
    const [filterTime, setFilterTime] = useState<string>('all');

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const data = await driveService.getDriveRequests();
            setRequests(data || []);
        } catch (error) {
           console.error("Failed to fetch requests", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Derive unique departments for filter
    const departments = useMemo(() => {
        const depts = new Set(requests.map(r => r.department).filter(Boolean));
        return Array.from(depts).sort();
    }, [requests]);

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

    // Filtered requests
    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            if (filterDept !== 'all' && r.department !== filterDept) return false;
            if (filterTime !== 'all' && !isWithinTimeRange(r.applied_at, filterTime)) return false;
            return true;
        });
    }, [requests, filterDept, filterTime]);

    const toggleSelect = (driveId: number, studentId: number) => {
        const key = `${driveId}-${studentId}`;
        setSelectedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const selectAll = () => {
        const allKeys = new Set(filteredRequests.map(r => `${r.drive_id}-${r.student_id}`));
        setSelectedKeys(allKeys);
    };

    const deselectAll = () => setSelectedKeys(new Set());

    const allSelected = filteredRequests.length > 0 && filteredRequests.every(r => selectedKeys.has(`${r.drive_id}-${r.student_id}`));

    const handleStatusUpdate = async (driveId: number, studentId: number, status: string, remarks: string) => {
        const key = `${driveId}-${studentId}`;
        setProcessingKey(key);
        
        try {
            await driveService.updateDriveRequestStatus(driveId, studentId, status, remarks);
            const message = status === 'opted_in' ? "Request Approved" : "Request Rejected";
            const description = `Student request has been ${status === 'opted_in' ? 'approved' : 'rejected'}.`;
            toast.success(message, { description });
            setRequests(prev => prev.filter(r => !(r.drive_id === driveId && r.student_id === studentId)));
        } catch (error: any) {
             if (error?.response?.status === 409) {
                 const conflictMsg = error.response.data.error || "Request already processed";
                 toast.info("Update", { description: conflictMsg });
                 setRequests(prev => prev.filter(r => !(r.drive_id === driveId && r.student_id === studentId)));
             } else {
                 toast.error("Error", { description: "Failed to update request status" });
             }
        } finally {
            setProcessingKey(null);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedKeys.size === 0) return;

        setIsBulkProcessing(true);
        try {
            const pairs = Array.from(selectedKeys).map(key => {
                const [driveId, studentId] = key.split('-').map(Number);
                return { drive_id: driveId, student_id: studentId };
            });

            const result = await driveService.bulkUpdateDriveRequestStatus(pairs, 'opted_in', '');
            toast.success(`Approved ${result.affected} request(s)`);

            // Remove approved from list
            setRequests(prev => prev.filter(r => !selectedKeys.has(`${r.drive_id}-${r.student_id}`)));
            setSelectedKeys(new Set());
            setSelectionMode(false);
        } catch (error: any) {
            toast.error("Error", { description: "Failed to bulk approve requests" });
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const hasActiveFilters = filterDept !== 'all' || filterTime !== 'all';

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            {requests.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {/* Selection toggle */}
                    <Button
                        size="sm"
                        variant={selectionMode ? "default" : "outline"}
                        className={`h-8 text-xs ${selectionMode ? 'bg-[#002147] hover:bg-[#003366]' : ''}`}
                        onClick={() => {
                            setSelectionMode(!selectionMode);
                            if (selectionMode) deselectAll();
                        }}
                    >
                        {/* {selectionMode ? <CheckSquare className="h-3.5 w-3.5 mr-1.5" /> : <Square className="h-3.5 w-3.5 mr-1.5" />} */}
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
                                disabled={selectedKeys.size === 0 || isBulkProcessing}
                            >
                                {isBulkProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                Approve Selected ({selectedKeys.size})
                            </Button>
                        </>
                    )}

                    <div className="flex-1" />

                    {/* Filters */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <Select value={filterDept} onValueChange={setFilterDept}>
                            <SelectTrigger className="h-8 text-xs w-[130px]">
                                <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Depts</SelectItem>
                                {departments.map(d => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

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
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => { setFilterDept('all'); setFilterTime('all'); }}>
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? 'No requests match your filters' : 'No pending drive requests'}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {filteredRequests.map(req => (
                        <DriveRequestCard 
                           key={`${req.drive_id}-${req.student_id}`}
                           request={req}
                           onApprove={(dId, sId, rem) => handleStatusUpdate(dId, sId, 'opted_in', rem)}
                           onReject={(dId, sId, rem) => handleStatusUpdate(dId, sId, 'rejected', rem)}
                           isProcessing={processingKey === `${req.drive_id}-${req.student_id}`}
                           selectionMode={selectionMode}
                           isSelected={selectedKeys.has(`${req.drive_id}-${req.student_id}`)}
                           onToggleSelect={toggleSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
