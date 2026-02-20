'use client';

import { useState, useEffect } from 'react';
import { ActivityLogService, ActivityLog } from '@/services/activity-log.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Check,
  Copy,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [page, limit, sortBy, sortOrder]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await ActivityLogService.getLogs(page, limit, sortBy, sortOrder);
      setLogs(data.logs || []); 
      setTotalPages(Math.ceil(data.total / limit));
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC'); // Default to DESC for new column (usually better for logs)
    }
    setPage(1); // Reset to page 1 on sort change
  };

  const handleCopyDetails = (id: number, details: any) => {
    try {
        const text = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Details copied to clipboard");
        setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
        toast.error("Failed to copy details");
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'bg-red-100 text-red-800 hover:bg-red-100';
    if (action.includes('CREATE')) return 'bg-green-100 text-green-800 hover:bg-green-100';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  };

  const formatDetails = (details: any) => {
    if (!details) return '-';
    try {
      const jsonStr = JSON.stringify(details, null, 2);
      return jsonStr.length > 50 ? jsonStr.slice(0, 50) + '...' : jsonStr;
    } catch (e) {
      return String(details);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#002147]">Activity Logs</h1>
          <p className="text-gray-500">Audit trail of all administrative actions</p>
        </div>
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Rows per page:</span>
                <Select value={String(limit)} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
                  <SelectTrigger className="w-[80px] h-8">
                    <SelectValue placeholder={limit} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
             </div>
            <Button variant="outline" onClick={() => fetchLogs()} disabled={loading} size="sm">
                Refresh
            </Button>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-[#f8fafc]">
              <TableRow className="border-b hover:bg-transparent">
                <TableHead 
                  className="py-3 px-4 font-semibold text-[#002147] w-[200px] cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('user_name')}
                >
                  <div className="flex items-center gap-1">
                    User
                    {sortBy === 'user_name' && (sortOrder === 'ASC' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </TableHead>
                <TableHead 
                  className="py-3 px-4 font-semibold text-[#002147] cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('user_role')}
                >
                  <div className="flex items-center gap-1">
                    Role
                    {sortBy === 'user_role' && (sortOrder === 'ASC' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </TableHead>
                <TableHead 
                  className="py-3 px-4 font-semibold text-[#002147] cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('action')}
                >
                  <div className="flex items-center gap-1">
                    Action
                    {sortBy === 'action' && (sortOrder === 'ASC' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </TableHead>
                <TableHead 
                  className="py-3 px-4 font-semibold text-[#002147] cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('entity_type')}
                >
                  <div className="flex items-center gap-1">
                    Entity
                    {sortBy === 'entity_type' && (sortOrder === 'ASC' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </TableHead>
                <TableHead className="py-3 px-4 font-semibold text-[#002147]">Details</TableHead>
                <TableHead className="py-3 px-4 font-semibold text-[#002147]">IP</TableHead>
                <TableHead 
                  className="py-3 px-4 font-semibold text-[#002147] text-right cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Time
                    {sortBy === 'created_at' && (sortOrder === 'ASC' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#002147]" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    No activity logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-blue-50/50 transition-colors">
                    <TableCell className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{log.user_name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500">ID: {log.user_id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                       <Badge variant="outline" className="capitalize border-gray-200 bg-gray-50 text-gray-700">{log.user_role}</Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge className={getActionColor(log.action)} variant="secondary">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-xs uppercase font-semibold text-gray-500">{log.entity_type}</span>
                        <span className="text-sm text-gray-900">{log.entity_id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 max-w-[300px]" title={JSON.stringify(log.details, null, 2)}>
                      <div className="flex items-start gap-2 group">
                        <code className="text-xs bg-gray-50 p-1.5 rounded block whitespace-pre-wrap max-h-[60px] overflow-y-auto border border-gray-100 flex-1">
                          {formatDetails(log.details)}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopyDetails(log.id, log.details)}
                          title="Copy full details"
                        >
                          {copiedId === log.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="text-gray-500" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs font-mono text-gray-600">{log.ip_address}</TableCell>
                    <TableCell className="py-3 px-4 text-xs text-gray-500 text-right whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-sm text-gray-500">
          Page {page} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || loading}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
