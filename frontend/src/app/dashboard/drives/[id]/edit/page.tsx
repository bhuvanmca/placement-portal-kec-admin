'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  Building2, 
  MapPin, 
  Banknote, 
  GraduationCap, 
  ListChecks, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Save,
  Loader2,
  Check,
  ArrowUp
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link, Element, animateScroll as scroll } from 'react-scroll';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { driveService, Drive } from '@/services/drive.service';
import { spocService, Spoc } from '@/services/spoc.service';
import { toast } from 'sonner';
import { DEPARTMENTS } from '@/constants/departments';
import FileUpload from '@/components/ui/file-upload';
import { DatePicker } from '@/components/ui/date-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { useScrollSpy } from '@/hooks/use-scroll-spy';
import { Progress } from "@/components/ui/progress";

// --- Zod Schema (Matches Create) ---
const driveSchema = z.object({
  company_name: z.string().min(2, "Company Name is required"),
  website: z.string().optional(),
  logo_url: z.string().optional(),
  job_role: z.string().min(2, "Job Role is required"),
  job_description: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  domain: z.string().optional(),
  drive_type: z.string().min(1, "Drive type is required"),
  company_category: z.string().min(1, "Category is required"),
  spoc_id: z.coerce.number().min(1, "SPOC is required"),
  ctc_min: z.coerce.number().min(0),
  ctc_max: z.coerce.number().min(0),
  ctc_display: z.string().min(1, "CTC Display is required"),
  
  // Eligibility
  min_cgpa: z.coerce.number().min(0).max(10),
  tenth_percentage: z.coerce.number().min(0).max(100).optional(),
  twelfth_percentage: z.coerce.number().min(0).max(100).optional(),
  ug_min_cgpa: z.coerce.number().min(0).max(10).optional(),
  pg_min_cgpa: z.coerce.number().min(0).max(10).optional(),
  use_aggregate: z.boolean().default(false),
  aggregate_percentage: z.coerce.number().min(0).max(100).optional(),

  max_backlogs_allowed: z.coerce.number().min(0),
  eligible_batches: z.array(z.coerce.number()).min(1, "Select at least one batch"),
  eligible_departments: z.array(z.string()).min(1, "Select at least one department"),
  eligible_gender: z.enum(['All', 'Male', 'Female']),
  
  drive_date: z.string().min(1, "Drive Date is required"),
  deadline_date: z.string().min(1, "Deadline is required"),
  
  rounds: z.array(z.object({
      name: z.string().min(1, "Round name required"),
      date: z.string().min(1, "Date required"),
      description: z.string()
  })),
  
  // existing attachments handled via state, not direct form validation here (or optional)
  attachments: z.array(z.any()).optional()
});

type DriveFormValues = z.infer<typeof driveSchema>;

const BATCHES = [2024, 2025, 2026, 2027]; // Ensure these match Create page or get dynamic
const SECTIONS = [
    { id: 'company-details', label: 'Company Details' },
    { id: 'eligibility', label: 'Eligibility Criteria' },
    { id: 'rounds', label: 'Interview Rounds' },
    { id: 'review', label: 'Review & Submit' }
];

export default function EditDrivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // Unwrap params
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [spocs, setSpocs] = useState<Spoc[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{name: string, url: string}[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  
  // Company Search - (Optional for Edit, but keeping for consistency if user wants to change company completely)
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<{name: string, domain: string, icon: string}[]>([]);
  const [openCompanySearch, setOpenCompanySearch] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Scroll Spy
  const activeSection = useScrollSpy(SECTIONS.map(s => s.id), 100);

  // Upload Progress
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  useEffect(() => {
    spocService.getAllSpocs().then(setSpocs).catch(console.error);
  }, []);

  const form = useForm<DriveFormValues>({
    resolver: zodResolver(driveSchema) as Resolver<DriveFormValues>,
    defaultValues: {
      company_name: '',
      job_role: '',
      ctc_display: '',
      ctc_min: 0,
      ctc_max: 0,
      min_cgpa: 0,
      max_backlogs_allowed: 0,
      eligible_batches: [],
      eligible_departments: [],
      eligible_gender: 'All',
      rounds: [],
      attachments: [],
      drive_type: 'Full-Time',
      company_category: 'Core',
      spoc_id: 0,
      job_description: '',
      location: '',
      drive_date: '',
      deadline_date: ''
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "rounds"
  });

  // Fetch Drive Data
  useEffect(() => {
    const fetchDrive = async () => {
        try {
            const driveId = parseInt(id);
            const drive = await driveService.getDriveById(driveId);
            if (!drive) {
                toast.error("Drive not found");
                router.push('/dashboard/drives');
                return;
            }

            // Date Formatting
            const driveDate = new Date(drive.drive_date).toISOString().split('T')[0];
            const deadlineDate = new Date(drive.deadline_date).toISOString().slice(0, 16);

            form.reset({
                company_name: drive.company_name,
                job_role: drive.job_role,
                job_description: drive.job_description,
                location: drive.location,
                website: drive.website,
                logo_url: drive.logo_url,
                drive_type: drive.drive_type,
                company_category: drive.company_category,
                spoc_id: drive.spoc_id,
                domain: (drive as any).domain || '', // handle missing field
                
                ctc_min: drive.ctc_min,
                ctc_max: drive.ctc_max,
                ctc_display: drive.ctc_display,
                
                min_cgpa: drive.min_cgpa,
                tenth_percentage: (drive as any).tenth_percentage || 0,
                twelfth_percentage: (drive as any).twelfth_percentage || 0,
                ug_min_cgpa: (drive as any).ug_min_cgpa || 0,
                pg_min_cgpa: (drive as any).pg_min_cgpa || 0,
                use_aggregate: (drive as any).use_aggregate || false,
                aggregate_percentage: (drive as any).aggregate_percentage || 0,
                
                max_backlogs_allowed: drive.max_backlogs_allowed,
                
                eligible_batches: drive.eligible_batches || [],
                eligible_departments: drive.eligible_departments || [],
                eligible_gender: (drive as any).eligible_gender || 'All',
                
                drive_date: driveDate,
                deadline_date: deadlineDate,
                rounds: drive.rounds || []
            });
            
            // Attachments
            if ((drive as any).attachments) {
               setExistingAttachments((drive as any).attachments);
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to load drive");
        } finally {
            setLoading(false);
        }
    };
    fetchDrive();
  }, [id, form, router]);


  // Handlers
  const handleFileSelect = (file: File) => {
    setNewFiles(prev => [...prev, file]);
    // We don't need to append to form 'attachments' array yet, we'll confirm on submit
  };

  const removeExistingAttachment = (index: number) => {
    setExistingAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: DriveFormValues) => {
    setIsSubmitting(true);
    setUploadProgress(0);
    if(newFiles.length > 0) setShowProgressDialog(true);

    try {
      const formData = new FormData();
      
      // Update attachments list in drive data (existing ones only)
      const driveData = {
          ...data,
          attachments: existingAttachments
      };
      
      console.log('Sending Drive Data:', driveData);
      
      formData.append('drive_data', JSON.stringify(driveData));
      
      // Append new files
      newFiles.forEach(file => {
          formData.append('attachments', file);
      });
      
      await driveService.updateDrive(parseInt(id), formData); 
      
      toast.success("Drive Republished Successfully!");
      router.push(`/dashboard/drives/${id}`);
    } catch (error: any) {
      console.error("Republish Error Raw:", error);
      console.error("Republish Error Keys:", Object.keys(error));
      console.error("Republish Error Stringified:", JSON.stringify(error, null, 2));

      // Attempt to extract meaningful message
      let msg = "Failed to update drive";
      if (error?.message) msg = error.message;
      if (error?.response?.data?.error) msg = error.response.data.error;
      
      // Check handled status from api.ts
      if (!error?.handled) {
          toast.error(msg);
      }
      setShowProgressDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const scrollToTop = () => {
    scroll.scrollToTop({
        duration: 500,
        smooth: true
    });
  };

  const hasPgDepartments = form.watch('eligible_departments')?.some(d => ['MCA', 'MBA', 'M.Tech', 'M.Sc'].includes(d));

  if (loading) return <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> Loading Drive Details...</div>;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 pb-8">
      <div className="mb-8 p-1 flex items-center gap-4">
         <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
         </Button>
         <div>
             <h1 className="text-3xl font-bold tracking-tight text-[#002147]">Edit Drive Details</h1>
             <p className="text-muted-foreground mt-2">Update placement drive information.</p>
         </div>
      </div>

      <div className="flex gap-10 items-start">
        {/* --- Main Scrollable Form --- */}
        <div className="flex-1 min-w-0">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* 1. Company Details */}
            <Element name="company-details" className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-4">
                    <div className="h-8 w-1 bg-[#002147] rounded-full"></div>
                    <h2 className="text-2xl font-semibold text-gray-800">Company Details</h2>
                </div>
                
                <Card className="border-none shadow-sm bg-white/50">
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-6">
                        {/* Company Name */}
                        <div className="space-y-2">
                             <Label>Company Name <span className="text-red-500">*</span></Label>
                             <div className="flex gap-2 items-center">
                                {form.watch('logo_url') && (
                                    <img src={form.watch('logo_url')} alt="Logo" className="h-10 w-10 object-contain rounded border p-1 bg-white" />
                                )}
                                <Input {...form.register('company_name')} placeholder="Company Name" />
                            </div>
                             {form.formState.errors.company_name && <p className="text-red-500 text-xs">{form.formState.errors.company_name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Website</Label>
                            <Input {...form.register('website')} placeholder="example.com" />
                        </div>

                        <div className="space-y-2">
                             <Label>Job Role <span className="text-red-500">*</span></Label>
                             <Input {...form.register('job_role')} placeholder="e.g. Software Developer" />
                        </div>

                        <div className="space-y-2">
                             <Label>Location <span className="text-red-500">*</span></Label>
                             <div className="relative">
                                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-9" {...form.register('location')} placeholder="e.g. Chennai" />
                             </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Controller
                                name="company_category"
                                control={form.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                                        <SelectContent>
                                            {['Core', 'IT', 'Product', 'Service', 'Start-up', 'MNC', 'Non-Tech'].map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                             <Label>CTC Display <span className="text-red-500">*</span></Label>
                             <div className="relative">
                                <Banknote className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-9" {...form.register('ctc_display')} placeholder="e.g. 6.5 LPA" />
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Min CTC</Label>
                                <Input type="number" {...form.register('ctc_min')} onWheel={(e) => e.currentTarget.blur()} />
                            </div>
                            <div className="space-y-2">
                                <Label>Max CTC</Label>
                                <Input type="number" {...form.register('ctc_max')} onWheel={(e) => e.currentTarget.blur()} />
                            </div>
                        </div>

                         <div className="space-y-2">
                            <Label>Drive Type</Label>
                            <Controller
                                name="drive_type"
                                control={form.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Full-Time">Full-Time</SelectItem>
                                            <SelectItem value="Internship">Internship</SelectItem>
                                            <SelectItem value="Internship and Full-Time">Internship + FT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        {/* SPOC Field */}
                        <div className="col-span-1 md:col-span-2 space-y-2">
                             <Label>SPOC (Single Point of Contact)</Label>
                                 <div className="flex gap-2">
                                     <Controller
                                        name="spoc_id"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Select 
                                                onValueChange={(val) => field.onChange(Number(val))} 
                                                value={field.value ? field.value.toString() : ""}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select SPOC" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {spocs.map((spoc) => (
                                                        <SelectItem key={spoc.id} value={spoc.id.toString()}>
                                                            {spoc.name} ({spoc.designation})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                     />
                                 </div>
                        </div>
                        
                        <div className="col-span-1 md:col-span-2 space-y-2">
                             <Label>Job Description</Label>
                             <Textarea className="min-h-[120px]" {...form.register('job_description')} placeholder="Role responsibilities..." />
                        </div>
                    </CardContent>
                </Card>
            </Element>

            {/* 2. Eligibility Criteria */}
            <Element name="eligibility" className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-4">
                    <div className="h-8 w-1 bg-[#002147] rounded-full"></div>
                    <h2 className="text-2xl font-semibold text-gray-800">Eligibility Criteria</h2>
                </div>

                <Card className="border-none shadow-sm bg-white/50">
                    <CardContent className="space-y-8 pt-6">
                        {/* Departments & Batches */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                  <Label>Eligible Departments <span className="text-red-500">*</span></Label>
                                  <Controller
                                     name="eligible_departments"
                                     control={form.control}
                                     render={({ field }) => (
                                         <MultiSelect
                                             options={[...DEPARTMENTS]}
                                             selected={field.value || []}
                                             onChange={field.onChange}
                                             placeholder="Select Departments..."
                                         />
                                     )}
                                  />
                             </div>
                             
                             <div className="space-y-2">
                                  <Label>Eligible Batches <span className="text-red-500">*</span></Label>
                                  <Controller
                                     name="eligible_batches"
                                     control={form.control}
                                     render={({ field }) => (
                                         <MultiSelect
                                             options={BATCHES}
                                             selected={field.value ? field.value.map(String) : []}
                                             onChange={(vals) => field.onChange(vals.map(Number))}
                                             placeholder="Select Batches..."
                                         />
                                     )}
                                  />
                             </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label>10th Percentage (Min)</Label>
                                <Input type="number" step="0.1" {...form.register('tenth_percentage')} onWheel={(e) => e.currentTarget.blur()} />
                            </div>
                            <div className="space-y-2">
                                <Label>12th Percentage (Min)</Label>
                                <Input type="number" step="0.1" {...form.register('twelfth_percentage')} onWheel={(e) => e.currentTarget.blur()} />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>UG Min CGPA</Label>
                                <Input type="number" step="0.01" {...form.register('ug_min_cgpa')} onWheel={(e) => e.currentTarget.blur()} />
                            </div>

                            {/* Conditional PG Field */}
                            {hasPgDepartments && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-[#002147] font-semibold">PG Min CGPA</Label>
                                    <Input type="number" step="0.01" {...form.register('pg_min_cgpa')} className="border-[#002147]/20 bg-blue-50/30" onWheel={(e) => e.currentTarget.blur()} />
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                             <div className="space-y-2">
                                <Label>Overall Min CGPA (General)</Label>
                                <Input type="number" step="0.01" {...form.register('min_cgpa')} onWheel={(e) => e.currentTarget.blur()} />
                            </div>
                             <div className="space-y-2">
                                <Label>Max Backlogs Allowed</Label>
                                <Input type="number" {...form.register('max_backlogs_allowed')} onWheel={(e) => e.currentTarget.blur()} />
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 border p-4 rounded-lg bg-gray-50/50">
                            <Controller
                                name="use_aggregate"
                                control={form.control}
                                render={({ field }) => (
                                    <Checkbox id="use_aggregate" checked={field.value} onCheckedChange={field.onChange} />
                                )}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="use_aggregate" className="text-sm font-medium leading-none">Enable Aggregate Percentage Criteria</label>
                            </div>
                            {form.watch('use_aggregate') && (
                                <div className="ml-auto w-32">
                                     <Input type="number" step="0.1" {...form.register('aggregate_percentage')} placeholder="Min %" onWheel={(e) => e.currentTarget.blur()} />
                                </div>
                            )}
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Application Deadline <span className="text-red-500">*</span></Label>
                                <Controller
                                    name="deadline_date"
                                    control={form.control}
                                    render={({ field }) => (
                                        <DatePicker 
                                            date={field.value ? new Date(field.value) : undefined}
                                            setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd'T'HH:mm") : '')} 
                                        />
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Drive Date <span className="text-red-500">*</span></Label>
                                <Controller
                                    name="drive_date"
                                    control={form.control}
                                    render={({ field }) => (
                                        <DatePicker 
                                            date={field.value ? new Date(field.value) : undefined}
                                            setDate={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Element>

            {/* 3. Interview Rounds */}
            <Element name="rounds" className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-4">
                    <div className="h-8 w-1 bg-[#002147] rounded-full"></div>
                    <h2 className="text-2xl font-semibold text-gray-800">Interview Rounds</h2>
                </div>
                
                <Card className="border-none shadow-sm bg-white/50">
                    <CardContent className="space-y-4 pt-6">
                         {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border p-4 rounded-lg bg-gray-50/30">
                                <div className="md:col-span-4 space-y-2">
                                    <Label>Round Name</Label>
                                    <Input {...form.register(`rounds.${index}.name` as const)} placeholder="e.g. Aptitude Test" />
                                </div>
                                <div className="md:col-span-3 space-y-2">
                                    <Label>Date</Label>
                                    <Controller
                                        control={form.control}
                                        name={`rounds.${index}.date`}
                                        render={({ field }) => (
                                            <DatePicker 
                                                date={field.value ? new Date(field.value) : undefined}
                                                setDate={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                                className="w-full"
                                            />
                                        )}
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-2">
                                    <Label>Description</Label>
                                    <Input {...form.register(`rounds.${index}.description` as const)} placeholder="Details..." />
                                </div>
                                <div className="md:col-span-1">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                       <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                         ))}
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => append({ name: '', date: '', description: '' })}
                            className="w-full border-dashed py-6 text-muted-foreground hover:text-[#002147] hover:border-[#002147]"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Interview Round
                        </Button>
                    </CardContent>
                </Card>
            </Element>

            {/* 4. Review & Submit */}
            <Element name="review" className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-4">
                    <div className="h-8 w-1 bg-[#002147] rounded-full"></div>
                    <h2 className="text-2xl font-semibold text-gray-800">Review & Submit</h2>
                </div>

                <Card className="border-none shadow-sm bg-white/50">
                    <CardContent className="flex flex-col gap-6 pt-6">
                        <div className="space-y-4">
                            <Label className="text-lg">Attachments</Label>
                            
                            {/* Existing Attachments */}
                            {existingAttachments.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate font-medium text-sm hover:underline text-blue-700">
                                            {file.name}
                                        </a>
                                        <Badge variant="secondary" className="text-[10px]">Existing</Badge>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeExistingAttachment(index)} className="text-red-500">
                                        Remove
                                    </Button>
                                </div>
                            ))}

                             {/* New Files */}
                            {newFiles.map((file, index) => (
                                <div key={`new-${index}`} className="flex items-center justify-between p-3 border rounded bg-green-50 border-green-200">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className="h-4 w-4 text-green-600 shrink-0" />
                                        <span className="truncate font-medium text-sm text-green-700">{file.name}</span>
                                        <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-200">New</Badge>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeNewFile(index)} className="text-red-500">
                                        Remove
                                    </Button>
                                </div>
                            ))}

                            <FileUpload 
                                onFileSelect={handleFileSelect}
                                label="Upload New Attachment (PDF/Image)"
                                mode="local"
                                multiple={true}
                            />
                        </div>
                        
                        <div className="flex justify-end mt-4">
                             <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto min-w-[200px] bg-[#002147]">
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Updating...</> : 'Republish Drive'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </Element>
          </form>
        </div>

        {/* --- Sticky Sidebar Navigation --- */}
        <aside className="w-64 hidden xl:block sticky top-6 h-fit pl-6 border-l self-start">
            <div className="space-y-6">
                <h3 className="font-semibold text-gray-900">In this form</h3>
                <nav className="space-y-1">
                    {SECTIONS.map((section) => (
                        <div
                            key={section.id}
                            // className={`block px-4 py-2 text-sm transition-all border-l-2 ${
                            //     activeSection === section.id 
                            //     ? "border-transparent text-[#002147] font-bold" 
                            //     : "border-transparent text-gray-500"
                            // }`}
                            className="block px-4 py-2 text-sm border-transparent text-gray-500"
                        >
                            {section.label}
                        </div>
                    ))}
                </nav>
            </div>
        </aside>

      </div>

       {/* Upload Progress Dialog */}
       <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
           <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
               <DialogHeader>
                   <DialogTitle>Republishing Drive</DialogTitle>
                   <DialogDescription>
                       Please wait while we upload new files and update the drive.
                   </DialogDescription>
               </DialogHeader>
               <div className="space-y-4 py-4">
                   <div className="flex items-center justify-between text-sm">
                        <span>Uploading files...</span>
                        <span className="font-medium">{uploadProgress}%</span>
                   </div>
                   <Progress value={uploadProgress} className="h-2" />
               </div>
           </DialogContent>
       </Dialog>

       {/* Scroll To Top Button */}
       <button
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 z-50 p-3 bg-[#002147] text-white rounded-full shadow-lg hover:bg-blue-900 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002147]"
        title="Scroll to Top"
      >
        <ArrowUp className="h-6 w-6" />
      </button>
    </div>
  );
}
