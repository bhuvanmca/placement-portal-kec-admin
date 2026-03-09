"use client";

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  FileText,
  Briefcase,
  MoreVertical,
  Download,
  Search,
  ArrowLeft,
  Settings2,
  Filter,
  ListFilter,
  Activity,
  UserPlus,
  Loader2,
  Check,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatDateTime } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { driveService, Drive, DriveApplicantDetailed } from '@/services/drive.service';
import { configService, Department, Batch } from '@/services/config.service';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';


type StatusFilter = 'all' | 'opted_in' | 'opted_out' | 'shortlisted' | 'placed' | 'rejected' | 'request_to_attend' | 'eligible';

export default function DriveDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user } = useAuth();

  const [drive, setDrive] = useState<Drive | null>(null);
  const [applicants, setApplicants] = useState<DriveApplicantDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tabParam || "applicants");

  // Filter and Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterRoles, setFilterRoles] = useState<number[]>([]);
  
  const [deptOptions, setDeptOptions] = useState<Department[]>([]);
  const [batchOptions, setBatchOptions] = useState<Batch[]>([]);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Sort State
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <TableHead 
      className="px-6 py-4 bg-[#f8fafc] cursor-pointer select-none hover:bg-gray-200 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1 font-semibold text-sm text-[#002147]">
        {label}
        {sortBy === column && (
          sortOrder === 'asc' ?
            <ArrowDown className="h-3 w-3" /> :
            <ArrowUp className="h-3 w-3" />
        )}
      </div>
    </TableHead>
  );
  
  // Manual Registration State
  const [regNo, setRegNo] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedManualRoles, setSelectedManualRoles] = useState<number[]>([]);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Eligible Students State
  const [eligibleStudents, setEligibleStudents] = useState<DriveApplicantDetailed[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(true);
  const [eligiblePage, setEligiblePage] = useState(1);
  const [eligiblePageSize, setEligiblePageSize] = useState(10);
  const [eligibleSearchTerm, setEligibleSearchTerm] = useState('');

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    profile: true,
    register_number: true,
    department: true,
    ug_cgpa: true,
    pg_cgpa: true,
    tenth_mark: true,
    twelfth_mark: true,
    diploma_mark: false,
    current_backlogs: true,
    history_of_backlogs: false,
    application_status: true,
    applied_at: true,
    opt_out_reason: false,
    roles: true,
    resume: true,
  });

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      
      const response = await driveService.getAdminDrives(1, 100); 
      const foundDrive = response.drives.find((d: any) => d.id === parseInt(id as string));
      
      if (foundDrive) {
         setDrive(foundDrive);
         try {
            const applicantsData = await driveService.getDriveApplicantsDetailed(parseInt(id));
            setApplicants(applicantsData);
         } catch (e) {
            toast.error("Failed to fetch applicant details");
         }

         // Fetch Eligible Students Preview
         try {
            setLoadingEligible(true);
            const eligibleData = await driveService.eligibilityPreview(foundDrive as any);
            setEligibleStudents(eligibleData);
         } catch (e) {
            console.error(e);
         } finally {
            setLoadingEligible(false);
         }
         
         if (silent) toast.success("Data refreshed");
      } else {
         toast.error("Drive not found");
         router.push('/dashboard/drives');
      }
    } catch (error) {
      toast.error("Failed to load drive details");
    } finally {
      if (!silent) setLoading(false);
      else setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Fetch Config Data
  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const [d, b] = await Promise.all([
                configService.getAllDepartments(),
                configService.getAllBatches()
            ]);
            setDeptOptions(d || []);
            setBatchOptions(b || []);
            
            // For Coordinator: Set and Lock Department
            if (user?.role === 'coordinator' && user.department_code) {
                setFilterDept(user.department_code);
            }
        } catch (e) {
            toast.error("Failed to load filter options");
        }
    };
    if (user) fetchConfig();
  }, [user]);

  const handleStatusUpdate = async (studentId: number, newStatus: string) => {
     try {
        await driveService.updateApplicationStatus(parseInt(id), studentId, newStatus);
        toast.success(`Marked as ${newStatus}`);
        const updated = await driveService.getDriveApplicantsDetailed(parseInt(id));
        setApplicants(updated);
     } catch (e) {
        toast.error("Failed to update status");
     }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
     if (selectedIds.length === 0) return;
     try {
        const requests = selectedIds.map(studentId => ({ drive_id: parseInt(id), student_id: studentId }));
        await driveService.bulkUpdateDriveRequestStatus(requests, newStatus, "");
        toast.success(`Marked ${selectedIds.length} students as ${newStatus}`);
        const updated = await driveService.getDriveApplicantsDetailed(parseInt(id));
        setApplicants(updated);
        setSelectedIds([]);
     } catch (e) {
        toast.error(`Failed to bulk update status to ${newStatus}`);
     }
  };

  const handleManualRegister = async (forceRoles?: number[]) => {
    if (!regNo) {
      toast.error("Please enter a register number");
      return;
    }

    // If roles not provided and drive has multiple roles, show role dialog
    if (!forceRoles && drive && drive.roles && drive.roles.length > 1) {
        setSelectedManualRoles(drive.roles.map(r => r.id)); // Default to all
        setRoleDialogOpen(true);
        return;
    }
    
    // If only one role, use it if none selected
    const roleIds = forceRoles || (drive && drive.roles && drive.roles.length === 1 ? [drive.roles[0].id] : []);

    try {
      setIsAddingStudent(true);
      await driveService.manualRegisterStudent(parseInt(id), regNo, roleIds);
      toast.success("Student added successfully");
      setRegNo('');
      setAddDialogOpen(false);
      setRoleDialogOpen(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.error || "Failed to add student";
      toast.error(msg);
    } finally {
      setIsAddingStudent(false);
    }
  };

  const openResume = async (studentId: number) => {
      try {
          const data = await driveService.getStudentDocumentUrl(studentId, 'resume');
          if (data && data.url) {
              window.open(data.url, '_blank');
          } else {
              toast.error("Resume not found or URL invalid");
          }
      } catch (e) {
          toast.error("Failed to open resume");
      }
  };

  const filteredApplicants = useMemo(() => {
    let filtered = (applicants || []).filter(a => {
      const matchesSearch = 
        a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.register_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.mobile_number?.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || a.application_status === statusFilter;
      const matchesBatch = filterBatch === 'All' || a.batch_year?.toString() === filterBatch;
      const matchesDept = filterDept === 'All' || a.department === filterDept;
      const matchesRole = filterRoles.length === 0 || (a.applied_role_ids && a.applied_role_ids.some(rid => filterRoles.includes(rid)));
      
      return matchesSearch && matchesStatus && matchesBatch && matchesDept && matchesRole;
    });

    // Client-side sorting
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let valA: any, valB: any;
        switch (sortBy) {
          case 'full_name': valA = a.full_name?.toLowerCase() || ''; valB = b.full_name?.toLowerCase() || ''; break;
          case 'register_number': valA = a.register_number?.toLowerCase() || ''; valB = b.register_number?.toLowerCase() || ''; break;
          case 'department': valA = a.department?.toLowerCase() || ''; valB = b.department?.toLowerCase() || ''; break;
          case 'ug_cgpa': valA = a.ug_cgpa || 0; valB = b.ug_cgpa || 0; break;
          case 'pg_cgpa': valA = a.pg_cgpa || 0; valB = b.pg_cgpa || 0; break;
          case 'tenth_mark': valA = a.tenth_mark || 0; valB = b.tenth_mark || 0; break;
          case 'twelfth_mark': valA = a.twelfth_mark || 0; valB = b.twelfth_mark || 0; break;
          case 'current_backlogs': valA = a.current_backlogs || 0; valB = b.current_backlogs || 0; break;
          case 'application_status': valA = a.application_status || ''; valB = b.application_status || ''; break;
          default: return 0;
        }
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [applicants, searchTerm, statusFilter, filterBatch, filterDept, filterRoles, sortBy, sortOrder]);

  // Pagination Logic
  const paginatedApplicants = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredApplicants.slice(startIndex, startIndex + pageSize);
  }, [filteredApplicants, page, pageSize]);

  // Filtering for Eligible Students
  const filteredEligibleStudents = useMemo(() => {
    return (eligibleStudents || []).filter((s: DriveApplicantDetailed) => {
      const search = eligibleSearchTerm.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(search) ||
        s.email?.toLowerCase().includes(search) ||
        s.register_number?.toLowerCase().includes(search)
      );
    });
  }, [eligibleStudents, eligibleSearchTerm]);

  // Pagination Logic for Eligible Students
  const paginatedEligibleStudents = useMemo(() => {
    const startIndex = (eligiblePage - 1) * eligiblePageSize;
    return filteredEligibleStudents.slice(startIndex, startIndex + eligiblePageSize);
  }, [filteredEligibleStudents, eligiblePage, eligiblePageSize]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, filterBatch, filterDept, filterRoles]);

  useEffect(() => {
    setEligiblePage(1);
  }, [eligibleSearchTerm]);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (filteredApplicants.length > 0 && selectedIds.length === filteredApplicants.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApplicants.map(a => a.id));
    }
  };

  const handleExport = async () => {
    try {
      const idsToExport = selectedIds.length > 0 ? selectedIds : undefined;
      const data = await driveService.exportDriveApplicants(parseInt(id), idsToExport);
      
      // Convert to CSV
      const columns = Object.keys(visibleColumns).filter(c => visibleColumns[c] && c !== 'resume');
      const header = columns.map(c => c.replace('_', ' ').toUpperCase()).join(',');
      
      const rows = data.map(item => {
        return columns.map(col => {
          if (col === 'profile') {
             return `"${item.full_name} (${item.email})"`;
          }
          const val = (item as any)[col];
          return `"${val || ''}"`;
        }).join(',');
      });
      
      const csvContent = [header, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${drive?.company_name}_applicants_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Export successful");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gray-50/50">
          <Loader2 className="h-10 w-10 animate-spin text-[#002147] mb-4" />
          <p className="text-gray-500 font-medium">Loading drive details...</p>
       </div>
     );
  }

  if (!drive) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50/50">
       {/* Top Header */}
       <div className="bg-white border-b px-8 py-6">
          <div className="flex items-start justify-between">
             <div className="space-y-1">
                <div className="flex items-center gap-3">
                   <Link href="/dashboard/drives">
                      <Button variant="ghost" size="icon" className="-ml-3 rounded-full hover:bg-gray-100 transition-colors">
                         <ArrowLeft className="h-4 w-4" />
                      </Button>
                   </Link>
                   <h1 className="text-2xl font-bold text-[#002147] tracking-tight">{drive.company_name}</h1>
                   <Badge variant="outline" className="font-semibold px-2.5 py-0.5 rounded-full border-[#002147]/20 text-[#002147] bg-[#002147]/5">
                      {drive.drive_type}
                   </Badge>
                   <Badge className={
                      drive.status === 'open' ? 'bg-green-600 hover:bg-green-700 shadow-sm' : 
                      drive.status === 'closed' ? 'bg-red-600 hover:bg-red-700 shadow-sm' :
                      'bg-amber-500 hover:bg-amber-600 shadow-sm'
                   }>
                      {drive.status.toUpperCase()}
                   </Badge>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500 pl-10 font-medium">
                   <div className="flex items-center gap-1.5 transition-colors hover:text-gray-900">
                      <Briefcase className="h-4 w-4" />
                      <span>{drive.roles && drive.roles.length > 0 ? (drive.roles.length > 1 ? `${drive.roles.length} Roles` : drive.roles[0].role_name) : 'Various Roles'}</span>
                   </div>
                   <div className="flex items-center gap-1.5 transition-colors hover:text-gray-900">
                      <MapPin className="h-4 w-4" />
                      <span>{drive.location} <span className="text-gray-400 text-xs font-normal">({drive.location_type || 'On-Site'})</span></span>
                   </div>
                   <div className="flex items-center gap-1.5 transition-colors hover:text-gray-900">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDateTime(drive.drive_date)}</span>
                   </div>
                </div>
             </div>
             
             <div className="flex gap-2.5">
                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                    <>
                        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="border-gray-200 hover:bg-gray-50 text-gray-700">
                              <UserPlus className="mr-2 h-4 w-4" /> Manual Opt-In
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-[#002147]">Manually Add Student</DialogTitle>
                              <DialogDescription>
                                Enter the register number of the student you want to add to this drive. They will be notified via push notification.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center space-x-2 py-4">
                              <div className="grid flex-1 gap-2">
                                <Input
                                  placeholder="e.g. 24MCR029"
                                  value={regNo}
                                  onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                                  onKeyDown={(e) => e.key === 'Enter' && handleManualRegister()}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="ghost" onClick={() => setAddDialogOpen(false)} disabled={isAddingStudent}>Cancel</Button>
                              <Button 
                                onClick={() => handleManualRegister()} 
                                disabled={isAddingStudent}
                                className="bg-[#002147] hover:bg-[#003366]"
                              >
                                {isAddingStudent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Student"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button variant="outline" className="border-gray-200 hover:bg-gray-50 text-gray-700" onClick={() => router.push(`/dashboard/drives/${id}/edit`)}>
                           Edit Drive
                        </Button>
                        
                        {selectedIds.length > 0 && (
                            <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                  <Button className="bg-green-600 hover:bg-green-700 shadow-md transition-all active:scale-95">
                                     <CheckCircle2 className="mr-2 h-4 w-4" /> 
                                     Bulk Actions ({selectedIds.length})
                                  </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end" className="w-52 p-2">
                                  <DropdownMenuLabel className="text-xs uppercase text-gray-400 font-bold px-2 py-1.5 tracking-widest">Mark Selected As</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('placed')} className="cursor-pointer gap-2 py-2">
                                     <div className="h-2 w-2 rounded-full bg-green-500" /> Placed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('shortlisted')} className="cursor-pointer gap-2 py-2">
                                     <div className="h-2 w-2 rounded-full bg-amber-400" /> Shortlisted
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('opted_in')} className="cursor-pointer gap-2 py-2">
                                     <div className="h-2 w-2 rounded-full bg-[#002147]" /> Opted In
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('rejected')} className="text-red-500 focus:text-red-600 cursor-pointer gap-2 py-2">
                                     <div className="h-2 w-2 rounded-full bg-red-500" /> Rejected
                                  </DropdownMenuItem>
                               </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <Button className="bg-[#002147] hover:bg-[#003366] shadow-md transition-all active:scale-95" onClick={handleExport}>
                           <Download className="mr-2 h-4 w-4" /> 
                           {selectedIds.length > 0 ? `Export Selected (${selectedIds.length})` : 'Export All'}
                        </Button>
                    </>
                )}
             </div>
          </div>

          {/* Role Selection Dialog */}
          <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[#002147]">Select Roles for {regNo}</DialogTitle>
                <DialogDescription>
                  This drive has multiple roles. Please select which roles the student should be opted into.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700">Available Roles</span>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs text-[#002147] hover:bg-gray-100"
                        onClick={() => {
                            if (selectedManualRoles.length === drive?.roles?.length) setSelectedManualRoles([]);
                            else setSelectedManualRoles(drive?.roles?.map(r => r.id) || []);
                        }}
                    >
                        {selectedManualRoles.length === drive?.roles?.length ? 'Deselect All' : 'Select All'}
                    </Button>
                </div>
                <div className="grid gap-3">
                  {drive?.roles?.map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {
                        setSelectedManualRoles(prev => 
                            prev.includes(role.id) ? prev.filter(r => r !== role.id) : [...prev, role.id]
                        );
                    }}>
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                            id={`role-${role.id}`} 
                            checked={selectedManualRoles.includes(role.id)}
                            onCheckedChange={() => {}} // Handled by div click
                        />
                        <label className="text-sm font-medium leading-none cursor-pointer">
                          {role.role_name}
                        </label>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold h-5">{role.ctc}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setRoleDialogOpen(false)} disabled={isAddingStudent}>Back</Button>
                <Button 
                  onClick={() => handleManualRegister(selectedManualRoles)} 
                  disabled={isAddingStudent || selectedManualRoles.length === 0}
                  className="bg-[#002147] hover:bg-[#003366]"
                >
                  {isAddingStudent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm & Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-8 pl-10">
             <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <div className="text-xs text-purple-600/70 font-bold uppercase tracking-wider mb-1">Eligible Students</div>
                <div className="text-3xl font-black text-purple-700 flex items-center gap-2">
                   {loadingEligible ? <Loader2 className="h-6 w-6 animate-spin"/> : eligibleStudents.length}
                </div>
             </div>
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="text-xs text-blue-600/70 font-bold uppercase tracking-wider mb-1">Total Applicants</div>
                <div className="text-3xl font-black text-blue-700">{applicants.length}</div>
             </div>
             <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <div className="text-xs text-amber-600/70 font-bold uppercase tracking-wider mb-1">Shortlisted</div>
                <div className="text-3xl font-black text-amber-700">
                   {applicants.filter(a => a.application_status === 'shortlisted').length}
                </div>
             </div>
             <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <div className="text-xs text-emerald-600/70 font-bold uppercase tracking-wider mb-1">Placed</div>
                <div className="text-3xl font-black text-emerald-700">
                   {applicants.filter(a => a.application_status === 'placed').length}
                </div>
             </div>
             <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="text-xs text-indigo-600/70 font-bold uppercase tracking-wider mb-1">Opted In</div>
                <div className="text-3xl font-black text-indigo-700">
                   {applicants.filter(a => a.application_status === 'opted_in').length}
                </div>
             </div>
          </div>
       </div>

       {/* Main Content */}
       <div className="flex-1 p-8 overflow-hidden flex flex-col pt-4">
          <Tabs defaultValue="applicants" className="h-full flex flex-col" onValueChange={setActiveTab}>
             <div className="flex items-center justify-between mb-4">
                <div className="bg-white p-2 rounded-lg border shadow-sm w-fit">
                   <TabsList className="bg-transparent border-0 p-0 flex flex-wrap gap-2">
                      <TabsTrigger value="applicants" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white rounded-md transition-all px-4 sm:px-6 hover:bg-gray-100 data-[state=active]:hover:bg-[#002147]">Applicants</TabsTrigger>
                      <TabsTrigger value="eligible" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white rounded-md transition-all px-4 sm:px-6 hover:bg-gray-100 data-[state=active]:hover:bg-[#002147]">Eligible Students</TabsTrigger>
                      <TabsTrigger value="details" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white rounded-md transition-all px-4 sm:px-6 hover:bg-gray-100 data-[state=active]:hover:bg-[#002147]">Drive Details</TabsTrigger>
                      <TabsTrigger value="rounds" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white rounded-md transition-all px-4 sm:px-6 hover:bg-gray-100 data-[state=active]:hover:bg-[#002147]">Schedule</TabsTrigger>
                   </TabsList>
                </div>
                
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => fetchData(true)} 
                   disabled={isRefreshing}
                   className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
                >
                   <RefreshCw className={cn("h-4 w-4 mr-2 text-[#002147]", isRefreshing && "animate-spin")} />
                   <span className="font-medium">Refresh</span>
                </Button>
             </div>

             <TabsContent value="applicants" className="flex-1 overflow-hidden border rounded-xl bg-white shadow-sm flex flex-col">
                <div className="p-3 border-b flex flex-col xl:flex-row justify-between items-center gap-4 bg-white">
                   <div className="flex flex-wrap items-center gap-3">
                       {/* Column Config */}
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <Button variant="outline" size="sm" className="h-9 px-3 border-gray-200 hover:bg-gray-100 transition-colors">
                                <Settings2 className="h-4 w-4 mr-2" /> Columns
                             </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                             <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                             {Object.keys(visibleColumns).map(col => (
                                <DropdownMenuCheckboxItem
                                   key={col}
                                   checked={visibleColumns[col]}
                                   onSelect={(e) => e.preventDefault()}
                                   onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [col]: checked }))}
                                   className="capitalize"
                                >
                                   {col.replace('_', ' ')}
                                </DropdownMenuCheckboxItem>
                             ))}
                          </DropdownMenuContent>
                       </DropdownMenu>
                       
                       {/* Batch Filter */}
                       <Select value={filterBatch} onValueChange={(val) => { setFilterBatch(val); setPage(1); }}>
                         <SelectTrigger className="w-[110px] h-9 border-gray-200 hover:bg-gray-100 transition-colors">
                           <SelectValue placeholder="Batch" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="All">Batch: All</SelectItem>
                           {batchOptions.map((b) => (
                               <SelectItem key={b.id} value={b.year.toString()}>{b.year}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>

                       {/* Department Filter */}
                       <Select 
                            value={filterDept} 
                            onValueChange={(val) => { setFilterDept(val); setPage(1); }}
                            disabled={user?.role === 'coordinator'}
                       >
                         <SelectTrigger className="w-[140px] h-9 border-gray-200 hover:bg-gray-100 transition-colors">
                           <SelectValue placeholder="Department" />
                         </SelectTrigger>
                         <SelectContent className="max-h-[300px]">
                           <SelectItem value="All">Dept: All</SelectItem>
                           {deptOptions.map((dept) => (
                               <SelectItem key={dept.id} value={dept.code}>
                                   {dept.code}
                               </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>

                       {/* Status Filter */}
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <Button variant="outline" size="sm" className="h-9 px-3 border-gray-200 hover:bg-gray-100 transition-colors">
                                <Activity className="h-4 w-4 mr-2" /> {statusFilter === 'all' ? 'Status' : statusFilter.replace('_', ' ')}
                             </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                             <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                             <DropdownMenuCheckboxItem checked={statusFilter === 'all'} onCheckedChange={() => setStatusFilter('all')}>All Statuses</DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem checked={statusFilter === 'opted_in'} onCheckedChange={() => setStatusFilter('opted_in')}>Opted In</DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem checked={statusFilter === 'request_to_attend'} onCheckedChange={() => setStatusFilter('request_to_attend')}>Request to Attend</DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem checked={statusFilter === 'shortlisted'} onCheckedChange={() => setStatusFilter('shortlisted')}>Shortlisted</DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem checked={statusFilter === 'placed'} onCheckedChange={() => setStatusFilter('placed')}>Placed</DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem checked={statusFilter === 'rejected'} onCheckedChange={() => setStatusFilter('rejected')}>Rejected</DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem checked={statusFilter === 'opted_out'} onCheckedChange={() => setStatusFilter('opted_out')}>Opted Out</DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem checked={statusFilter === 'eligible'} onCheckedChange={() => setStatusFilter('eligible')}>Eligible</DropdownMenuCheckboxItem>
                          </DropdownMenuContent>
                       </DropdownMenu>

                       {/* Role Filter */}
                       {drive?.roles && drive.roles.length > 0 && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                               <Button variant="outline" size="sm" className={`h-9 px-3 border-gray-200 hover:bg-gray-100 transition-colors ${filterRoles.length > 0 ? 'border-[#002147] text-[#002147]' : ''}`}>
                                  <Briefcase className="h-4 w-4 mr-2" /> Role {filterRoles.length > 0 ? `(${filterRoles.length})` : ''}
                               </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52">
                               <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                               <DropdownMenuSeparator />
                               <DropdownMenuCheckboxItem
                                  checked={filterRoles.length === 0}
                                  onCheckedChange={() => setFilterRoles([])}
                               >All Roles</DropdownMenuCheckboxItem>
                               {drive.roles.map(role => (
                                  <DropdownMenuCheckboxItem
                                     key={role.id}
                                     checked={filterRoles.includes(role.id)}
                                     onSelect={(e) => e.preventDefault()}
                                     onCheckedChange={(checked) => {
                                        setFilterRoles(prev => 
                                           checked ? [...prev, role.id] : prev.filter(r => r !== role.id)
                                        );
                                     }}
                                  >{role.role_name}</DropdownMenuCheckboxItem>
                               ))}
                            </DropdownMenuContent>
                         </DropdownMenu>
                       )}
                   </div>

                   <div className="relative w-full sm:w-72 group flex-shrink-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#002147] transition-colors" />
                      <Input 
                        placeholder="Search name, reg no or phone..." 
                        className="pl-9 h-9 border-gray-200 focus-visible:ring-[#002147]/20 transition-all w-full bg-gray-50/50 hover:bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
                </div>
                <div className="flex-1 overflow-auto min-h-0">
                <Table>
                   <TableHeader className="bg-[#f8fafc] sticky top-0 z-10 font-semibold border-b">
                      <TableRow className="hover:bg-transparent border-b">
                          {visibleColumns.profile && (
                            <TableHead className="w-[300px] px-6 py-4 sticky left-0 bg-[#f8fafc] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer select-none hover:bg-gray-200 transition-colors" onClick={() => handleSort('full_name')}>
                               <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={filteredApplicants.length > 0 && selectedIds.length === filteredApplicants.length} 
                                    onCheckedChange={(checked) => { toggleSelectAll(); }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex items-center gap-1 font-semibold text-sm text-[#002147]">
                                    Profile
                                    {sortBy === 'full_name' && (
                                      sortOrder === 'asc' ?
                                        <ArrowDown className="h-3 w-3" /> :
                                        <ArrowUp className="h-3 w-3" />
                                    )}
                                  </div>
                               </div>
                            </TableHead>
                          )}

                         {visibleColumns.register_number && <SortableHeader column="register_number" label="Register No" />}
                         {visibleColumns.department && <SortableHeader column="department" label="Dept" />}
                         {visibleColumns.ug_cgpa && <SortableHeader column="ug_cgpa" label="UG CGPA" />}
                         {visibleColumns.pg_cgpa && <SortableHeader column="pg_cgpa" label="PG CGPA" />}
                         {visibleColumns.tenth_mark && <SortableHeader column="tenth_mark" label="10th %" />}
                         {visibleColumns.twelfth_mark && <SortableHeader column="twelfth_mark" label="12th %" />}
                         {visibleColumns.diploma_mark && <SortableHeader column="diploma_mark" label="Dip %" />}
                         {visibleColumns.current_backlogs && <SortableHeader column="current_backlogs" label="Backlogs" />}
                         {visibleColumns.history_of_backlogs && <TableHead className="font-semibold px-6 py-4 text-sm text-[#002147] bg-[#f8fafc] text-center">History of Backlogs</TableHead>}
                         {visibleColumns.application_status && <SortableHeader column="application_status" label="Status" />}
                         {visibleColumns.opt_out_reason && <TableHead className="font-semibold px-6 py-4 text-sm text-[#002147]">Opt-Out Reason</TableHead>}
                         {visibleColumns.roles && <TableHead className="font-semibold px-6 py-4 text-sm text-[#002147]">Roles Applied</TableHead>}
                         {visibleColumns.resume && <TableHead className="font-semibold px-6 py-4 text-sm text-[#002147] text-center">Resume</TableHead>}
                         <TableHead className="font-semibold px-6 py-4 text-sm text-[#002147] text-right">Actions</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {filteredApplicants.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={Object.keys(visibleColumns).filter(k => visibleColumns[k]).length + 1} className="text-center h-64 text-gray-400">
                               <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                                  <Users className="h-12 w-12 text-gray-200" />
                                  <p className="font-medium text-lg">No applicants available</p>
                               </div>
                            </TableCell>
                         </TableRow>
                      ) : (
                         paginatedApplicants.map((student) => (
                            <TableRow key={student.id} className={`hover:bg-gray-50 border-b group transition-colors ${selectedIds.includes(student.id) ? 'bg-blue-50/50' : ''}`}>
                               {visibleColumns.profile && (
                                  <TableCell className={cn("px-6 py-4 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-inherit", selectedIds.includes(student.id) && "bg-blue-50/50")}>
                                     <div className="flex items-center gap-3">
                                        <Checkbox 
                                          checked={selectedIds.includes(student.id)} 
                                          onCheckedChange={() => toggleSelection(student.id)}
                                        />
                                        <Link href={`/dashboard/students/${student.register_number}`} className="flex items-center gap-3 group/profile">
                                           <Avatar className="h-9 w-9 border">
                                              <AvatarImage src={student.profile_photo_url || ""} />
                                              <AvatarFallback className="bg-[#002147] text-white text-[10px] font-bold">
                                                {student.full_name ? student.full_name.charAt(0).toUpperCase() : '?'}
                                              </AvatarFallback>
                                           </Avatar>
                                           <div className="flex flex-col">
                                              <span className="text-sm font-semibold text-gray-900 group-hover/profile:text-[#002147] transition-colors tracking-tight">{student.full_name}</span>
                                               <span className="text-[10px] text-gray-400 tracking-wider">{student.email}</span>
                                           </div>
                                        </Link>
                                     </div>
                                  </TableCell>
                                )}
                                {visibleColumns.register_number && <TableCell className="py-4 px-6 text-sm font-medium text-gray-700">{student.register_number}</TableCell>}
                               {visibleColumns.department && (
                                 <TableCell className="py-4 px-6">
                                   <Badge variant="outline" className="text-xs font-bold py-0.5 px-2 h-6 border-gray-200 text-gray-600 uppercase">{student.department}</Badge>
                                 </TableCell>
                               )}
                               {visibleColumns.ug_cgpa && (
                                 <TableCell className="py-4 px-6 text-sm font-bold text-[#002147]">
                                    {student.ug_cgpa || 'N/A'}
                                 </TableCell>
                               )}
                               {visibleColumns.pg_cgpa && (
                                 <TableCell className="py-4 px-6 text-sm font-bold text-[#002147]">
                                    {student.pg_cgpa || 'N/A'}
                                 </TableCell>
                               )}
                               {visibleColumns.tenth_mark && <TableCell className="py-4 px-6 text-sm font-medium text-gray-600">{student.tenth_mark}%</TableCell>}
                               {visibleColumns.twelfth_mark && <TableCell className="py-4 px-6 text-sm font-medium text-gray-600">{student.twelfth_mark > 0 ? `${student.twelfth_mark}%` : '-'}</TableCell>}
                               {visibleColumns.diploma_mark && <TableCell className="py-4 px-6 text-sm font-medium text-gray-600">{student.diploma_mark > 0 ? `${student.diploma_mark}%` : '-'}</TableCell>}
                               {visibleColumns.current_backlogs && <TableCell className="py-4 px-6 text-sm text-center font-semibold">{student.current_backlogs > 0 ? <span className="text-red-600">{student.current_backlogs}</span> : <span className="text-gray-500">0</span>}</TableCell>}
                               {visibleColumns.history_of_backlogs && <TableCell className="py-4 px-6 text-sm text-center text-gray-600">{student.history_of_backlogs}</TableCell>}
                               {visibleColumns.application_status && (
                                 <TableCell className="py-4 px-6 text-center">
                                    <Badge variant="outline" className={
                                       student.application_status === 'opted_in' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 border-emerald-200' :
                                       student.application_status === 'placed' ? 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-700/20 border-green-200' : 
                                       student.application_status === 'shortlisted' ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 border-amber-200' :
                                       student.application_status === 'rejected' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 border-red-200' :
                                       student.application_status === 'opted_out' ? 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-300/20 border-gray-200' :
                                       student.application_status === 'request_to_attend' ? 'bg-[#002147]/5 text-[#002147] ring-1 ring-inset ring-[#002147]/10 border-[#002147]/20' :
                                       'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 border-emerald-200'
                                    }>
                                       {student.application_status.replace(/_/g, ' ').toUpperCase()}
                                    </Badge>
                                 </TableCell>
                               )}
                               {visibleColumns.opt_out_reason && (
                                 <TableCell className="py-4 px-6 text-sm text-gray-500 max-w-[200px]">
                                   {student.application_status === 'opted_out' && student.opt_out_reason ? (
                                     <span className="text-gray-600 italic text-xs">{student.opt_out_reason}</span>
                                   ) : (
                                     <span className="text-gray-300">-</span>
                                   )}
                                 </TableCell>
                               )}
                               {visibleColumns.roles && (
                                 <TableCell className="py-4 px-6">
                                   <div className="flex flex-wrap gap-1">
                                     {student.applied_role_ids && student.applied_role_ids.length > 0 && drive?.roles ? (
                                       student.applied_role_ids.map(roleId => {
                                         const role = drive.roles.find(r => r.id === roleId);
                                         return role ? (
                                           <Badge key={roleId} variant="secondary" className="text-[10px] whitespace-nowrap bg-blue-50 text-blue-700 hover:bg-blue-100">
                                             {role.role_name}
                                           </Badge>
                                         ) : null;
                                       })
                                     ) : (
                                       <span className="text-gray-300 text-xs">-</span>
                                     )}
                                   </div>
                                 </TableCell>
                               )}
                              {visibleColumns.resume && (
                                 <TableCell className="py-4 px-6 text-center">
                                    {student.resume_url ? (
                                       <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => openResume(student.id)}
                                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 gap-1.5 text-xs font-bold transition-all rounded-full"
                                       >
                                          <FileText className="h-3.5 w-3.5" /> RESUME
                                       </Button>
                                    ) : <span className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">N/A</span>}
                                 </TableCell>
                               )}
                               <TableCell className="text-right py-4 px-6">
                                  <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 transition-opacity">
                                          <MoreVertical className="h-4 w-4 text-gray-500" />
                                        </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end" className="w-52 p-2">
                                        {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                           <>
                                            <DropdownMenuLabel className="text-xs uppercase text-gray-400 font-bold px-2 py-1.5 tracking-widest">Change Status</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(student.id, 'opted_in')} className="cursor-pointer gap-2 py-2">
                                               <div className="h-2 w-2 rounded-full bg-[#002147]" /> Opted In
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(student.id, 'request_to_attend')} className="cursor-pointer gap-2 py-2">
                                               <div className="h-2 w-2 rounded-full bg-[#002147]/60" /> Request to Attend
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(student.id, 'shortlisted')} className="cursor-pointer gap-2 py-2">
                                               <div className="h-2 w-2 rounded-full bg-amber-400" /> Shortlist Student
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(student.id, 'placed')} className="cursor-pointer gap-2 py-2">
                                               <div className="h-2 w-2 rounded-full bg-green-500" /> Mark as Placed
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(student.id, 'opted_out')} className="cursor-pointer gap-2 py-2">
                                               <div className="h-2 w-2 rounded-full bg-gray-400" /> Opted Out
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(student.id, 'rejected')} className="text-red-500 focus:text-red-600 cursor-pointer gap-2 py-2">
                                               <div className="h-2 w-2 rounded-full bg-red-500" /> Reject Application
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                           </>
                                        )}
                                        <DropdownMenuItem className="py-2 gap-2" onClick={() => router.push(`/dashboard/students/${student.register_number}`)}>
                                           <Users className="h-3.5 w-3.5" /> View Profile
                                        </DropdownMenuItem>
                                     </DropdownMenuContent>
                                  </DropdownMenu>
                               </TableCell>
                            </TableRow>
                         ))
                      )}
                   </TableBody>
                </Table>
                </div>
                
                {/* Pagination Footer */}
                {/* Pagination Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50/50">
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                       <span className="text-sm text-gray-600">Rows per page</span>
                       <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(parseInt(val)); setPage(1); }}>
                         <SelectTrigger className="w-[70px] h-8">
                           <SelectValue placeholder="10" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="10">10</SelectItem>
                           <SelectItem value="25">25</SelectItem>
                           <SelectItem value="50">50</SelectItem>
                           <SelectItem value="100">100</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   <span className="text-sm text-gray-500">
                     Showing {Math.min((page - 1) * pageSize + 1, filteredApplicants.length)} to {Math.min(page * pageSize, filteredApplicants.length)} of {filteredApplicants.length} entries
                   </span>
                   <div className="flex gap-2">
                     <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => setPage(p => Math.max(1, p - 1))}
                         disabled={page === 1}
                     >
                         Previous
                     </Button>
                     <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => setPage(p => p + 1)}
                         disabled={page * pageSize >= filteredApplicants.length}
                     >
                         Next
                     </Button>
                   </div>
                </div>
             </TabsContent>

              <TabsContent value="eligible" className="flex-1 overflow-hidden border rounded-xl bg-white shadow-sm flex flex-col">
                <div className="p-3 border-b flex justify-between items-center bg-white">
                   <div className="flex items-center gap-2">
                       <Users className="h-4 w-4 text-[#002147]" />
                       <span className="text-sm font-bold text-[#002147] uppercase tracking-wider">Eligible Students ({filteredEligibleStudents.length})</span>
                   </div>
                   <div className="relative w-64 group">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#002147] transition-colors" />
                       <Input 
                         placeholder="Search eligible students..." 
                         className="pl-9 h-9 border-gray-200 focus-visible:ring-[#002147]/20 transition-all w-full bg-gray-50/50 hover:bg-white"
                         value={eligibleSearchTerm}
                         onChange={(e) => setEligibleSearchTerm(e.target.value)}
                       />
                   </div>
                </div>
                <div className="flex-1 overflow-auto min-h-0">
                <Table className="min-w-max">
                   <TableHeader className="bg-[#f8fafc] sticky top-0 z-10 font-semibold border-b">
                     <TableRow className="hover:bg-transparent border-b">
                       <TableHead className="px-6 py-4 w-[250px] sticky left-0 bg-[#f8fafc] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Profile</TableHead>
                       <TableHead className="px-6 py-4">Register No</TableHead>
                       <TableHead className="px-6 py-4">Dept</TableHead>
                       <TableHead className="px-6 py-4">Batch</TableHead>
                       <TableHead className="px-6 py-4 text-right">UG CGPA</TableHead>
                       <TableHead className="px-6 py-4 text-right">PG CGPA</TableHead>
                       <TableHead className="px-6 py-4 text-right">10th %</TableHead>
                       <TableHead className="px-6 py-4 text-right">12th/Dip %</TableHead>
                       <TableHead className="px-6 py-4 text-center">Backlogs</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {loadingEligible ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-24">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#002147] mb-4" />
                            <p className="text-gray-500 font-medium">Gathering eligible students...</p>
                          </TableCell>
                        </TableRow>
                     ) : filteredEligibleStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-24">
                             <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                                <Users className="h-12 w-12 text-gray-200" />
                                <p className="font-medium text-lg text-gray-500">No students match the criteria</p>
                             </div>
                          </TableCell>
                        </TableRow>
                     ) : (
                        paginatedEligibleStudents.map((student) => (
                           <TableRow key={student.id} className="hover:bg-gray-50 border-b group transition-colors">
                             <TableCell className="px-6 py-4 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-gray-50">
                                <Link href={`/dashboard/students/${student.register_number}`} className="flex items-center gap-3">
                                   <Avatar className="h-9 w-9 border">
                                      <AvatarImage src={student.profile_photo_url || ""} />
                                      <AvatarFallback className="bg-[#002147] text-white text-[10px] font-bold">
                                        {student.full_name?.charAt(0) || '?'}
                                      </AvatarFallback>
                                   </Avatar>
                                   <div className="flex flex-col">
                                      <span className="text-sm font-semibold text-gray-900 group-hover:text-[#002147] transition-colors tracking-tight">{student.full_name}</span>
                                      <span className="text-[10px] text-gray-400 tracking-wider truncate max-w-[150px]">{student.email}</span>
                                   </div>
                                </Link>
                             </TableCell>
                             <TableCell className="px-6 py-4 font-medium text-gray-700">{student.register_number}</TableCell>
                             <TableCell className="px-6 py-4">
                               <Badge variant="outline" className="text-xs font-bold py-0.5 px-2 text-gray-600 bg-gray-50 border-gray-200">
                                 {student.department}
                               </Badge>
                             </TableCell>
                             <TableCell className="px-6 py-4">{student.batch_year}</TableCell>
                             <TableCell className="px-6 py-4 font-bold text-[#002147] text-right">{student.ug_cgpa > 0 ? student.ug_cgpa.toFixed(2) : '-'}</TableCell>
                             <TableCell className="px-6 py-4 font-bold text-[#002147] text-right">{student.pg_cgpa > 0 ? student.pg_cgpa.toFixed(2) : '-'}</TableCell>
                             <TableCell className="px-6 py-4 text-gray-600 text-right">{student.tenth_mark?.toFixed(2) || '-'}%</TableCell>
                             <TableCell className="px-6 py-4 text-gray-600 text-right">{student.twelfth_mark > 0 ? `${student.twelfth_mark.toFixed(2)}%` : (student.diploma_mark > 0 ? `${student.diploma_mark.toFixed(2)}%` : '-')}</TableCell>
                             <TableCell className="px-6 py-4 text-center">
                               {student.current_backlogs > 0 ? (
                                 <span className="text-red-600 font-bold">{student.current_backlogs}</span>
                               ) : (
                                 <span className="text-gray-400">0</span>
                               )}
                             </TableCell>
                           </TableRow>
                        ))
                     )}
                   </TableBody>
                </Table>
                </div>
                
                {/* Pagination Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50/50 mt-auto font-medium">
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                       <span className="text-sm text-gray-600">Rows per page</span>
                       <Select value={eligiblePageSize.toString()} onValueChange={(val) => { setEligiblePageSize(parseInt(val)); setEligiblePage(1); }}>
                         <SelectTrigger className="w-[70px] h-8">
                           <SelectValue placeholder="10" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="10">10</SelectItem>
                           <SelectItem value="25">25</SelectItem>
                           <SelectItem value="50">50</SelectItem>
                           <SelectItem value="100">100</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                    <span className="text-sm text-gray-500">
                      Showing {Math.min((eligiblePage - 1) * eligiblePageSize + 1, filteredEligibleStudents.length)} to {Math.min(eligiblePage * eligiblePageSize, filteredEligibleStudents.length)} of {filteredEligibleStudents.length} entries
                    </span>
                    <div className="flex gap-2">
                      <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEligiblePage(p => Math.max(1, p - 1))}
                          disabled={eligiblePage === 1}
                      >
                          Previous
                      </Button>
                      <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEligiblePage(p => p + 1)}
                          disabled={eligiblePage * eligiblePageSize >= filteredEligibleStudents.length}
                      >
                          Next
                      </Button>
                   </div>
                </div>
             </TabsContent>

             <TabsContent value="details" className="p-8 bg-white border rounded-xl h-full shadow-sm overflow-auto">
                <div className="max-w-4xl space-y-10">
                   
                   {/* Job Description */}
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                         <FileText className="h-5 w-5 text-[#002147]" />
                         <h3 className="text-lg font-bold text-[#002147] uppercase tracking-wide">Job Description</h3>
                      </div>
                      <div className="p-6 bg-gray-50/80 rounded-2xl text-sm leading-8 whitespace-pre-line text-gray-700 font-medium border border-gray-100">
                         {drive.job_description || "No description provided."}
                      </div>
                   </div>

                   {/* Eligibility Criteria */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                         <Users className="h-5 w-5 text-[#002147]" />
                         <h3 className="text-lg font-bold text-[#002147] uppercase tracking-wide">Eligibility Criteria</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                         <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                            <span className="block text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground">Departments</span>
                            <span className="font-bold text-gray-800 text-base">{drive.eligible_departments?.join(', ') || 'All'}</span>
                         </div>
                         <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                            <span className="block text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground">Batches</span>
                            <span className="font-bold text-gray-800 text-base">{drive.eligible_batches?.join(', ') || 'All'}</span>
                         </div>
                         <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                            <span className="block text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground">Backlogs Allowed</span>
                            <span className="font-bold text-gray-800 text-base">{drive.max_backlogs_allowed}</span>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                           <div className="p-4 bg-blue-50/30 border border-blue-100/50 rounded-xl text-center">
                              <span className="block text-[#002147] text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-60">10th Mark</span>
                              <span className="font-black text-[#002147] text-lg">{drive.tenth_percentage ? `${drive.tenth_percentage}%` : 'N/A'}</span>
                           </div>
                           <div className="p-4 bg-blue-50/30 border border-blue-100/50 rounded-xl text-center">
                              <span className="block text-[#002147] text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-60">12th Mark</span>
                              <span className="font-black text-[#002147] text-lg">{drive.twelfth_percentage ? `${drive.twelfth_percentage}%` : 'N/A'}</span>
                           </div>
                           <div className="p-4 bg-blue-50/30 border border-blue-100/50 rounded-xl text-center">
                              <span className="block text-[#002147] text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-60">UG CGPA</span>
                              <span className="font-black text-[#002147] text-lg">{drive.ug_min_cgpa || drive.min_cgpa || 'N/A'}</span>
                           </div>
                           <div className="p-4 bg-blue-50/30 border border-blue-100/50 rounded-xl text-center">
                              <span className="block text-[#002147] text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-60">PG CGPA</span>
                              <span className="font-black text-[#002147] text-lg">{drive.pg_min_cgpa || 'N/A'}</span>
                           </div>
                      </div>
                   </div>

                    {/* Salary & Stipend */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                         <Briefcase className="h-5 w-5 text-[#002147]" />
                         <h3 className="text-lg font-bold text-[#002147] uppercase tracking-wide">Compensation</h3>
                      </div>
                       {drive.roles && drive.roles.length > 0 ? (
                           drive.roles.map((role, idx) => (
                               <div key={idx} className="bg-white border rounded-xl p-6 shadow-sm mb-4 last:mb-0">
                                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-gray-100 pb-4">
                                       <div>
                                           <h4 className="text-lg font-black text-[#002147]">{role.role_name}</h4>
                                       </div>
                                       <div className="flex gap-4">
                                           <div className="px-4 py-2 bg-green-50 rounded-lg border border-green-100">
                                                <div className="text-[10px] uppercase font-black text-green-700 tracking-widest mb-1">CTC</div>
                                                <div className="text-xl font-black text-green-900">{role.ctc || '-'}</div>
                                           </div>
                                            {role.salary > 0 && (
                                                <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
                                                    <div className="text-[10px] uppercase font-black text-blue-700 tracking-widest mb-1">Salary</div>
                                                    <div className="text-xl font-black text-blue-900">{role.salary.toLocaleString()}</div>
                                                </div>
                                            )}
                                           <div className="px-4 py-2 bg-amber-50 rounded-lg border border-amber-100">
                                                <div className="text-[10px] uppercase font-black text-amber-700 tracking-widest mb-1">Stipend</div>
                                                <div className="text-xl font-black text-amber-900">{role.stipend || '-'}</div>
                                           </div>
                                       </div>
                                   </div>
                               </div>
                           ))
                       ) : (
                            <div className="p-8 text-center border border-dashed rounded-xl text-gray-400">
                                <p>No specific role details provided.</p>
                            </div>
                       )}
                   </div>

                   {/* Attachments */}
                   <div className="space-y-6 pb-8">
                      <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                         <FileText className="h-5 w-5 text-[#002147]" />
                         <h3 className="text-lg font-bold text-[#002147] uppercase tracking-wide flex items-center gap-2">
                           Attachments 
                           <Badge variant="secondary" className="font-black rounded-full bg-gray-100 text-gray-500 h-5 px-1.5">{drive.attachments?.length || 0}</Badge>
                         </h3>
                      </div>
                      {drive.attachments && drive.attachments.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {drive.attachments.map((file, idx) => (
                                  <a 
                                    key={idx} 
                                    href={file.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl hover:bg-white transition-colors group bg-gray-50/40"
                                  >
                                      <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:bg-blue-600 transition-colors border border-gray-50">
                                          <FileText className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className="font-bold text-sm text-[#002147] truncate group-hover:text-blue-700 transition-colors uppercase tracking-tight">{file.name}</p>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Click to preview</p>
                                      </div>
                                      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                                        <Download className="h-4 w-4 text-blue-600" />
                                      </div>
                                  </a>
                              ))}
                          </div>
                      ) : (
                          <div className="p-10 border border-dashed rounded-2xl flex flex-col items-center justify-center text-gray-400 space-y-2">
                             <FileText className="h-8 w-8 opacity-20" />
                             <p className="text-sm font-medium">No drive assets available</p>
                          </div>
                      )}
                   </div>

                </div>
             </TabsContent>

             <TabsContent value="rounds" className="p-8 bg-white border rounded-xl h-full shadow-sm overflow-auto">
                <div className="flex items-center justify-between mb-8 border-b-2 border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-[#002147]" />
                    <h3 className="text-xl font-bold text-[#002147] tracking-tight uppercase">Drive Schedule</h3>
                  </div>
                  <Badge variant="outline" className="font-bold text-[#002147] border-[#002147]/20 px-3 py-1 bg-[#002147]/5">
                    {drive.rounds?.length || 0} ROUNDS
                  </Badge>
                </div>

                <div className="space-y-6 max-w-3xl pl-4">
                   {drive.rounds && drive.rounds.length > 0 ? (
                      <div className="relative border-l-2 border-dashed border-gray-200 ml-3 space-y-12 my-6">
                         {drive.rounds.map((round, i) => (
                            <div key={i} className="relative pl-10 group">
                                {/* Dot */}
                                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-[3px] border-white bg-[#002147] shadow-sm z-10 group-hover:scale-125 transition-transform" />
                                
                                <div className="space-y-3">
                                   <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                      <h4 className="font-bold text-xl text-[#002147] tracking-tight">{round.name}</h4>
                                      <Badge variant="secondary" className="w-fit bg-blue-50 text-blue-700 border-blue-100/50 gap-1.5 font-bold">
                                         <Calendar className="h-3 w-3" /> {formatDateTime(round.date)}
                                      </Badge>
                                   </div>
                                   <div className="text-gray-600 text-sm leading-relaxed max-w-2xl bg-gray-50 p-5 rounded-2xl border border-gray-100/50 hover:bg-white hover:shadow-md transition-all">
                                      {round.description || "No description details available."}
                                   </div>
                                </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="flex flex-col items-center justify-center p-20 border border-dashed rounded-3xl text-gray-300 space-y-4">
                         <Clock className="h-12 w-12 opacity-20" />
                         <p className="font-bold">Process timeline not yet announced</p>
                      </div>
                   )}
                </div>
             </TabsContent>
          </Tabs>
       </div>
    </div>
  );
}
