'use client';

import { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Download,
  Trash2,
  Eye,
  Edit,
  FileText
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
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { BulkUploadDialog } from '@/components/student/bulk-upload-dialog';

// Mock Data
const MOCK_STUDENTS = Array.from({ length: 20 }, (_, i) => ({
  id: `STU${2024001 + i}`,
  regNo: `21CSR${String(i + 1).padStart(3, '0')}`,
  name: i % 2 === 0 ? `Student Name ${i + 1}` : `Another Student ${i + 1}`,
  email: `student${i + 1}@kongu.edu`,
  passoutYear: '2025',
  profileStatus: i % 4 === 0 ? 'Inactive' : 'Active',
  studentType: i % 5 === 0 ? 'Lateral' : 'Regular',
  department: i % 4 === 0 ? 'ECE' : 'CSE',
  degree: 'B.E',
  specialization: i % 4 === 0 ? 'Electronics' : 'Computer Science',
  resumeLink: '#',
  internshipCount: i % 3,
  internshipCompanies: i % 3 === 0 ? ['Zoho'] : (i % 3 === 1 ? ['Infosys', 'TCS'] : []),
  placedCount: i % 5 === 0 ? 1 : 0,
  placedCompanies: i % 5 === 0 ? ['Zoho'] : [],
  driveStatus: i % 4 === 0 ? 'Not Interested' : 'Interested',
  cgpa: (7.5 + (i % 25) / 10).toFixed(2),
}));

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [filterBatch, setFilterBatch] = useState('2025');
  const [filterDept, setFilterDept] = useState('All');

  const [rowsPerPage, setRowsPerPage] = useState('10');
  const [data, setData] = useState(MOCK_STUDENTS); // Use state for data to simulate update
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredStudents = data.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.regNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(prev => prev.filter(s => s !== id));
    } else {
      setSelectedStudents(prev => [...prev, id]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#002147]">Manage Students</h2>
          <p className="text-muted-foreground">
            View and manage student details, academic records, and placement status.
          </p>
        </div>
        <div className="flex items-center space-x-2">
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
           <Button className="bg-[#002147] hover:bg-[#003366]">
             Add Student
           </Button>
        </div>
      </div>

      <BulkUploadDialog 
         isOpen={isUploadOpen} 
         onClose={() => setIsUploadOpen(false)}
         onSuccess={() => {
             // Refresh data logic would go here. For now we just close.
             console.log('Upload success, refreshing data...');
         }} 
      />

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 p-4 bg-white border rounded-lg shadow-sm">
           <div className="relative w-64">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
             <Input 
               placeholder="Search students..." 
               className="pl-9"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           
           <Select value={filterBatch} onValueChange={setFilterBatch}>
             <SelectTrigger className="w-[120px]">
               <SelectValue placeholder="Batch" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="2024">2024</SelectItem>
               <SelectItem value="2025">2025</SelectItem>
               <SelectItem value="2026">2026</SelectItem>
             </SelectContent>
           </Select>

           <Select value={filterDept} onValueChange={setFilterDept}>
             <SelectTrigger className="w-[150px]">
               <SelectValue placeholder="Department" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="All">All Depts</SelectItem>
               <SelectItem value="CSE">CSE</SelectItem>
               <SelectItem value="ECE">ECE</SelectItem>
               <SelectItem value="IT">IT</SelectItem>
               <SelectItem value="EEE">EEE</SelectItem>
               <SelectItem value="MECH">MECH</SelectItem>
             </SelectContent>
           </Select>

           <Button variant="ghost" size="icon">
             <Filter className="h-4 w-4 text-gray-500" />
           </Button>

           <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
             <span>{filteredStudents.length} records found</span>
           </div>
        </div>

        {/* Table Container - Horizontal Scroll */}
        <div className="border rounded-lg bg-white overflow-hidden shadow-sm flex flex-col mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                 <tr>
                   {/* Sticky Profile Column */}
                   <th className="p-4 min-w-[300px] sticky left-0 top-0 bg-gray-50 z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b">
                     <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                        <span>Profile</span>
                     </div>
                   </th>
                   <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Reg No</th>
                   <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Passout</th>
                   <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Profile Status</th>
                   <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Student Type</th>
                   <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Dept</th>
                   <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Degree & Specialization</th>
                   <th className="p-4 text-center sticky top-0 bg-gray-50 z-40 border-b">Resume</th>
                   <th className="p-4 text-center sticky top-0 bg-gray-50 z-40 border-b">Internships</th>
                   <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Internship Companies</th>
                   <th className="p-4 text-center sticky top-0 bg-gray-50 z-40 border-b">Placed Count</th>
                   <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Placed Companies</th>
                   <th className="p-4 sticky top-0 bg-gray-50 z-40 border-b">Drive Status</th>
                   <th className="p-4 text-right sticky top-0 bg-gray-50 z-40 border-b">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    {/* Sticky Profile Data */}
                    <td className="p-4 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => toggleSelect(student.id)}
                        />
                        <div className="flex items-center gap-3">
                           <Avatar>
                             <AvatarImage src={`https://i.pravatar.cc/150?u=${student.id}`} />
                             <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col">
                             <span className="font-medium text-gray-900">{student.name}</span>
                             <span className="text-xs text-gray-500">{student.email}</span>
                           </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-[#002147]">{student.regNo}</td>
                    <td className="p-4">{student.passoutYear}</td>
                    <td className="p-4">
                       <Badge variant="outline" className={cn(
                         "font-normal",
                         student.profileStatus === 'Active' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                       )}>
                         {student.profileStatus}
                       </Badge>
                    </td>
                    <td className="p-4">{student.studentType}</td>
                    <td className="p-4">
                      <Badge variant="outline" className="font-normal bg-indigo-50 text-indigo-700 border-indigo-200">
                        {student.department}
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-600">
                       {student.degree} - {student.specialization}
                    </td>
                    <td className="p-4 text-center">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                         <FileText className="h-4 w-4" />
                       </Button>
                    </td>
                    <td className="p-4 text-center">
                       {student.internshipCount > 0 ? (
                         <Badge variant="secondary">{student.internshipCount}</Badge>
                       ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="p-4 text-gray-600 truncate max-w-[200px]">
                       {student.internshipCompanies.length > 0 ? student.internshipCompanies.join(', ') : '-'}
                    </td>
                    <td className="p-4 text-center">
                       {student.placedCount > 0 ? (
                         <Badge className="bg-green-600">{student.placedCount}</Badge>
                       ) : <span className="text-gray-400">-</span>}
                    </td>
                     <td className="p-4 text-gray-600 truncate max-w-[200px]">
                       {student.placedCompanies.length > 0 ? student.placedCompanies.join(', ') : '-'}
                    </td>
                    <td className="p-4">
                       <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          student.driveStatus === 'Interested' ? "text-green-600 bg-green-50" : "text-gray-500 bg-gray-100"
                       )}>
                         {student.driveStatus}
                       </span>
                    </td>
                    <td className="p-4 text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8">
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem>
                             <Eye className="mr-2 h-4 w-4" /> View Details
                           </DropdownMenuItem>
                           <DropdownMenuItem>
                             <Edit className="mr-2 h-4 w-4" /> Edit
                           </DropdownMenuItem>
                           <DropdownMenuItem className="text-red-600">
                             <Trash2 className="mr-2 h-4 w-4" /> Delete
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
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
             <span className="text-sm text-muted-foreground">Showing 1 to {filteredStudents.length} of {filteredStudents.length} entries</span>
             <div className="flex gap-2">
               <Button variant="outline" size="sm" disabled>Previous</Button>
               <Button variant="outline" size="sm" disabled>Next</Button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
