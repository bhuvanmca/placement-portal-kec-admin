"use client";
export const runtime = "edge";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { studentService } from "@/services/student.service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Download,
  Ban,
  Trash2,
  Calendar,
  BookOpen,
  Building2,
  FileText,
  Briefcase,
  Award,
  GraduationCap,
  Check,
  Users,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthImage } from "@/hooks/use-auth-image";
import { formatDateTime } from "@/lib/utils";

export default function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ highlight?: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const profilePhotoUrl = useAuthImage(student?.id, "profile_photo");

  // Pending Requests state
  const [requests, setRequests] = useState<
    import("@/services/settings.service").StudentChangeRequest[]
  >([]);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  useEffect(() => {
    // resolve searchParams
    searchParams.then((params) => {
      if (params?.highlight) setHighlightedField(params.highlight);
    });
  }, [searchParams]);

  useEffect(() => {
    const fetchStudentAndRequests = async () => {
      try {
        const studentData = await studentService.getStudentDetails(id);
        setStudent(studentData);

        // Fetch all requests and filter (MVP)
        // Ideally backend provides endpoint
        const { settingsService } = await import("@/services/settings.service");
        const allRequests = await settingsService.getPendingRequests();
        if (allRequests) {
          const studentRequests = allRequests.filter(
            (r) => r.student_id.toString() === id,
          );
          setRequests(studentRequests);
        }
      } catch (error) {
        // console.error("Failed to fetch student details", error);
        toast.error("Failed to load student profile");
      } finally {
        setLoading(false);
      }
    };
    fetchStudentAndRequests();
  }, [id]);

  const handleRequestAction = async (
    reqId: number,
    action: "approve" | "reject",
  ) => {
    try {
      const { settingsService } = await import("@/services/settings.service");
      await settingsService.handleRequest(reqId, action);
      toast.success(`Request ${action}ed`);

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== reqId));

      // If approved, refresh student data to show new value
      if (action === "approve") {
        const studentData = await studentService.getStudentDetails(id);
        setStudent(studentData);
      }
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleBlockToggle = async () => {
    try {
      if (!student) return;
      await studentService.toggleBlockStatus(student.id, !student.is_blocked);
      toast.success(
        student.is_blocked ? "Student unblocked" : "Student blocked",
      );
      // Refresh local state
      setStudent({ ...student, is_blocked: !student.is_blocked });
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleViewDocument = async (
    docType: "resume" | "profile_photo" | "aadhar" | "pan",
    url?: string,
  ) => {
    if (!url) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const proxyUrl = `/api/proxy/storage?studentId=${student.id}&type=${docType}`;
      const response = await fetch(proxyUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        toast.error("Could not access document");
        return;
      }

      const contentType =
        response.headers.get("Content-Type") ||
        (docType === "resume" ? "application/pdf" : "image/jpeg");
      const blob = await response.blob();
      const typedBlob = new Blob([blob], { type: contentType });
      const blobUrl = URL.createObjectURL(typedBlob);
      window.open(blobUrl, "_blank");
    } catch (error) {
      toast.error("Failed to access document");
    }
  };

  if (loading)
    return <div className="p-10 text-center">Loading Profile...</div>;
  if (!student)
    return <div className="p-10 text-center">Student not found</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50/50">
      {/* ... (Header) ... */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="-ml-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-[#002147]">
                  {student.full_name}
                </h2>
                <Badge
                  variant="outline"
                  className="text-[#002147] border-[#002147]/20 bg-[#002147]/5"
                >
                  {student.register_number}
                </Badge>
                {student.is_blocked && (
                  <Badge variant="destructive" className="animate-pulse">
                    Blocked
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mt-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>{student.department}</span>
                <span className="mx-1">•</span>
                <Calendar className="h-3.5 w-3.5" />
                <span>{student.batch_year} Batch</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className={
                student.is_blocked
                  ? "text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                  : "text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              }
              onClick={handleBlockToggle}
            >
              {student.is_blocked ? (
                <>
                  <Ban className="mr-2 h-4 w-4" /> Unblock Student
                </>
              ) : (
                <>
                  <Ban className="mr-2 h-4 w-4" /> Block Student
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Pending Changes Alert */}
      {requests.length > 0 && (
        <div className="px-8 pt-6 pb-0 animate-in slide-in-from-top-4 duration-500">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                Pending Change Requests ({requests.length})
              </CardTitle>
              <CardDescription className="text-amber-700/80">
                This student has requested updates to restricted profile fields.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className={`flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm transition-all ${highlightedField === req.field_name ? "ring-2 ring-blue-400 ring-offset-2" : "border-amber-100"}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-700">
                          {req.field_label ||
                            req.field_name.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs font-normal text-amber-600 border-amber-200 bg-amber-50"
                        >
                          Pending Approval
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div
                          className="text-gray-500 decoration-red-300 line-through decoration-2"
                          title="Current Value"
                        >
                          {req.old_value || (
                            <span className="italic opacity-50">Empty</span>
                          )}
                        </div>
                        <ArrowLeft className="h-3 w-3 text-gray-400 rotate-180" />
                        <div
                          className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100"
                          title="New Value"
                        >
                          {req.new_value}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Requested {formatDateTime(req.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleRequestAction(req.id, "approve")}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleRequestAction(req.id, "reject")}
                      >
                        <Ban className="h-4 w-4 mr-1" /> Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Personal Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
              <Avatar className="h-32 w-32 mb-4 ring-4 ring-gray-50">
                <AvatarImage src={profilePhotoUrl || ""} />
                <AvatarFallback className="text-4xl bg-[#002147] text-white font-bold">
                  {student.full_name
                    ? student.full_name.charAt(0).toUpperCase()
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold text-[#002147]">
                {student.full_name}
              </h3>
              <p className="text-sm text-gray-400 font-medium mb-6 uppercase tracking-wider">
                {student.register_number}
              </p>

              <div className="w-full space-y-4 text-left border-t border-gray-100 pt-6">
                <div className="flex items-center gap-3 text-sm group transition-colors">
                  <div className="h-8 w-8 rounded-full bg-[#002147]/10 flex items-center justify-center text-[#002147] group-hover:bg-[#002147]/15 transition-colors">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-gray-600">
                    {student.mobile_number || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm group transition-colors">
                  <div className="h-8 w-8 rounded-full bg-[#002147]/10 flex items-center justify-center text-[#002147] group-hover:bg-[#002147]/15 transition-colors">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-gray-600 break-all">
                    {student.email}
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm group transition-colors">
                  <div className="h-8 w-8 rounded-full bg-[#002147]/10 flex items-center justify-center text-[#002147] group-hover:bg-[#002147]/15 transition-colors mt-0.5">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-gray-600 leading-relaxed">
                    {[
                      student.address_line_1,
                      student.address_line_2,
                      student.state,
                    ]
                      .filter(Boolean)
                      .join(", ") || "No Address Provided"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm group transition-colors">
                  <div className="h-8 w-8 rounded-full bg-[#002147]/10 flex items-center justify-center text-[#002147] group-hover:bg-[#002147]/15 transition-colors">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-gray-600">
                    Born {formatDateTime(student.dob)}
                  </span>
                </div>
              </div>

              {/* Name Details */}
              {(student.first_name ||
                student.last_name ||
                student.father_name ||
                student.mother_name) && (
                <div className="w-full space-y-3 text-left border-t border-gray-100 pt-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Name Details
                  </h4>
                  {(student.first_name ||
                    student.middle_name ||
                    student.last_name) && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">
                        Full Name
                      </span>
                      <span className="font-semibold text-gray-700">
                        {[
                          student.first_name,
                          student.middle_name,
                          student.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ") || "N/A"}
                      </span>
                    </div>
                  )}
                  {student.father_name && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">
                        Father&apos;s Name
                      </span>
                      <span className="font-semibold text-gray-700">
                        {student.father_name}
                      </span>
                    </div>
                  )}
                  {student.mother_name && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">
                        Mother&apos;s Name
                      </span>
                      <span className="font-semibold text-gray-700">
                        {student.mother_name}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full mt-8 bg-[#002147] hover:bg-[#003366] text-white shadow-sm"
                onClick={() => handleViewDocument("resume", student.resume_url)}
                disabled={!student.resume_url}
              >
                <Download className="mr-2 h-4 w-4" /> Download Resume
              </Button>
            </div>
          </div>

          {/* Right Column: Details Tabs */}
          <div className="md:col-span-2">
            <Tabs
              defaultValue="academics"
              className="w-full h-full flex flex-col"
            >
              <div className="mb-6 bg-white p-2 rounded-lg border shadow-sm inline-flex">
                <TabsList className="bg-transparent border-0 p-0">
                  <TabsTrigger
                    value="academics"
                    className="data-[state=active]:bg-[#002147] data-[state=active]:text-white rounded-md transition-all px-6"
                  >
                    Academics
                  </TabsTrigger>
                  <TabsTrigger
                    value="placement"
                    className="data-[state=active]:bg-[#002147] data-[state=active]:text-white rounded-md transition-all px-6"
                  >
                    Placement History
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="data-[state=active]:bg-[#002147] data-[state=active]:text-white rounded-md transition-all px-6"
                  >
                    Identity & Docs
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Academics Tab */}
              {/* ... (Kept as is, too long to repeat, assuming replace_file_content handles partial if possible, but I must provide full chunk or use carefully constructed range.
                  Wait, I should probably replace the whole file content I saw, but that's risky.
                  I will target the Header return block and the Left Column where Download Resume and Phone Number are.
                  AND I need to add handleViewDocument function definition BEFORE return.
                  
                  Let's split into chunks.
             */}

              {/* Academics Tab */}
              {/* Academics Tab */}
              <TabsContent
                value="academics"
                className="space-y-8 animate-in fade-in-50 duration-300"
              >
                {/* SCHOOLING */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <BookOpen className="h-4 w-4 text-[#002147]" />
                    <h3 className="text-sm font-bold text-[#002147] uppercase tracking-wider">
                      Schooling
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                        Secondary (10th)
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                          <span className="text-sm text-gray-500 font-medium">
                            Percentage
                          </span>
                          <span className="text-xl font-bold text-[#002147]">
                            {student.tenth_mark}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                          <span className="text-sm text-gray-500 font-medium">
                            Board
                          </span>
                          <span className="text-sm font-semibold text-gray-700">
                            {student.tenth_board}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 font-medium">
                            Year
                          </span>
                          <span className="text-sm font-semibold text-gray-700">
                            {student.tenth_year_pass}
                          </span>
                        </div>
                        <div className="pt-2">
                          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                            Institution
                          </span>
                          <p
                            className="text-sm font-medium text-gray-600 mt-1 line-clamp-1"
                            title={student.tenth_institution}
                          >
                            {student.tenth_institution}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                        Higher Secondary (12th)
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                          <span className="text-sm text-gray-500 font-medium">
                            HSC Percentage
                          </span>
                          <span className="text-xl font-bold text-[#002147]">
                            {student.twelfth_mark
                              ? `${student.twelfth_mark}%`
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                          <span className="text-sm text-gray-500 font-medium">
                            Board
                          </span>
                          <span className="text-sm font-semibold text-gray-700">
                            {student.twelfth_board || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                          <span className="text-sm text-gray-500 font-medium">
                            Institution
                          </span>
                          <span
                            className="text-sm font-semibold text-gray-700 truncate max-w-50"
                            title={student.twelfth_institution}
                          >
                            {student.twelfth_institution || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 font-medium">
                            Year of Passing
                          </span>
                          <span className="text-sm font-semibold text-gray-700">
                            {student.twelfth_year_pass || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                        Diploma
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                          <span className="text-sm text-gray-500 font-medium">
                            Diploma Percentage
                          </span>
                          <span className="text-xl font-bold text-[#002147]">
                            {student.diploma_mark
                              ? `${student.diploma_mark}%`
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                          <span className="text-sm text-gray-500 font-medium">
                            Institution
                          </span>
                          <span
                            className="text-sm font-semibold text-gray-700 truncate max-w-50"
                            title={student.diploma_institution}
                          >
                            {student.diploma_institution || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 font-medium">
                            Year of Passing
                          </span>
                          <span className="text-sm font-semibold text-gray-700">
                            {student.diploma_year_pass || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* POSTGRADUATE SECTION (Shown First if PG) */}
                {student.department_type === "PG" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Award className="h-4 w-4 text-[#002147]" />
                      <h3 className="text-sm font-bold text-[#002147] uppercase tracking-wider">
                        Postgraduate (PG)
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-[#002147]/5 border border-[#002147]/10 rounded-xl flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black text-[#002147]/60 uppercase tracking-widest mb-1">
                          PG CGPA
                        </span>
                        <div className="text-2xl font-black text-[#002147]">
                          {student.pg_cgpa}{" "}
                          <span className="text-xs text-[#002147]/40 font-medium">
                            / 10
                          </span>
                        </div>
                      </div>
                      <div
                        className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center ${student.current_backlogs > 0 ? "bg-red-50/50 border-red-100" : "bg-gray-50/50 border-gray-200"}`}
                      >
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest mb-1 ${student.current_backlogs > 0 ? "text-red-600" : "text-gray-500"}`}
                        >
                          Active Backlogs
                        </span>
                        <div
                          className={`text-2xl font-black ${student.current_backlogs > 0 ? "text-red-900" : "text-gray-700"}`}
                        >
                          {student.current_backlogs}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl flex flex-col items-center justify-center text-center col-span-2 lg:col-span-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                          History of Backlogs
                        </span>
                        <div className="text-2xl font-black text-gray-700">
                          {student.history_of_backlogs}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* UNDERGRADUATE SECTION */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <GraduationCap className="h-4 w-4 text-[#002147]" />
                    <h3 className="text-sm font-bold text-[#002147] uppercase tracking-wider">
                      Undergraduate (UG)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-[#002147]/5 border border-[#002147]/10 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-black text-[#002147]/60 uppercase tracking-widest mb-1">
                        UG CGPA
                      </span>
                      <div className="text-2xl font-black text-[#002147]">
                        {student.ug_cgpa}{" "}
                        <span className="text-xs text-[#002147]/40 font-medium">
                          / 10
                        </span>
                      </div>
                    </div>
                    {/* Only show backlogs in UG section if NOT PG */}
                    {student.department_type !== "PG" && (
                      <>
                        <div
                          className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center ${student.current_backlogs > 0 ? "bg-red-50/50 border-red-100" : "bg-gray-50/50 border-gray-200"}`}
                        >
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest mb-1 ${student.current_backlogs > 0 ? "text-red-600" : "text-gray-500"}`}
                          >
                            Active Backlogs
                          </span>
                          <div
                            className={`text-2xl font-black ${student.current_backlogs > 0 ? "text-red-900" : "text-gray-700"}`}
                          >
                            {student.current_backlogs}
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl flex flex-col items-center justify-center text-center col-span-2 lg:col-span-2">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                            History of Backlogs
                          </span>
                          <div className="text-2xl font-black text-gray-700">
                            {student.history_of_backlogs}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Placement Tab */}
              <TabsContent
                value="placement"
                className="mt-4 animate-in fade-in-50 duration-300"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Eligible Drives */}
                  <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">
                        Eligible Drives
                      </div>
                      <div className="text-3xl font-black text-blue-900">
                        {student.placement_stats?.eligible_drives || 0}
                      </div>
                    </div>
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <Briefcase className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Opted In */}
                  <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
                        Opted In
                      </div>
                      <div className="text-3xl font-black text-gray-900">
                        {student.placement_stats?.opted_in || 0}
                      </div>
                    </div>
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                      <Check className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Attended */}
                  <div className="p-6 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-purple-600 uppercase tracking-widest mb-1">
                        Attended
                      </div>
                      <div className="text-3xl font-black text-purple-900">
                        {student.placement_stats?.attended || 0}
                      </div>
                    </div>
                    <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Offers */}
                  <div className="p-6 bg-green-50/50 border border-green-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-green-600 uppercase tracking-widest mb-1">
                        Offers Received
                      </div>
                      <div className="text-3xl font-black text-green-900">
                        {student.placement_stats?.offers_received || 0}
                      </div>
                    </div>
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                      <Award className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Opted Out */}
                  <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">
                        Opted Out
                      </div>
                      <div className="text-3xl font-black text-amber-900">
                        {student.placement_stats?.opted_out || 0}
                      </div>
                    </div>
                    <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                      <Ban className="h-5 w-5" />
                    </div>
                  </div>

                  {/* No Action */}
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                        No Action
                      </div>
                      <div className="text-3xl font-black text-slate-900">
                        {Math.max(
                          0,
                          (student.placement_stats?.eligible_drives || 0) -
                            ((student.placement_stats?.opted_in || 0) +
                              (student.placement_stats?.opted_out || 0)),
                        )}
                      </div>
                    </div>
                    <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                      <Ban className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent
                value="documents"
                className="mt-4 space-y-8 animate-in fade-in-50 duration-300"
              >
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-4">
                    <FileText className="h-4 w-4 text-[#002147]" />
                    <h3 className="text-sm font-bold text-[#002147] uppercase tracking-wider">
                      Identity Proofs
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white border border-gray-100 rounded-xl flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Aadhar Number
                      </span>
                      <span className="font-bold text-gray-800 tracking-wide text-lg">
                        {student.aadhar_number || "-"}
                      </span>
                    </div>
                    <div className="p-5 bg-white border border-gray-100 rounded-xl flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        PAN Number
                      </span>
                      <span className="font-bold text-gray-800 tracking-wide text-lg">
                        {student.pan_number || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-4">
                    <Download className="h-4 w-4 text-[#002147]" />
                    <h3 className="text-sm font-bold text-[#002147] uppercase tracking-wider">
                      Downloads
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        name: "Resume",
                        url: student.resume_url,
                        type: "resume" as const,
                        icon: FileText,
                        color: "text-blue-600",
                        bg: "group-hover:bg-blue-600",
                      },
                      {
                        name: "Profile Photo",
                        url: student.profile_photo_url,
                        type: "profile_photo" as const,
                        icon: Users,
                        color: "text-purple-600",
                        bg: "group-hover:bg-purple-600",
                      },
                      {
                        name: "Aadhar Card",
                        url: student.aadhar_card_url,
                        type: "aadhar" as const,
                        icon: FileText,
                        color: "text-orange-600",
                        bg: "group-hover:bg-orange-600",
                      },
                      {
                        name: "PAN Card",
                        url: student.pan_card_url,
                        type: "pan" as const,
                        icon: FileText,
                        color: "text-green-600",
                        bg: "group-hover:bg-green-600",
                      },
                    ].map((doc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white hover:border-blue-100 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 ${doc.bg} transition-colors`}
                          >
                            <doc.icon
                              className={`h-5 w-5 ${doc.color} group-hover:text-white transition-colors`}
                            />
                          </div>
                          <span className="font-bold text-gray-700">
                            {doc.name}
                          </span>
                        </div>
                        {doc.url ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleViewDocument(doc.type, doc.url)
                            }
                            className="rounded-full px-4 border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100"
                          >
                            View
                          </Button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-gray-400 border-gray-100 bg-gray-50"
                          >
                            Not Uploaded
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
