'use client';

import { useState, useEffect, use } from 'react';
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
  ArrowLeft
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
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { driveService, Drive } from '@/services/drive.service';
import { toast } from 'sonner';

interface DriveApplicant {
    student_id: number;
    full_name: string;
    register_number: string;
    email: string;
    department: string;
    cgpa: number;
    status: string;
    resume_url: string;
    applied_at: string;
}

export default function DriveDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [drive, setDrive] = useState<Drive | null>(null);
  const [applicants, setApplicants] = useState<DriveApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tabParam || "applicants");

  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Drive Info - Reusing getAllDrives locally for now, 
      // ideally we need getDriveById but list is small so finding it is fine
      // OR we can rely on list fetch. 
      // Let's assume we implement getDriveById later, for now we filter from all.
      const allDrives = await driveService.getAdminDrives(); 
      const foundDrive = allDrives.find(d => d.id === parseInt(id));
      
      if (foundDrive) {
         setDrive(foundDrive);
         // Only fetch applicants if drive found
         try {
            const applicantsData = await driveService.getDriveApplicants(parseInt(id));
            setApplicants(applicantsData as any); // Type assertion until service is strict
         } catch (e) {
            // console.error("Failed to fetch applicants");
         }
      } else {
         toast.error("Drive not found");
         router.push('/dashboard/drives');
      }

    } catch (error) {
      // console.error(error);
      toast.error("Failed to load drive details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleStatusUpdate = async (studentId: number, newStatus: string) => {
     try {
        await driveService.updateApplicationStatus(parseInt(id), studentId, newStatus);
        toast.success(`Marked as ${newStatus}`);
        // Refresh list
        const updated = await driveService.getDriveApplicants(parseInt(id));
        setApplicants(updated as any);
     } catch (e) {
        toast.error("Failed to update status");
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
         //  console.error(e);
          toast.error("Failed to open resume");
      }
  };

  if (loading) {
     return <div className="p-10 text-center">Loading drive details...</div>;
  }

  if (!drive) return null;

  const filteredApplicants = applicants.filter(a => 
     a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     a.register_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50/50">
       {/* Top Header */}
       <div className="bg-white border-b px-8 py-6">
          <div className="flex items-start justify-between">
             <div className="space-y-1">
                <div className="flex items-center gap-3">
                   <Link href="/dashboard/drives">
                      <Button variant="ghost" size="icon" className="-ml-3">
                         <ArrowLeft className="h-4 w-4" />
                      </Button>
                   </Link>
                   <h1 className="text-2xl font-bold text-[#002147]">{drive.company_name}</h1>
                   <Badge variant="outline">{drive.drive_type}</Badge>
                   <Badge className={drive.status === 'open' ? 'bg-green-600' : 'bg-gray-500'}>{drive.status}</Badge>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500 pl-10">
                   <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{drive.roles && drive.roles.length > 0 ? (drive.roles.length > 1 ? `${drive.roles.length} Roles` : drive.roles[0].role_name) : 'Various Roles'}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{drive.location} <span className="text-gray-400 text-xs text-muted-foreground">({drive.location_type || 'On-Site'})</span></span>
                   </div>
                   <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(drive.drive_date).toDateString()}</span>
                   </div>
                </div>
             </div>
             <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push(`/dashboard/drives/${id}/edit`)}>
                   Edit Details
                </Button>
                <Button className="bg-[#002147]">
                   <Download className="mr-2 h-4 w-4" /> Export Data
                </Button>
             </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mt-8 pl-10">
             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="text-sm text-blue-600 font-medium">Total Applicants</div>
                <div className="text-2xl font-bold text-blue-900">{applicants.length}</div>
             </div>
             <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <div className="text-sm text-yellow-600 font-medium">Shortlisted</div>
                <div className="text-2xl font-bold text-yellow-900">
                   {applicants.filter(a => a.status === 'shortlisted').length}
                </div>
             </div>
             <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="text-sm text-green-600 font-medium">Placed</div>
                <div className="text-2xl font-bold text-green-900">
                   {applicants.filter(a => a.status === 'placed').length}
                </div>
             </div>
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="text-sm text-gray-600 font-medium">Pending Review</div>
                <div className="text-2xl font-bold text-gray-900">
                   {applicants.filter(a => a.status === 'opted_in').length}
                </div>
             </div>
          </div>
       </div>

       {/* Main Content */}
       <div className="flex-1 p-8 overflow-hidden flex flex-col">
          <Tabs defaultValue="applicants" className="h-full flex flex-col" onValueChange={setActiveTab}>
             <div className="flex items-center justify-between mb-4">
                <TabsList>
                   <TabsTrigger value="applicants">Applicants</TabsTrigger>
                   <TabsTrigger value="details">Drive Details</TabsTrigger>
                   <TabsTrigger value="rounds">Rounds & Schedule</TabsTrigger>
                </TabsList>

                {activeTab === 'applicants' && (
                   <div className="relative w-72">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder="Search student..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
                )}
             </div>

             <TabsContent value="applicants" className="flex-1 overflow-auto border rounded-md bg-white">
                <Table>
                   <TableHeader className="bg-gray-50/50">
                      <TableRow className="hover:bg-transparent">
                         <TableHead className="font-semibold px-6 py-4 text-xs text-gray-500 uppercase tracking-wider">Student Name</TableHead>
                         <TableHead className="font-semibold px-6 py-4 text-xs text-gray-500 uppercase tracking-wider">Register No</TableHead>
                         <TableHead className="font-semibold px-6 py-4 text-xs text-gray-500 uppercase tracking-wider">Department</TableHead>
                         <TableHead className="font-semibold px-6 py-4 text-xs text-gray-500 uppercase tracking-wider">CGPA</TableHead>
                         <TableHead className="font-semibold px-6 py-4 text-xs text-gray-500 uppercase tracking-wider">Status</TableHead>
                         <TableHead className="font-semibold px-6 py-4 text-xs text-gray-500 uppercase tracking-wider">Resume</TableHead>
                         <TableHead className="font-semibold px-6 py-4 text-xs text-gray-500 uppercase tracking-wider text-right">Actions</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {filteredApplicants.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={7} className="text-center h-32 text-gray-500">
                               <div className="flex flex-col items-center justify-center space-y-2">
                                  <Users className="h-8 w-8 text-gray-300" />
                                  <p className="font-medium">No students have applied for this drive yet</p>
                               </div>
                            </TableCell>
                         </TableRow>
                      ) : (
                         filteredApplicants.map((student) => (
                            <TableRow key={student.student_id} className="hover:bg-gray-50 border-b">
                               <TableCell className="font-medium py-4 px-6">
                                  <Link href={`/dashboard/students/${student.register_number}`} className="hover:underline hover:text-blue-600 block">
                                     <div className="text-sm font-semibold text-gray-900">{student.full_name}</div>
                                  </Link>
                                  <div className="text-xs text-gray-500 mt-0.5">{student.email}</div>
                               </TableCell>
                               <TableCell className="py-4 px-6 text-sm text-gray-700">{student.register_number}</TableCell>
                               <TableCell className="py-4 px-6 text-sm text-gray-700">{student.department}</TableCell>
                               <TableCell className="py-4 px-6 text-sm text-gray-700">{student.cgpa}</TableCell>
                               <TableCell className="py-4 px-6">
                                  <Badge variant={
                                     student.status === 'placed' ? 'default' : 
                                     student.status === 'shortlisted' ? 'secondary' : 'outline'
                                  } className={
                                     student.status === 'placed' ? 'bg-green-100 text-green-800 border-green-200' : 
                                     student.status === 'shortlisted' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                     'bg-gray-100 text-gray-600 border-gray-200'
                                  }>
                                     {student.status.replace('_', ' ')}
                                  </Badge>
                               </TableCell>
                               <TableCell className="py-4 px-6">
                                  {student.resume_url ? (
                                     <button 
                                        onClick={() => openResume(student.student_id)}
                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 text-sm font-medium transition-colors"
                                     >
                                        <FileText className="h-3.5 w-3.5" /> View Resume
                                     </button>
                                  ) : <span className="text-gray-400 text-xs italic">Not uploaded</span>}
                               </TableCell>
                               <TableCell className="text-right py-4 px-6">
                                  <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"><MoreVertical className="h-4 w-4 text-gray-500" /></Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(student.student_id, 'shortlisted')} className="cursor-pointer">
                                           Shortlist
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(student.student_id, 'placed')} className="cursor-pointer">
                                           Mark as Placed
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(student.student_id, 'rejected')} className="text-red-600 focus:text-red-600 cursor-pointer">
                                           Reject
                                        </DropdownMenuItem>
                                     </DropdownMenuContent>
                                  </DropdownMenu>
                               </TableCell>
                            </TableRow>
                         ))
                      )}
                   </TableBody>
                </Table>
             </TabsContent>

             <TabsContent value="details" className="p-6 bg-white border rounded-lg h-full overflow-auto">
                <div className="max-w-4xl space-y-8">
                   
                   {/* Job Description */}
                   <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Job Description</h3>
                       <div className="p-5 bg-gray-50 rounded-lg text-sm leading-relaxed whitespace-pre-line text-gray-700">
                          {drive.job_description || "No description provided."}
                       </div>
                   </div>

                   {/* Eligibility Criteria */}
                   <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Eligibility Criteria</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                         <div className="p-4 bg-white border rounded-lg shadow-sm">
                            <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Departments</span>
                            <span className="font-medium text-gray-900">{drive.eligible_departments?.join(', ') || 'All'}</span>
                         </div>
                         <div className="p-4 bg-white border rounded-lg shadow-sm">
                            <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Batches</span>
                            <span className="font-medium text-gray-900">{drive.eligible_batches?.join(', ') || 'All'}</span>
                         </div>
                         <div className="p-4 bg-white border rounded-lg shadow-sm">
                            <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Backlogs Allowed</span>
                            <span className="font-medium text-gray-900">{drive.max_backlogs_allowed}</span>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                           <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md">
                              <span className="block text-blue-600 text-xs font-semibold mb-1">10th Grade</span>
                              <span className="font-bold text-gray-900">{drive.tenth_percentage ? `${drive.tenth_percentage}%` : 'N/A'}</span>
                           </div>
                           <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md">
                              <span className="block text-blue-600 text-xs font-semibold mb-1">12th Grade</span>
                              <span className="font-bold text-gray-900">{drive.twelfth_percentage ? `${drive.twelfth_percentage}%` : 'N/A'}</span>
                           </div>
                           <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md">
                              <span className="block text-blue-600 text-xs font-semibold mb-1">UG CGPA</span>
                              <span className="font-bold text-gray-900">{drive.ug_min_cgpa || drive.min_cgpa || 'N/A'}</span>
                           </div>
                           <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md">
                              <span className="block text-blue-600 text-xs font-semibold mb-1">PG CGPA</span>
                              <span className="font-bold text-gray-900">{drive.pg_min_cgpa || 'N/A'}</span>
                           </div>
                      </div>
                   </div>

                    {/* Salary & Stipend */}
                   <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Compensation</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                               <div className="flex items-center gap-2 mb-2">
                                   <Briefcase className="h-4 w-4 text-green-700"/>
                                   <span className="font-semibold text-green-800">Full Time CTC</span>
                               </div>
                               <p className="text-2xl font-bold text-green-900">
                                   {drive.roles && drive.roles.length > 0 
                                      ? (drive.roles.length === 1 ? drive.roles[0].ctc : 'Refer to Roles')
                                      : 'Not Disclosed'}
                               </p>
                           </div>
                           <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                               <div className="flex items-center gap-2 mb-2">
                                   <Clock className="h-4 w-4 text-amber-700"/>
                                   <span className="font-semibold text-amber-800">Internship Stipend</span>
                               </div>
                               <p className="text-2xl font-bold text-amber-900">
                                   {drive.roles && drive.roles.length > 0 
                                      ? (drive.roles.length === 1 ? drive.roles[0].stipend : 'Refer to Roles')
                                      : 'Not Applicable'}
                               </p>
                           </div>
                       </div>
                   </div>

                   {/* Attachments */}
                   <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                          Attachments 
                          <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{drive.attachments?.length || 0}</span>
                      </h3>
                      {drive.attachments && drive.attachments.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {drive.attachments.map((file, idx) => (
                                  <a 
                                    key={idx} 
                                    href={file.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
                                  >
                                      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                          <FileText className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm text-gray-900 truncate">{file.name}</p>
                                          <p className="text-xs text-gray-500">Click to view document</p>
                                      </div>
                                      <Download className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </a>
                              ))}
                          </div>
                      ) : (
                          <p className="text-sm text-gray-500 italic">No attachments uploaded for this drive.</p>
                      )}
                   </div>

                </div>
             </TabsContent>

             <TabsContent value="rounds" className="p-6 bg-white border rounded-lg h-full overflow-auto">
                 <h3 className="text-lg font-semibold mb-4">Interview Process</h3>
                 <div className="space-y-4">
                    {drive.rounds?.map((round, i) => (
                       <div key={i} className="flex gap-4 p-4 border rounded-lg items-start bg-gray-50/30">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-blue-200">
                             {i + 1}
                          </div>
                          <div>
                             <h4 className="font-medium text-gray-900">{round.name}</h4>
                             <p className="text-xs font-medium text-blue-600 mt-0.5 flex items-center gap-1">
                                 <Calendar className="h-3 w-3"/> {round.date}
                             </p>
                             <p className="text-sm mt-2 text-gray-600 leading-relaxed">{round.description}</p>
                          </div>
                       </div>
                    ))}
                    {(!drive.rounds || drive.rounds.length === 0) && (
                       <p className="text-gray-500 italic">No rounds configured.</p>
                    )}
                 </div>
             </TabsContent>
          </Tabs>
       </div>
    </div>
  );
}
