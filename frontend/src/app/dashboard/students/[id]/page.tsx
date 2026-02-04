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
        // console.error("Failed to fetch student details", error);
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
                        {[student.address_line_1, student.address_line_2, student.state].filter(Boolean).join(', ') || 'No Address Provided'}
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
               <TabsTrigger value="documents">Identity & Docs</TabsTrigger>
             </TabsList>

             {/* Academics Tab */}
              <TabsContent value="academics" className="mt-4 space-y-6">
                 
                 {/* SCHOOLING */}
                 <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Schooling</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                            <CardTitle className="text-base">Secondary (10th)</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Mark / %</span>
                                    <span className="font-semibold">{student.tenth_mark}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Board</span>
                                    <span>{student.tenth_board}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Year</span>
                                    <span>{student.tenth_year_pass}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-2 truncate" title={student.tenth_institution}>{student.tenth_institution}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                            <CardTitle className="text-base">Higher Secondary / Diploma</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                {student.twelfth_mark > 0 ? (
                                    <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">12th Mark / %</span>
                                        <span className="font-semibold">{student.twelfth_mark}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Board</span>
                                        <span>{student.twelfth_board}</span>
                                    </div>
                                    </>
                                ) : (
                                    <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Diploma %</span>
                                        <span className="font-semibold">{student.diploma_mark}</span>
                                    </div>
                                        <div className="flex justify-between">
                                        <span className="text-gray-500">Institution</span>
                                        <span className="truncate max-w-[150px]">{student.diploma_institution}</span>
                                    </div>
                                    </>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Year</span>
                                    <span>{student.twelfth_year_pass || student.diploma_year_pass}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                 </div>

                 {/* UNDERGRADUATE SECTION */}
                 <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Undergraduate (UG) Details</h3>
                    <div className="space-y-4">
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
                                <CardTitle className="text-base">UG Semester Performance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-4 md:grid-cols-5 gap-4 text-center">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                                        // For UG, usually up to 8 sems. 9 & 10 are rare but supported.
                                        const val = student[`ug_gpa_s${sem}`];
                                        return (
                                            <div key={sem} className="p-2 border rounded bg-gray-50">
                                                <div className="text-xs text-gray-500">Sem {sem}</div>
                                                <div className={`font-semibold ${!val ? 'text-gray-300' : ''}`}>{val || '-'}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                 </div>

                 {/* POSTGRADUATE SECTION (Conditional) */}
                 {(student.pg_cgpa > 0 || student.department_type === 'PG') && (
                     <div>
                        <h3 className="text-sm font-semibold text-[#002147] mb-3 uppercase tracking-wider mt-6 border-t pt-4">Postgraduate (PG) Details</h3>
                        <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-500">PG CGPA</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-[#002147]">{student.pg_cgpa}</div>
                                        <p className="text-xs text-muted-foreground">/ 10.0</p>
                                    </CardContent>
                                </Card>
                             </div>

                            <Card>
                                <CardHeader><CardTitle className="text-base">PG Semester Performance</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-4 md:grid-cols-4 gap-4 text-center">
                                        {[1, 2, 3, 4].map(sem => {
                                            const val = student[`pg_gpa_s${sem}`];
                                            return (
                                                <div key={sem} className="p-2 border rounded bg-blue-50/50">
                                                    <div className="text-xs text-gray-500">Sem {sem}</div>
                                                    <div className={`font-semibold ${!val ? 'text-gray-300' : ''}`}>{val || '-'}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                     </div>
                 )}
              </TabsContent>

             {/* Placement Tab - Placeholder for now */}
             <TabsContent value="placement" className="mt-4">
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Eligible Drives</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-600">{student.placement_stats?.eligible_drives || 0}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Opted In</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{student.placement_stats?.opted_in || 0}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Attended</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-purple-600">{student.placement_stats?.attended || 0}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Offers Received</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-amber-600">{student.placement_stats?.offers_received || 0}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Opted Out</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-gray-600">{student.placement_stats?.opted_out || 0}</div></CardContent>
                  </Card>
               </div>
             </TabsContent>

             {/* Documents Tab */}
             <TabsContent value="documents" className="mt-4">
               <Card>
                 <CardHeader>
                    <CardTitle>Uploaded Documents & Identity</CardTitle>
                 </CardHeader>
                 <CardContent className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 border rounded-lg bg-gray-50">
                            <div className="text-xs text-gray-500">Aadhar Number</div>
                            <div className="font-medium">{student.aadhar_number || '-'}</div>
                        </div>
                        <div className="p-3 border rounded-lg bg-gray-50">
                            <div className="text-xs text-gray-500">PAN Number</div>
                            <div className="font-medium">{student.pan_number || '-'}</div>
                        </div>
                    </div>
                    
                    {[
                      { name: 'Resume', url: student.resume_url },
                      { name: 'Profile Photo', url: student.profile_photo_url },
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
