'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Download,
  Trash2,
  Eye,
  Edit,
  FileText,
  Settings,
  X,
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { BulkUploadDialog } from '@/components/student/bulk-upload-dialog';
import { studentService, Student } from '@/services/student.service';
import { toast } from 'sonner';

import { AddStudentDialog } from '@/components/student/add-student-dialog'; 
import { DEPARTMENTS } from '@/constants/departments';

import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';

export default function StudentsPage() {
  const router = useRouter();
  
  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedStudents, setSelectedStudents] = useState<number[]>([]); // Changed to number ID

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  
  // Advanced Filter Dialog State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [advFilters, setAdvFilters] = useState({
    studentType: [] as string[],
    gender: [] as string[],
    willingness: [] as string[],
  });

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
    profile: true,
    regNo: true,
    batch: true,
    dept: true,
    mobile: true,
    actions: true,
  });

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false); // [NEW] State

  // Fetch Data
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentService.getAllStudents({
        dept: filterDept === 'All' ? undefined : filterDept,
        batch: filterBatch !== 'All' ? parseInt(filterBatch) : undefined,
        search: searchTerm,
        page: page,
        limit: pageSize,
      });
      // Handle the new response structure
      setStudents(response.data || []);
      setTotalRecords(response.meta.total);
    } catch (error) {
      console.error("Failed to fetch students", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  // Initial Fetch & Filter Change
  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchStudents();
    }, 500);
    return () => clearTimeout(timer);
  }, [filterDept, filterBatch, searchTerm, page, pageSize]);

  // Handlers
  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(prev => prev.filter(s => s !== id));
    } else {
      setSelectedStudents(prev => [...prev, id]);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentService.deleteStudent(id);
      toast.success("Student deleted");
      fetchStudents(); // Refresh
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleBlockToggle = async (id: number, currentStatus: boolean) => {
      try {
          await studentService.toggleBlockStatus(id, !currentStatus);
          toast.success(currentStatus ? "Student unblocked" : "Student blocked");
          fetchStudents();
      } catch (err) {
          toast.error("Failed to update status");
      }
  };

  const handleRowClick = (id: number) => {
    router.push(`/dashboard/students/${id}`);
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-8 pt-6">
      {/* Dialog */}
      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={async () => {
             await studentService.bulkDeleteStudents(selectedStudents);
             toast.success("Students deleted successfully");
             setSelectedStudents([]);
             fetchStudents();
        }}
        title="Delete Students"
        description="This action cannot be undone. This will permanently delete the selected students and their complete academic history."
        itemCount={selectedStudents.length}
      />

      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#002147]">Manage Students</h2>
          <p className="text-muted-foreground">
            View and manage student details, academic records, and placement status.
          </p>
        </div>
        <div className="flex items-center space-x-2">
            {selectedStudents.length > 0 && (
              <Button 
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedStudents.length})
              </Button>
            )}
           <Button variant="outline">
             <Download className="mr-2 h-4 w-4" />
             Export
           </Button>
           <Button 
              variant="outline" 
              className="text-[#002147] border-[#002147] hover:bg-[#002147]/5 hover:text-[#002147]"
              onClick={() => setIsUploadOpen(true)}
           >
              Bulk Upload
           </Button>
           <Button 
             className="bg-[#002147] hover:bg-[#003366]"
             onClick={() => setIsAddStudentOpen(true)}
           >
             Add Student
           </Button>
        </div>
      </div>

      <BulkUploadDialog 
         isOpen={isUploadOpen} 
         onClose={() => setIsUploadOpen(false)}
         onSuccess={() => {
             toast.success("Bulk Upload Successful");
             fetchStudents();
         }} 
      />

      <AddStudentDialog 
         isOpen={isAddStudentOpen} 
         onClose={() => setIsAddStudentOpen(false)}
         onSuccess={() => {
             fetchStudents(); // Refresh list
         }}
      />

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 p-4 bg-white border rounded-lg shadow-sm">
           <div className="relative w-64">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
             <Input 
               placeholder="Search students..." 
               className="pl-9"
               value={searchTerm}
               onChange={(e) => {
                 setSearchTerm(e.target.value);
                 setPage(1); // Reset to page 1 on search
               }}
             />
           </div>
           
           <Select value={filterBatch} onValueChange={(val) => { setFilterBatch(val); setPage(1); }}>
             <SelectTrigger className="w-[120px]">
               <SelectValue placeholder="Batch" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="All">All Batches</SelectItem>
               <SelectItem value="2024">2024</SelectItem>
               <SelectItem value="2025">2025</SelectItem>
               <SelectItem value="2026">2026</SelectItem>
             </SelectContent>
           </Select>

           <Select value={filterDept} onValueChange={(val) => { setFilterDept(val); setPage(1); }}>
             <SelectTrigger className="w-[150px]">
               <SelectValue placeholder="Department" />
             </SelectTrigger>
             <SelectContent className="max-h-[200px]">
               <SelectItem value="All">All Depts</SelectItem>
               {DEPARTMENTS.map((dept) => (
                   <SelectItem key={dept} value={dept}>
                       {dept}
                   </SelectItem>
               ))}
             </SelectContent>
           </Select>

           {/* Advanced Filter Dialog */}
           <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Filter className="h-4 w-4 text-gray-500" />
                  {(advFilters.studentType.length > 0 || advFilters.willingness.length > 0) && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Filter Students</DialogTitle>
                  <DialogDescription>
                    Narrow down the student list with specific criteria.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  
                  {/* Student Type */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-900">Student Type</h4>
                    <div className="flex flex-wrap gap-4">
                      {['Regular', 'Lateral', 'Transfer'].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox id={type} 
                            checked={advFilters.studentType.includes(type)}
                            onCheckedChange={(checked) => {
                                setAdvFilters(prev => ({
                                    ...prev,
                                    studentType: checked 
                                      ? [...prev.studentType, type]
                                      : prev.studentType.filter(t => t !== type)
                                }));
                            }}
                          />
                          <label htmlFor={type} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Willingness */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-900">Placement Willingness</h4>
                    <div className="flex flex-wrap gap-4">
                      {['Willing', 'Not Willing', 'Higher Studies'].map((opt) => (
                         <div key={opt} className="flex items-center space-x-2">
                          <Checkbox id={opt} 
                             checked={advFilters.willingness.includes(opt)}
                             onCheckedChange={(checked) => {
                                 setAdvFilters(prev => ({
                                     ...prev,
                                     willingness: checked 
                                       ? [...prev.willingness, opt]
                                       : prev.willingness.filter(w => w !== opt)
                                 }));
                             }}
                          />
                          <label htmlFor={opt} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {opt}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                     setAdvFilters({ studentType: [], gender: [], willingness: [] });
                     setIsFilterOpen(false);
                  }}>Clear All</Button>
                  <Button onClick={() => setIsFilterOpen(false)} className="bg-[#002147]">Apply Filters</Button>
                </DialogFooter>
              </DialogContent>
           </Dialog>

           {/* Column Visibility */}
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="ml-2">
                  <Settings className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(visibleColumns).map((col) => (
                   <DropdownMenuCheckboxItem
                      key={col}
                      checked={visibleColumns[col as keyof typeof visibleColumns]}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [col]: checked }))}
                      className="capitalize"
                   >
                     {col.replace(/([A-Z])/g, ' $1').trim()}
                   </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
           </DropdownMenu>

           <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
             {loading ? <span>Loading...</span> : <span>{totalRecords} records found</span>}
           </div>
        </div>

        {/* Table Container */}
        <div className="border rounded-lg bg-white overflow-hidden shadow-sm flex flex-col mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                 <tr>
                   {visibleColumns.profile && (
                     <th className="p-4 min-w-[300px] sticky left-0 top-0 bg-gray-50 z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b">
                       <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={students.length > 0 && selectedStudents.length === students.length}
                            onCheckedChange={toggleSelectAll}
                          />
                          <span>Profile</span>
                       </div>
                     </th>
                   )}
                   {visibleColumns.regNo && <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Reg No</th>}
                   {visibleColumns.batch && <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Batch</th>}
                   {visibleColumns.dept && <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Dept</th>}
                   {visibleColumns.mobile && <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Mobile</th>}
                   {visibleColumns.actions && <th className="p-4 text-right sticky top-0 bg-gray-50 z-40 border-b">Actions</th>}
                 </tr>
              </thead>
              <tbody className="divide-y relative">
                {loading ? (
                   <tr>
                     <td colSpan={10} className="p-8 text-center text-gray-500">
                        Loading students...
                     </td>
                   </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500">
                       No students found.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr 
                      key={student.id} 
                      className={cn(
                          "hover:bg-gray-50 transition-colors cursor-pointer",
                          student.is_blocked && "opacity-60 bg-red-50"
                      )}
                      onClick={() => handleRowClick(student.id)}
                    >
                      {/* Sticky Profile Data */}
                      {visibleColumns.profile && (
                        <td className={cn("p-4 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]", student.is_blocked && "bg-red-50")} onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={() => toggleSelect(student.id)}
                            />
                            <div className="flex items-center gap-3" onClick={() => handleRowClick(student.id)}>
                               <div className="relative">
                                   <Avatar>
                                     <AvatarImage src={student.profile_photo_url || ""} />
                                     <AvatarFallback className="bg-[#002147] text-white text-xs font-semibold">
                                       {student.full_name ? student.full_name.charAt(0).toUpperCase() : '?'}
                                     </AvatarFallback>
                                   </Avatar>
                                   {student.is_blocked && (
                                       <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white" title="Blocked" />
                                   )}
                               </div>
                               <div className="flex flex-col">
                                 <span className="font-medium text-gray-900 flex items-center gap-2">
                                     {student.full_name}
                                     {student.is_blocked && <Badge variant="destructive" className="h-4 px-1 text-[10px]">Blocked</Badge>}
                                 </span>
                                 <span className="text-xs text-gray-500">{student.email}</span>
                               </div>
                            </div>
                          </div>
                        </td>
                      )}
                      
                      {visibleColumns.regNo && <td className="p-4 font-medium text-[#002147]">{student.register_number}</td>}
                      {visibleColumns.batch && <td className="p-4">{student.batch_year}</td>}
                      {visibleColumns.dept && (
                        <td className="p-4">
                          <Badge variant="outline" className="font-normal bg-indigo-50 text-indigo-700 border-indigo-200">
                            {student.department}
                          </Badge>
                        </td>
                      )}
                      {visibleColumns.mobile && <td className={`p-4 ${!student.mobile ? 'text-gray-400 italic' : 'text-gray-600'}`}>{student.mobile || 'NA'}</td>}
                      
                      {visibleColumns.actions && (
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8">
                                 <MoreHorizontal className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                               <DropdownMenuLabel>Actions</DropdownMenuLabel>
                               <DropdownMenuSeparator />
                               <DropdownMenuItem onClick={() => handleRowClick(student.id)}>
                                 <Eye className="mr-2 h-4 w-4" /> View Profile
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleBlockToggle(student.id, student.is_blocked)}>
                                  {student.is_blocked ? (
                                      <><UserIcon className="mr-2 h-4 w-4 text-green-600" /> Unblock User</>
                                  ) : (
                                      <><UserIcon className="mr-2 h-4 w-4 text-red-600" /> Block User</>
                                  )}
                               </DropdownMenuItem>
                               <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(student.id)}>
                                 <Trash2 className="mr-2 h-4 w-4" /> Delete Student
                               </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(parseInt(val)); setPage(1); }}>
                  <SelectTrigger className="w-[70px] h-8 bg-white">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <span className="text-sm text-muted-foreground">
               Showing {Math.min((page - 1) * pageSize + 1, totalRecords)} to {Math.min(page * pageSize, totalRecords)} of {totalRecords} entries
             </span>
             <div className="flex gap-2">
               <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setPage(p => Math.max(1, p - 1))}
                   disabled={page === 1 || loading}
               >
                   Previous
               </Button>
               <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setPage(p => p + 1)}
                   disabled={page * pageSize >= totalRecords || loading}
               >
                   Next
               </Button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
