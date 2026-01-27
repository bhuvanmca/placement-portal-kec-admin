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
            console.error("Failed to fetch applicants");
         }
      } else {
         toast.error("Drive not found");
         router.push('/dashboard/drives');
      }

    } catch (error) {
      console.error(error);
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
          console.error(e);
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
                      <span>{drive.job_role}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{drive.location}</span>
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
                <div className="max-w-3xl space-y-6">
                   <h3 className="text-lg font-semibold">Eligibility Criteria</h3>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-4 bg-gray-50 rounded-lg">
                         <span className="block text-gray-500">Departments</span>
                         <span className="font-medium">{drive.eligible_departments?.join(', ') || 'All'}</span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                         <span className="block text-gray-500">Batches</span>
                         <span className="font-medium">{drive.eligible_batches?.join(', ') || 'All'}</span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                         <span className="block text-gray-500">Min CGPA</span>
                         <span className="font-medium">{drive.min_cgpa}</span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                         <span className="block text-gray-500">Backlogs Allowed</span>
                         <span className="font-medium">{drive.max_backlogs_allowed}</span>
                      </div>
                   </div>
                </div>
             </TabsContent>

             <TabsContent value="rounds" className="p-6 bg-white border rounded-lg h-full overflow-auto">
                 <h3 className="text-lg font-semibold mb-4">Interview Process</h3>
                 <div className="space-y-4">
                    {drive.rounds?.map((round, i) => (
                       <div key={i} className="flex gap-4 p-4 border rounded-lg items-start">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                             {i + 1}
                          </div>
                          <div>
                             <h4 className="font-medium">{round.name}</h4>
                             <p className="text-sm text-gray-500">{round.date}</p>
                             <p className="text-sm mt-1">{round.description}</p>
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
