'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { studentService } from '@/services/student.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Mail, Phone, MapPin, Download, Ban, Trash2, Calendar, BookOpen, Building2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const data = await studentService.getStudentDetails(id);
        setStudent(data);
      } catch (error) {
        console.error("Failed to fetch student details", error);
        toast.error("Failed to load student profile");
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  const handleBlockToggle = async () => {
    try {
      if (!student) return;
      await studentService.toggleBlockStatus(student.id, !student.is_blocked);
      toast.success(student.is_blocked ? "Student unblocked" : "Student blocked");
      // Refresh local state
      setStudent({ ...student, is_blocked: !student.is_blocked });
    } catch (error) {
       toast.error("Failed to update status");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Profile...</div>;
  if (!student) return <div className="p-10 text-center">Student not found</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-6 p-8 pt-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
           <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-[#002147]">{student.full_name}</h2>
              {student.is_blocked && <Badge variant="destructive">Blocked</Badge>}
           </div>
           <div className="flex items-center gap-2 text-muted-foreground text-sm">
             <Badge variant="outline">{student.register_number}</Badge>
             <span>•</span>
             <span>{student.department} - {student.batch_year} Batch</span>
           </div>
        </div>
        <div className="ml-auto flex gap-2">
           <Button 
             variant="outline" 
             className={student.is_blocked ? "text-green-600 border-green-200 hover:bg-green-50" : "text-red-600 border-red-200 hover:bg-red-50"}
             onClick={handleBlockToggle}
           >
             {student.is_blocked ? <><Ban className="mr-2 h-4 w-4" /> Unblock</> : <><Ban className="mr-2 h-4 w-4" /> Block</>}
           </Button>
           <Button variant="destructive">
             <Trash2 className="mr-2 h-4 w-4" /> Delete
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Personal Info */}
        <div className="space-y-6">
           <Card>
             <CardContent className="pt-6 flex flex-col items-center text-center">
                <Avatar className="h-32 w-32 mb-4 border-4 border-gray-50">
                  <AvatarImage src={student.profile_photo_url || ""} />
                  <AvatarFallback className="text-4xl bg-[#002147] text-white font-bold">
                    {student.full_name ? student.full_name.charAt(0).toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold text-[#002147]">{student.full_name}</h3>
                <p className="text-sm text-gray-500 mb-4">{student.email}</p>
                
                <div className="w-full space-y-3 text-left mt-4 border-t pt-4">
                   <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{student.mobile_number || 'N/A'}</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{student.email}</span>
                   </div>
                   <div className="flex items-start gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      <span className="line-clamp-2">
                        {[student.address_line_1, student.city, student.state, student.pincode].filter(Boolean).join(', ') || 'No Address Provided'}
                      </span>
                   </div>
                   <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>DOB: {student.dob || 'N/A'}</span>
                   </div>
                </div>

                <Button className="w-full mt-6" variant="outline" onClick={() => window.open(student.resume_url, '_blank')} disabled={!student.resume_url}>
                  <Download className="mr-2 h-4 w-4" /> Download Resume
                </Button>
             </CardContent>
           </Card>
        </div>

        {/* Right Column: Details Tabs */}
        <div className="md:col-span-2">
           <Tabs defaultValue="academics" className="w-full">
             <TabsList className="grid w-full grid-cols-3">
               <TabsTrigger value="academics">Academics</TabsTrigger>
               <TabsTrigger value="placement">Placement History</TabsTrigger>
               <TabsTrigger value="documents">Documents</TabsTrigger>
             </TabsList>

             {/* Academics Tab */}
             <TabsContent value="academics" className="mt-4 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <Card>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium text-gray-500">UG CGPA</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold text-[#002147]">{student.ug_cgpa}</div>
                     <p className="text-xs text-muted-foreground">/ 10.0</p>
                   </CardContent>
                 </Card>
                 <Card>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium text-gray-500">Current Backlogs</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className={`text-2xl font-bold ${student.current_backlogs > 0 ? 'text-red-600' : 'text-green-600'}`}>
                       {student.current_backlogs}
                     </div>
                     <p className="text-xs text-muted-foreground">History: {student.history_of_backlogs}</p>
                   </CardContent>
                 </Card>
               </div>
               
               <Card>
                 <CardHeader>
                   <CardTitle className="text-base">PG / Other Details</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-gray-500">PG CGPA</span>
                      <span className="font-medium">{student.pg_cgpa || 'N/A'}</span>
                    </div>
                    {/* Add more academic fields here if available in model */}
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Placement Tab - Placeholder for now */}
             <TabsContent value="placement" className="mt-4">
               <Card>
                 <CardHeader>
                    <CardTitle>Placement Activity</CardTitle>
                    <CardDescription>Drives attended and status</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                       <Building2 className="h-10 w-10 mb-2" />
                       <p>No placement history available yet.</p>
                       <p className="text-xs">Feature coming soon.</p>
                    </div>
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Documents Tab */}
             <TabsContent value="documents" className="mt-4">
               <Card>
                 <CardHeader>
                    <CardTitle>Uploaded Documents</CardTitle>
                 </CardHeader>
                 <CardContent className="grid gap-4">
                    {[
                      { name: 'Resume', url: student.resume_url },
                      { name: 'Profile Photo', url: student.profile_photo_url }
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                         <div className="flex items-center gap-3">
                           <FileText className="h-5 w-5 text-blue-600" />
                           <span className="font-medium text-sm">{doc.name}</span>
                         </div>
                         {doc.url ? (
                           <Button variant="ghost" size="sm" onClick={() => window.open(doc.url, '_blank')}>View</Button>
                         ) : (
                           <Badge variant="outline" className="text-gray-400">Not Uploaded</Badge>
                         )}
                      </div>
                    ))}
                 </CardContent>
               </Card>
             </TabsContent>
           </Tabs>
        </div>
      </div>
    </div>
  );
}
