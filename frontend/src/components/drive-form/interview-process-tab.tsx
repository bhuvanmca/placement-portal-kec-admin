'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Download, 
  Filter, 
  MoreHorizontal, 
  Search, 
  Trash2, 
  UserCheck, 
  UserX,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Mock Data for Students
const STUDENTS = [
  { id: '1', email: 'aadhavangv.22ece@kongu.edu', regNo: '22ECR001', name: 'AADHAVAN G V', campus: 'KONGU', passOut: '2026', status: 'Opted-Out' },
  { id: '2', email: 'aakasht.22csd@kongu.edu', regNo: '22CDR001', name: 'Aakash T', campus: 'KONGU', passOut: '2026', status: 'Opted-Out' },
  { id: '3', email: 'aarumugans.22cse@kongu.edu', regNo: '22CSR002', name: 'Aarumugan S', campus: 'KONGU', passOut: '2026', status: 'Opted-In' },
  { id: '4', email: 'kaviya.22it@kongu.edu', regNo: '22ITR056', name: 'Kaviya M', campus: 'KONGU', passOut: '2026', status: 'Placed' },
  { id: '5', email: 'rahul.22mech@kongu.edu', regNo: '22MER089', name: 'Rahul K', campus: 'KONGU', passOut: '2026', status: 'Waiting' },
  { id: '6', email: 'aadhavangv.22ece@kongu.edu', regNo: '22ECR001', name: 'AADHAVAN G V', campus: 'KONGU', passOut: '2026', status: 'Opted-Out' },
  { id: '7', email: 'aakasht.22csd@kongu.edu', regNo: '22CDR001', name: 'Aakash T', campus: 'KONGU', passOut: '2026', status: 'Opted-Out' },
  { id: '8', email: 'aarumugans.22cse@kongu.edu', regNo: '22CSR002', name: 'Aarumugan S', campus: 'KONGU', passOut: '2026', status: 'Opted-In' },
  { id: '9', email: 'kaviya.22it@kongu.edu', regNo: '22ITR056', name: 'Kaviya M', campus: 'KONGU', passOut: '2026', status: 'Placed' },
  { id: '10', email: 'rahul.22mech@kongu.edu', regNo: '22MER089', name: 'Rahul K', campus: 'KONGU', passOut: '2026', status: 'Waiting' },
];

export default function InterviewProcessTab() {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('Eligible'); // Eligible, Opted-In, Opted-Out, etc. (Though UI shows counters)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(STUDENTS.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, id]);
    } else {
      setSelectedStudents(prev => prev.filter(s => s !== id));
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 gap-4 rounded-lg">
       {/* Top Summary Cards / Navigation */}
       <div className="flex space-x-2 overflow-x-auto pb-2">
         {[
           { label: 'Eligible', count: 424, color: 'bg-[#002147] text-white' },
           { label: 'Opted-In', count: 279, color: 'bg-white text-gray-700 border' },
           { label: 'Opted-Out', count: 132, color: 'bg-white text-gray-700 border' },
           { label: 'Waiting', count: 0, color: 'bg-white text-gray-700 border' },
           { label: 'Placed', count: 0, color: 'bg-white text-gray-700 border' },
           { label: 'Removed', count: 0, color: 'bg-white text-gray-700 border' },
           { label: 'Not', count: 0, color: 'bg-white text-gray-700 border' }, // Copied from screenshot "Not ..."
         ].map((item) => (
           <button 
             key={item.label}
             className={cn(
               "flex items-center space-x-2 px-4 py-2 rounded-md shadow-sm min-w-[140px] justify-between",
               item.color
             )}
           >
             <span className="font-medium">{item.label}</span>
             <span className={cn(
               "px-2 py-0.5 rounded-full text-xs font-bold",
               item.label === 'Eligible' ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
             )}>
               {item.count}
             </span>
           </button>
         ))}
       </div>

       {/* Filters Bar */}
       <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
          <div className="flex flex-wrap gap-4">
             <Select>
               <SelectTrigger className="w-40 bg-white">
                 <SelectValue placeholder="Campus" />
               </SelectTrigger>
               <SelectContent><SelectItem value="KONGU">KONGU</SelectItem></SelectContent>
             </Select>
             <Select>
               <SelectTrigger className="w-40 bg-white">
                 <SelectValue placeholder="Pass Out" />
               </SelectTrigger>
               <SelectContent><SelectItem value="2026">2026</SelectItem></SelectContent>
             </Select>
             <Select>
                <SelectTrigger className="w-40 bg-white">
                    <SelectValue placeholder="Student Status" />
                </SelectTrigger>
                <SelectContent><SelectItem value="Regular">Regular</SelectItem></SelectContent>
             </Select>
             
             <Button variant="outline" size="sm" className="text-gray-500 gap-2">
                <Filter size={14} /> More Filters (0)
             </Button>

             <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" className="text-[#002147] border-[#002147]">
                   <X size={14} className="mr-1" /> Clear All
                </Button>
                <Button size="sm" className="bg-[#002147] hover:bg-[#003366]">
                   <Filter size={14} className="mr-1" /> Apply Filter
                </Button>
             </div>
          </div>
          
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                 {/* Toolbar Actions */}
                 <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-gray-100 rounded-md text-gray-600"><Filter size={18} /></button>
                    <button className="p-2 hover:bg-gray-100 rounded-md text-gray-600"><Download size={18} /></button>
                 </div>
                 
                 <div className="relative w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input placeholder="Email or Registration Number or Name" className="pl-9" />
                 </div>
              </div>

               <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Total List : 424</span>
                  <div className="flex items-center gap-2">
                     <span>View</span>
                     <Select defaultValue="10">
                        <SelectTrigger className="w-16 h-8">
                             <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                  <span>1 of 43 &gt;</span>
               </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button variant="link" className="text-blue-600 h-8 px-0" onClick={() => handleSelectAll(true)}>Select All 424</Button>
              <div className="h-6 w-px bg-gray-300 mx-2 self-center"></div>
              
              <Tooltip>
                 <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-600">
                       <UserCheck size={14} /> Opt-In
                    </Button>
                 </TooltipTrigger>
                 <TooltipContent>Mark selected as Opted-In</TooltipContent>
              </Tooltip>

              <Tooltip>
                 <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-600">
                       <UserX size={14} /> Opt-Out
                    </Button>
                 </TooltipTrigger>
                 <TooltipContent>Mark selected as Opted-Out</TooltipContent>
              </Tooltip>

              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-600">
                         Waiting
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as Waiting</TooltipContent>
              </Tooltip>

              <Tooltip>
                  <TooltipTrigger asChild>
                       <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-600">
                         Placed
                       </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as Placed</TooltipContent>
              </Tooltip>

              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-600">
                         <Trash2 size={14} /> Remove
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove selected students</TooltipContent>
              </Tooltip>

              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-600">
                         <Download size={14} /> Download Resume
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download resumes</TooltipContent>
              </Tooltip>
          </div>
       </div>

       {/* Student Table */}
       <TooltipProvider>
       <div className="bg-white border rounded-lg overflow-hidden flex-1 flex flex-col shadow-sm">
          <div className="overflow-auto flex-1">
             <table className="w-full text-sm text-left">
                <thead className="text-xs text-[#002147] uppercase bg-[#E6F0FA] sticky top-0 z-10">
                   <tr>
                      <th className="p-4 w-10">
                         <Checkbox 
                            checked={selectedStudents.length === STUDENTS.length && STUDENTS.length > 0}
                            onCheckedChange={(c) => handleSelectAll(!!c)}
                         />
                      </th>
                      <th className="px-6 py-3 font-bold">Email</th>
                      <th className="px-6 py-3 font-bold">Reg Number</th>
                      <th className="px-6 py-3 font-bold">Status</th>
                      <th className="px-6 py-3 font-bold">Name</th>
                      <th className="px-6 py-3 font-bold">Campus</th>
                      <th className="px-6 py-3 font-bold">Pass Out</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {STUDENTS.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                         <td className="p-4">
                             <Checkbox 
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={(c) => handleSelectOne(student.id, !!c)}
                             />
                         </td>
                         <td className="px-6 py-4 text-gray-600">{student.email}</td>
                         <td className="px-6 py-4 text-gray-600">{student.regNo}</td>
                         <td className="px-6 py-4">
                             <span className={cn(
                                "text-xs font-medium px-2 py-1 rounded-full border",
                                student.status === 'Opted-In' && "bg-green-50 text-green-600 border-green-200",
                                student.status === 'Opted-Out' && "bg-red-50 text-red-600 border-red-200",
                                student.status === 'Placed' && "bg-blue-50 text-blue-600 border-blue-200",
                                student.status === 'Waiting' && "bg-yellow-50 text-yellow-600 border-yellow-200",
                             )}>
                                {student.status}
                             </span>
                         </td>
                         <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                         <td className="px-6 py-4 text-gray-500">{student.campus}</td>
                         <td className="px-6 py-4 text-gray-500">{student.passOut}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
       </TooltipProvider>
    </div>
  );
}
