'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  MapPin, 
  Banknote, 
  Trash2,
  Save,
  Loader2,
  Plus,
  Check,
  ChevronRight,
  ArrowUp,
  Settings,
  Pencil,
  FileText
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link, Element, animateScroll as scroll } from 'react-scroll';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FileUpload from '@/components/ui/file-upload';
import { DatePicker } from '@/components/ui/date-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

import { cn } from "@/lib/utils";
import { driveService } from '@/services/drive.service';
import { spocService, Spoc } from '@/services/spoc.service';
import { toast } from 'sonner';
import { DEPARTMENTS } from '@/constants/departments';
import { useScrollSpy } from '@/hooks/use-scroll-spy';

// --- Zod Schema ---
const driveSchema = z.object({
  company_name: z.string().min(2, "Company Name is required"),
  website: z.string().optional(),
  logo_url: z.string().optional(),
  job_role: z.string().min(2, "Job Role is required"),
  job_description: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  drive_type: z.string().min(1, "Drive type is required"),
  domain: z.string().min(1, "Category is required"),
  company_category: z.string().min(1, "Category is required"),
  spoc_id: z.coerce.number().min(1, "SPOC is required"),
  ctc_min: z.coerce.number().min(0),
  ctc_max: z.coerce.number().min(0),
  ctc_display: z.string().min(1, "CTC Display is required (e.g. 6LPA)"),
  
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
  
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string()
  })).optional()
});

type DriveFormValues = z.infer<typeof driveSchema>;

const BATCHES = ['2023', '2024', '2025', '2026', '2027']; 
const SECTIONS = [
    { id: 'company-details', label: 'Company Details' },
    { id: 'eligibility', label: 'Eligibility Criteria' },
    { id: 'rounds', label: 'Interview Rounds' },
    { id: 'review', label: 'Review & Submit' }
];

export default function CreateDrivePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeSection, setActiveSection] = useState('company-details');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  // Template States
  const [templateName, setTemplateName] = useState("");
  const [istemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<{name: string, data: any}[]>([]); 
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null);

  // Company Search State
  const [openCompanySearch, setOpenCompanySearch] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<{name: string, domain: string, icon: string}[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [spocs, setSpocs] = useState<Spoc[]>([]);
  
  // Fetch SPOCs with error handling
  useEffect(() => {
    const fetchSpocs = async () => {
      try {
        const data = await spocService.getAllSpocs();
        setSpocs(data || []);
      } catch (error) {
        console.error('Failed to fetch SPOCs:', error);
        setSpocs([]); 
      }
    };
    fetchSpocs();
  }, []);

  // Debounced Search Effect
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (companyQuery.length >= 2) {
            setLoadingCompanies(true);
            try {
                const results = await driveService.searchCompany(companyQuery);
                setCompanyResults(results);
            } catch (error) {
                console.error("Search error", error);
                setCompanyResults([]);
            } finally {
                setLoadingCompanies(false);
            }
        } else {
            setCompanyResults([]);
        }
    }, 500); 

    return () => clearTimeout(timer);
  }, [companyQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-company-search]')) {
        setOpenCompanySearch(false);
      }
    };

    if (openCompanySearch) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openCompanySearch]);



  const form = useForm<DriveFormValues>({
    resolver: zodResolver(driveSchema) as Resolver<DriveFormValues>,
    defaultValues: {
      company_name: '',
      job_role: '',
      job_description: '',
      location: '',
      ctc_display: '',
      ctc_min: 0,
      ctc_max: 0,
      min_cgpa: 0,
      max_backlogs_allowed: 0,
      // New fields default
      tenth_percentage: 0,
      twelfth_percentage: 0,
      ug_min_cgpa: 0,
      pg_min_cgpa: 0,
      use_aggregate: false,
      aggregate_percentage: 0,
      
      eligible_batches: [],
      eligible_departments: [],
      eligible_gender: 'All',
      domain: '',
      rounds: [{ name: 'Online Assessment', date: '', description: '' }],
      attachments: [],
      drive_type: 'Full-Time',
      company_category: 'Core',
      spoc_id: 0,
      drive_date: '',
      deadline_date: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rounds"
  });
  
  const { fields: attachmentFields, append: appendAttachment, remove: removeAttachment } = useFieldArray({
    control: form.control,
    name: "attachments"
  });

  // Load Templates on Mount
  useEffect(() => {
     const stored = localStorage.getItem('drive_eligibility_templates');
     if (stored) {
         try {
             const parsed = JSON.parse(stored);
             const unique = parsed.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.name === v.name) === i);
             setSavedTemplates(unique);
             if (unique.length !== parsed.length) {
                 localStorage.setItem('drive_eligibility_templates', JSON.stringify(unique));
             }
         } catch(e) {
             console.error("Failed to parse templates", e);
         }
     }
  }, []);

  // --- Template Logic ---
  const handleSaveTemplate = () => {
     if (!templateName.trim()) return;

     const existingIndex = savedTemplates.findIndex(t => t.name.toLowerCase() === templateName.trim().toLowerCase());
     
     if (existingIndex !== -1 && editingTemplateIndex !== existingIndex) {
         toast.error("Template name already exists. Please choose another.");
         return;
     }

     const currentValues = form.getValues();
     const templateData = {
         min_cgpa: currentValues.min_cgpa,
         max_backlogs_allowed: currentValues.max_backlogs_allowed,
         eligible_batches: currentValues.eligible_batches,
         eligible_departments: currentValues.eligible_departments,
         eligible_gender: currentValues.eligible_gender,
         // Add new fields to template
         tenth_percentage: currentValues.tenth_percentage,
         twelfth_percentage: currentValues.twelfth_percentage,
         ug_min_cgpa: currentValues.ug_min_cgpa,
         pg_min_cgpa: currentValues.pg_min_cgpa,
         use_aggregate: currentValues.use_aggregate,
         aggregate_percentage: currentValues.aggregate_percentage
     };

     let newTemplates = [...savedTemplates];
     if (editingTemplateIndex !== null) {
         newTemplates[editingTemplateIndex] = { name: templateName, data: templateData };
         toast.success("Template Updated!");
     } else {
         newTemplates.push({ name: templateName, data: templateData });
         toast.success("Template Saved!");
     }

     setSavedTemplates(newTemplates);
     localStorage.setItem('drive_eligibility_templates', JSON.stringify(newTemplates));
     
     setTemplateName("");
     setEditingTemplateIndex(null);
     setIsTemplateDialogOpen(false);
  };

  const handleApplyTemplate = (templateData: any) => {
      form.setValue('min_cgpa', templateData.min_cgpa);
      form.setValue('max_backlogs_allowed', templateData.max_backlogs_allowed);
      form.setValue('eligible_batches', templateData.eligible_batches);
      form.setValue('eligible_departments', templateData.eligible_departments);
      form.setValue('eligible_gender', templateData.eligible_gender);
      
      // Apply new fields if they exist in template
      if(templateData.tenth_percentage !== undefined) form.setValue('tenth_percentage', templateData.tenth_percentage);
      if(templateData.twelfth_percentage !== undefined) form.setValue('twelfth_percentage', templateData.twelfth_percentage);
      if(templateData.ug_min_cgpa !== undefined) form.setValue('ug_min_cgpa', templateData.ug_min_cgpa);
      if(templateData.pg_min_cgpa !== undefined) form.setValue('pg_min_cgpa', templateData.pg_min_cgpa);
      if(templateData.use_aggregate !== undefined) form.setValue('use_aggregate', templateData.use_aggregate);
      if(templateData.aggregate_percentage !== undefined) form.setValue('aggregate_percentage', templateData.aggregate_percentage);

      toast.success("Template Applied!");
  };

  const handleDeleteTemplate = (index: number) => {
      const newTemplates = savedTemplates.filter((_, i) => i !== index);
      setSavedTemplates(newTemplates);
      localStorage.setItem('drive_eligibility_templates', JSON.stringify(newTemplates));
      toast.success("Template Deleted");
  };

  const openSaveDialog = () => {
      setTemplateName("");
      setEditingTemplateIndex(null);
      setIsTemplateDialogOpen(true);
  };
  
  const openEditDialog = (index: number) => {
      setTemplateName(savedTemplates[index].name);
      setEditingTemplateIndex(index);
      setIsTemplateDialogOpen(true);
      setManageTemplatesOpen(false); 
  };

  // --- Attachments ---
  const handleFileSelect = (file: File) => {
    setSelectedFiles(prev => [...prev, file]);
    appendAttachment({ name: file.name, url: '' });
  };

  const handleRemoveAttachment = (index: number) => {
    removeAttachment(index);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: DriveFormValues) => {
    setIsSubmitting(true);
    setUploadProgress(0);
    if(selectedFiles.length > 0) setShowProgressDialog(true);
    
    try {
      const formData = new FormData();
      const { attachments, ...driveData } = data;
      formData.append('drive_data', JSON.stringify(driveData));
      selectedFiles.forEach((file) => formData.append('attachments', file));

      await driveService.createDrive(formData, (progress) => {
          setUploadProgress(progress);
      });

      toast.success("Drive Created Successfully! 🎉");
      router.push('/dashboard/drives');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to create drive");
      setShowProgressDialog(false); // Hide on error
    } finally {
      setIsSubmitting(false);
      // Don't hide progress dialog immediately on success to let user see 100%, 
      // but router.push will unmount anyway.
    }
  };

  const scrollToTop = () => {
    scroll.scrollToTop({
        containerId: "main-scroll-container",
        duration: 500,
        smooth: true
    });
  };
  
  // Helper to check for PG departments
  const hasPgDepartments = form.watch('eligible_departments')?.some(d => ['MCA', 'MBA', 'M.Tech', 'M.Sc'].includes(d));

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 pb-8">
      <div className="mb-8 p-1">
         <h1 className="text-3xl font-bold tracking-tight text-[#002147]">Create New Drive</h1>
         <p className="text-muted-foreground mt-2">Fill in the details below to post a new placement drive for students.</p>
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
                        {/* Company Search */}
                        <div className="space-y-2">
                             <Label>Company Name <span className="text-red-500">*</span></Label>
                             <div className="flex gap-2 items-center">
                                {form.watch('logo_url') && (
                                    <img src={form.watch('logo_url')} alt="Logo" className="h-10 w-10 object-contain rounded border p-1 bg-white" />
                                )}
                                <div className="w-full relative" data-company-search>
                                    <Input 
                                        placeholder="Search company..." 
                                        value={companyQuery}
                                        onChange={(e) => {
                                            setCompanyQuery(e.target.value);
                                            setOpenCompanySearch(true);
                                        }}
                                        onFocus={() => setOpenCompanySearch(true)}
                                        className="w-full"
                                    />
                                    
                                    {openCompanySearch && companyQuery && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                                            {loadingCompanies && (
                                                <div className="p-3 text-center text-sm text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin inline mr-2"/>
                                                    Searching...
                                                </div>
                                            )}
                                            
                                            {!loadingCompanies && companyResults.length > 0 && (
                                                <div className="p-1">
                                                    {companyResults.map((company) => (
                                                        <div
                                                            key={company.domain}
                                                            onClick={() => {
                                                                form.setValue('company_name', company.name);
                                                                form.setValue('website', company.domain);
                                                                form.setValue('domain', company.domain);
                                                                if (company.icon) form.setValue('logo_url', company.icon);
                                                                setCompanyQuery(company.name);
                                                                setOpenCompanySearch(false);
                                                            }}
                                                            className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer rounded-sm transition-colors"
                                                        >
                                                            {company.icon && (
                                                                <img src={company.icon} alt={company.name} className="mr-2 h-4 w-4 object-contain" />
                                                            )}
                                                            <span className="font-medium flex-1">{company.name}</span>
                                                            {form.watch('company_name') === company.name && <Check className="ml-2 h-4 w-4 text-green-600" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {!loadingCompanies && companyQuery && (
                                                <>
                                                    {companyResults.length > 0 && <div className="border-t border-gray-200 my-1" />}
                                                    <div
                                                        onClick={() => {
                                                            form.setValue('company_name', companyQuery);
                                                            form.setValue('website', '');
                                                            form.setValue('domain', 'custom');
                                                            setOpenCompanySearch(false);
                                                        }}
                                                        className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer rounded-sm transition-colors m-1"
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Use "{companyQuery}"
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
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
                             {form.formState.errors.job_role && <p className="text-red-500 text-xs">{form.formState.errors.job_role.message}</p>}
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                             {spocs.length === 0 ? (
                                 <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                                     <p className="text-sm text-gray-600 mb-2">No SPOCs available</p>
                                     <p className="text-xs text-gray-500">
                                         Create SPOCs in{' '}
                                         <a 
                                             href="/dashboard/settings/spocs" 
                                             target="_blank"
                                             className="text-blue-600 hover:underline font-medium"
                                         >
                                             Settings → SPOC Management
                                         </a>
                                     </p>
                                 </div>
                             ) : (
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
                             )}
                             <p className="text-xs text-muted-foreground mt-1">Manage SPOCs from Settings → SPOCs</p>
                             {form.formState.errors.spoc_id && <p className="text-red-500 text-xs">{form.formState.errors.spoc_id.message}</p>}
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
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-1 bg-[#002147] rounded-full"></div>
                        <h2 className="text-2xl font-semibold text-gray-800">Eligibility Criteria</h2>
                    </div>
                    {/* Template Controls */}
                        <div className="flex gap-2">
                             <Select onValueChange={(val) => {
                                 const template = savedTemplates.find(t => t.name === val);
                                 if(template) handleApplyTemplate(template.data);
                             }}>
                                <SelectTrigger className="w-[180px] h-9">
                                    <SelectValue placeholder="Load Template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {savedTemplates.map((t, i) => <SelectItem key={i} value={t.name}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" type="button" className="h-9" onClick={() => setManageTemplatesOpen(true)} title="Manage Templates">
                                <Settings className="h-4 w-4"/>
                            </Button>
                            <Button variant="outline" size="sm" type="button" className="h-9" onClick={openSaveDialog}>
                                <Save className="mr-2 h-4 w-4"/> Save
                            </Button>
                        </div>
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
                                  {form.formState.errors.eligible_departments && <p className="text-red-500 text-xs">{form.formState.errors.eligible_departments.message}</p>}
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
                                   {form.formState.errors.eligible_batches && <p className="text-red-500 text-xs">{form.formState.errors.eligible_batches.message}</p>}
                             </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label>10th Percentage (Min)</Label>
                                <Input type="number" step="0.1" {...form.register('tenth_percentage')} placeholder="e.g. 60" onWheel={(e) => e.currentTarget.blur()} />
                            </div>
                            <div className="space-y-2">
                                <Label>12th Percentage (Min)</Label>
                                <Input type="number" step="0.1" {...form.register('twelfth_percentage')} placeholder="e.g. 60" onWheel={(e) => e.currentTarget.blur()} />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>UG Min CGPA</Label>
                                <Input type="number" step="0.01" {...form.register('ug_min_cgpa')} placeholder="e.g. 6.0" onWheel={(e) => e.currentTarget.blur()} />
                            </div>

                            {/* Conditional PG Field */}
                            {hasPgDepartments && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-[#002147] font-semibold">PG Min CGPA</Label>
                                    <Input type="number" step="0.01" {...form.register('pg_min_cgpa')} placeholder="e.g. 6.0" className="border-[#002147]/20 bg-blue-50/30" onWheel={(e) => e.currentTarget.blur()} />
                                    <p className="text-[10px] text-muted-foreground">Required for PG students only</p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                             {/* Legacy Min CGPA (kept for compatibility or general cutoff) */}
                             <div className="space-y-2">
                                <Label>Overall Min CGPA (General)</Label>
                                <Input type="number" step="0.01" {...form.register('min_cgpa')} onWheel={(e) => e.currentTarget.blur()} />
                                <p className="text-[10px] text-muted-foreground">General cutoff if specific UG/PG not applied</p>
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
                                <label
                                    htmlFor="use_aggregate"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Enable Aggregate Percentage Criteria
                                </label>
                                <p className="text-sm text-muted-foreground">
                                    Combines 10th and 12th marks into a single aggregate score.
                                </p>
                            </div>
                            {form.watch('use_aggregate') && (
                                <div className="ml-auto w-32 animate-in fade-in slide-in-from-left-2">
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
                                {form.formState.errors.deadline_date && <p className="text-red-500 text-xs">{form.formState.errors.deadline_date.message}</p>}
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
                                {form.formState.errors.drive_date && <p className="text-red-500 text-xs">{form.formState.errors.drive_date.message}</p>}
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
                            {attachmentFields.map((field, index) => (
                                <div key={field.id} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                                    <span className="truncate flex-1 font-medium">{field.name}</span>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAttachment(index)} className="text-red-500">
                                        Remove
                                    </Button>
                                </div>
                            ))}
                            <FileUpload 
                                onFileSelect={handleFileSelect}
                                label="Upload Job Description or Brochure (PDF/Image)"
                                mode="local"
                                multiple={true}
                            />
                        </div>
                        
                        <div className="flex justify-end mt-4">
                             <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto min-w-[200px] bg-[#002147]">
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Posting...</> : 'Post Drive'}
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
                        <Link
                            key={section.id}
                            to={section.id}
                            containerId="main-scroll-container"
                            activeClass="border-[#002147] bg-blue-50 text-[#002147] font-medium"
                            className="block px-4 py-2 text-sm transition-all rounded-md border-l-2 border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50 cursor-pointer"
                            spy={true}
                            smooth={true}
                            offset={-20}
                            duration={500}
                        >
                            {section.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </aside>

      </div>

      {/* Dialogs */}
      <Dialog open={manageTemplatesOpen} onOpenChange={setManageTemplatesOpen}>
         <DialogContent>
             <DialogHeader><DialogTitle>Manage Templates</DialogTitle></DialogHeader>
             <div className="space-y-2 max-h-[300px] overflow-y-auto">
                 {savedTemplates.length === 0 ? <p className="text-sm text-gray-500">No saved templates.</p> : (
                     savedTemplates.map((t, i) => (
                          <div key={i} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                              <span 
                                className="font-medium cursor-pointer hover:underline text-[#002147]"
                                title="Click to Apply Template"
                                onClick={() => { handleApplyTemplate(t.data); setManageTemplatesOpen(false); }}
                              >
                                {t.name}
                              </span>
                              <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => { handleApplyTemplate(t.data); setManageTemplatesOpen(false); }} title="Apply Template">
                                      <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(i)} title="Rename/Update Template">
                                      <Pencil className="h-4 w-4 text-blue-500" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleDeleteTemplate(i)} className="text-red-500" title="Delete Template">
                                      <Trash2 className="h-4 w-4"/>
                                  </Button>
                              </div>
                          </div>
                     ))
                 )}
             </div>
         </DialogContent>
      </Dialog>
      
       {/* Upload Progress Dialog */}
       <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
           <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
               <DialogHeader>
                   <DialogTitle>Creating Drive</DialogTitle>
                   <DialogDescription>
                       Please wait while we upload files and create the drive.
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

      <Dialog open={istemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
         <DialogContent>
             <DialogHeader>
                 <DialogTitle>{editingTemplateIndex !== null ? 'Update Template' : 'Save Template'}</DialogTitle>
             </DialogHeader>
             <div className="py-4">
                 <Label className="mb-2">Template Name</Label>
                 <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
             </div>
             <DialogFooter><Button onClick={handleSaveTemplate}>Save</Button></DialogFooter>
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
