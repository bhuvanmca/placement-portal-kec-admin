'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    FileText,
    RefreshCw,
    Eye, // Added
    Users, // Added
    Settings2, // Added
    Search,
    CheckSquare,
    ArrowLeft
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link as ScrollLink, Element, Events, scrollSpy, scroller, animateScroll as scroll } from 'react-scroll'; // Modified
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FileUpload from '@/components/ui/file-upload';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Added
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Added
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { driveService } from '@/services/drive.service';
import { spocService, Spoc } from '@/services/spoc.service';
import { toast } from 'sonner';
import { configService, Department, Batch } from '@/services/config.service';
import { eligibilityService, EligibilityTemplate, DriveApplicantDetailed } from '@/services/eligibility.service'; // Modified
// ... imports

// --- Zod Schema ---
const driveSchema = z.object({
    company_name: z.string().min(2, "Company Name is required"),
    website: z.string().optional(),
    logo_url: z.string().optional(),
    job_description: z.string().optional(),
    location: z.string().min(2, "Location is required"),
    location_type: z.enum(['On-Site', 'Hybrid', 'Remote']).default('On-Site'),
    drive_type: z.string().min(1, "Drive type is required"),
    company_category: z.string().min(1, "Category is required"),
    offer_type: z.enum(['Regular', 'Dream']).default('Regular'),
    allow_placed_candidates: z.boolean().default(false),
    spoc_id: z.coerce.number().min(1, "SPOC is required"),

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

    roles: z.array(z.object({
        role_name: z.string().min(1, "Role Name is required"),
        ctc: z.string().min(1, "CTC is required"),
        salary: z.coerce.number().optional(),
        stipend: z.string().optional(),
    })).min(1, "At least one role is required"),

    attachments: z.array(z.object({
        name: z.string(),
        url: z.string()
    })).optional()
});

type DriveFormValues = z.infer<typeof driveSchema>;

const SECTIONS = [
    { id: 'company-details', label: 'Company Details' },
    { id: 'eligibility', label: 'Eligibility Criteria' },
    { id: 'schedule', label: 'Schedule & Rounds' },
    { id: 'review', label: 'Review & Submit' }
];

export default function CreateDrivePage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'open' | 'draft'>('open');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [activeSection, setActiveSection] = useState('company-details');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showProgressDialog, setShowProgressDialog] = useState(false);

    // Template States
    const [templateName, setTemplateName] = useState("");
    const [istemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
    const [savedTemplates, setSavedTemplates] = useState<EligibilityTemplate[]>([]);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    // New states for Eligibility Preview
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewStudents, setPreviewStudents] = useState<DriveApplicantDetailed[]>([]);
    const [previewSearch, setPreviewSearch] = useState("");
    const [removedStudentIds, setRemovedStudentIds] = useState<number[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

    // Company Search State
    const [openCompanySearch, setOpenCompanySearch] = useState(false);
    const [companyQuery, setCompanyQuery] = useState("");
    const [companyResults, setCompanyResults] = useState<{ name: string, domain: string, icon: string }[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [spocs, setSpocs] = useState<Spoc[]>([]);

    // Config State
    const [departments, setDepartments] = useState<Department[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);

    // Columns visibility state for Preview Table
    const [visibleColumns, setVisibleColumns] = useState({
        register_number: true,
        department: true,
        batch_year: true,
        tenth_mark: false,
        twelfth_mark: false,
        diploma_mark: false,
        ug_cgpa: true,
        pg_cgpa: true,
        current_backlogs: false,
        history_backlogs: false,
    });

    const displayStudents = useMemo(() => {
        return previewStudents.filter((s: DriveApplicantDetailed) => {
            if (removedStudentIds.includes(s.id)) return false;
            if (!previewSearch) return true;
            const search = previewSearch.toLowerCase();
            return (
                s.full_name?.toLowerCase().includes(search) ||
                s.register_number?.toLowerCase().includes(search) ||
                s.email?.toLowerCase().includes(search) ||
                s.department?.toLowerCase().includes(search)
            );
        });
    }, [previewStudents, previewSearch, removedStudentIds]);

    const handleRemoveStudentFromPreview = (id: number) => {
        setRemovedStudentIds(prev => [...prev, id]);
        toast.info("Student removed from preview");
    };

    const toggleStudentSelection = (id: number) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const toggleAllSelection = () => {
        if (selectedStudentIds.length === displayStudents.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(displayStudents.map(s => s.id));
        }
    };

    // Fetch Config
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const [d, b] = await Promise.all([
                    configService.getAllDepartments(),
                    configService.getAllBatches()
                ]);
                setDepartments(d || []);
                setBatches(b || []);
            } catch (e) {
                toast.error("Failed to load config");
            }
        };
        fetchConfig();
    }, []);

    // Fetch SPOCs with error handling
    const [loadingSpocs, setLoadingSpocs] = useState(false);
    const fetchSpocs = async () => {
        setLoadingSpocs(true);
        try {
            const data = await spocService.getAllSpocs();
            setSpocs(data || []);
            if (data?.length > 0) toast.success("SPOCs refreshed");
        } catch (error) {
            //   console.error('Failed to fetch SPOCs:', error);
            toast.error("Failed to load SPOCs");
        } finally {
            setLoadingSpocs(false);
        }
    };

    useEffect(() => {
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
                    // console.error("Search error", error);
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
            location: '',
            location_type: 'On-Site',
            roles: [{ role_name: '', ctc: '', stipend: '' }], // Start with 1 empty role
            offer_type: 'Regular',
            allow_placed_candidates: false,
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
            rounds: [{ name: 'Online Assessment', date: '', description: '' }],
            // roles: [], -- Removed duplicate
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

    const { fields: roleFields, append: appendRole, remove: removeRole } = useFieldArray({
        control: form.control,
        name: "roles"
    });

    const { fields: attachmentFields, append: appendAttachment, remove: removeAttachment } = useFieldArray({
        control: form.control,
        name: "attachments"
    });

    // Load Templates from Backend
    const fetchTemplates = async () => {
        try {
            const data = await eligibilityService.getTemplates();
            setSavedTemplates(data || []);
        } catch (e) {
            console.error("Failed to load templates", e);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    // --- Template Logic ---
    const handleSaveTemplate = async () => {
        if (!templateName.trim()) return;

        const existing = savedTemplates.find(t => t.name.toLowerCase() === templateName.trim().toLowerCase());
        if (existing) {
            toast.error("Template name already exists. Please choose another.");
            return;
        }

        setIsSavingTemplate(true);
        const currentValues = form.getValues();

        try {
            await eligibilityService.createTemplate({
                name: templateName,
                min_cgpa: Number(currentValues.min_cgpa) || 0,
                tenth_percentage: Number(currentValues.tenth_percentage) || 0,
                twelfth_percentage: Number(currentValues.twelfth_percentage) || 0,
                ug_min_cgpa: Number(currentValues.ug_min_cgpa) || 0,
                pg_min_cgpa: Number(currentValues.pg_min_cgpa) || 0,
                use_aggregate: currentValues.use_aggregate,
                aggregate_percentage: Number(currentValues.aggregate_percentage) || 0,
                max_backlogs_allowed: Number(currentValues.max_backlogs_allowed) || 0,
                eligible_departments: currentValues.eligible_departments,
                eligible_batches: currentValues.eligible_batches,
                eligible_gender: currentValues.eligible_gender,
            });

            toast.success("Template Saved to Cloud! 🚀");
            setTemplateName("");
            setIsTemplateDialogOpen(false);
            fetchTemplates();
        } catch (error) {
            console.error("Template save error:", error);
            toast.error("Failed to save template to cloud");
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleApplyTemplate = (template: EligibilityTemplate) => {
        form.setValue('min_cgpa', template.min_cgpa);
        form.setValue('max_backlogs_allowed', template.max_backlogs_allowed);
        form.setValue('eligible_batches', template.eligible_batches);
        form.setValue('eligible_departments', template.eligible_departments);
        form.setValue('eligible_gender', template.eligible_gender as any);

        form.setValue('tenth_percentage', template.tenth_percentage || 0);
        form.setValue('twelfth_percentage', template.twelfth_percentage || 0);
        form.setValue('ug_min_cgpa', template.ug_min_cgpa || 0);
        form.setValue('pg_min_cgpa', template.pg_min_cgpa || 0);
        form.setValue('use_aggregate', template.use_aggregate);
        form.setValue('aggregate_percentage', template.aggregate_percentage || 0);

        toast.success("Template Applied!");
    };

    const handleDeleteTemplate = async (id: number) => {
        try {
            await eligibilityService.deleteTemplate(id);
            toast.success("Template Deleted");
            fetchTemplates();
        } catch (e) {
            toast.error("Failed to delete template");
        }
    };

    const openSaveDialog = () => {
        setTemplateName("");
        setIsTemplateDialogOpen(true);
    };

    const openEditDialog = (template: EligibilityTemplate) => {
        router.push(`/dashboard/settings/eligibility?edit=${template.id}`);
    };

    // --- Eligibility Preview ---
    const handlePreviewEligibility = async () => {
        setPreviewLoading(true);
        setIsPreviewOpen(true);
        const currentValues = form.getValues();

        try {
            // Construct partial payload mirroring the CreateDriveInput expectations on backend
            const payload = {
                tenth_percentage: Number(currentValues.tenth_percentage),
                twelfth_percentage: Number(currentValues.twelfth_percentage),
                ug_min_cgpa: Number(currentValues.ug_min_cgpa),
                pg_min_cgpa: Number(currentValues.pg_min_cgpa),
                use_aggregate: currentValues.use_aggregate,
                aggregate_percentage: Number(currentValues.aggregate_percentage),
                min_cgpa: Number(currentValues.min_cgpa),
                max_backlogs_allowed: Number(currentValues.max_backlogs_allowed),
                eligible_departments: currentValues.eligible_departments,
                eligible_batches: currentValues.eligible_batches,
                eligible_gender: currentValues.eligible_gender,
            };

            const students = await driveService.eligibilityPreview(payload);
            setPreviewStudents(students);
        } catch (error) {
            console.error("Preview error:", error);
            toast.error("Failed to load eligible students preview");
            setIsPreviewOpen(false);
        } finally {
            setPreviewLoading(false);
        }
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
        if (selectedFiles.length > 0) setShowProgressDialog(true);

        try {
            const formData = new FormData();
            const { attachments, ...driveData } = data;

            const payload = { ...driveData, status: submitStatus, excluded_student_ids: removedStudentIds };
            formData.append('drive_data', JSON.stringify(payload));

            selectedFiles.forEach((file) => formData.append('attachments', file));

            await driveService.createDrive(formData, (progress) => {
                setUploadProgress(progress);
            });

            toast.success("Drive Created Successfully! 🎉");
            router.push('/dashboard/drives');
        } catch (error: any) {
            //   console.error(error);
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
        <div className="w-full max-w-[1600px] mx-auto p-6 pb-8 bg-gray-50/50 min-h-screen">
            <div className="mb-8 p-1 flex items-center gap-4">
                <Link href="/dashboard/drives">
                    <Button variant="ghost" size="icon" className="-ml-3 rounded-full hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#002147]">Create New Drive</h1>
                    <p className="text-muted-foreground mt-2">Fill in the details below to post a new placement drive for students.</p>
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
                                    {/* Company Search */}
                                    <div className="space-y-2">
                                        <Label>Company Name <span className="text-red-500">*</span></Label>
                                        <div className="flex gap-2 items-center">
                                            {form.watch('logo_url') && (
                                                <img src={form.watch('logo_url')} alt="Logo" className="h-10 w-10 object-contain rounded border p-1 bg-white" />
                                            )}
                                            <div className="w-full relative flex gap-2" data-company-search>
                                                <Input
                                                    placeholder="Search company..."
                                                    value={companyQuery}
                                                    onChange={(e) => {
                                                        setCompanyQuery(e.target.value);
                                                        setOpenCompanySearch(true);
                                                    }}
                                                    onFocus={() => setOpenCompanySearch(true)}
                                                    className="w-full flex-1"
                                                />
                                                <Button type="button" variant="default" className="bg-[#002147] hover:bg-[#003366]">
                                                    <Search className="h-4 w-4 md:mr-2" />
                                                    <span className="hidden md:inline">Search</span>
                                                </Button>

                                                {openCompanySearch && companyQuery && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                                                        {loadingCompanies && (
                                                            <div className="p-3 text-center text-sm text-muted-foreground">
                                                                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                                                Searching...
                                                            </div>
                                                        )}

                                                        {!loadingCompanies && companyResults?.length > 0 && (
                                                            <div className="p-1">
                                                                {companyResults.map((company) => (
                                                                    <div
                                                                        key={company.domain}
                                                                        onClick={() => {
                                                                            form.setValue('company_name', company.name);
                                                                            form.setValue('website', company.domain);
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
                                                                {companyResults?.length > 0 && <div className="border-t border-gray-200 my-1" />}
                                                                <div
                                                                    onClick={() => {
                                                                        form.setValue('company_name', companyQuery);
                                                                        form.setValue('website', '');
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
                                        <Label>Location</Label>
                                        <div className="flex gap-2">
                                            <Input {...form.register('location')} placeholder="e.g. Bangalore, India" className="flex-1" />
                                            <Controller
                                                name="location_type"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="On-Site">On-Site</SelectItem>
                                                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                                                            <SelectItem value="Remote">Remote</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* ROLES SECTION */}
                                    <div className="col-span-1 md:col-span-2 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base font-semibold">Job Roles</Label>
                                            <Button type="button" variant="outline" size="sm" onClick={() => appendRole({ role_name: '', ctc: '', stipend: '' })}>
                                                <Plus className="h-4 w-4 mr-2" /> Add Role
                                            </Button>
                                        </div>

                                        {roleFields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border p-4 rounded-lg bg-blue-50/50 relative">
                                                <div className="md:col-span-4 space-y-2">
                                                    <Label>Role Name <span className="text-red-500">*</span></Label>
                                                    <Input {...form.register(`roles.${index}.role_name` as const)} placeholder="e.g. SDE-1" />
                                                    {form.formState.errors.roles?.[index]?.role_name && <p className="text-red-500 text-xs">{form.formState.errors.roles[index]?.role_name?.message}</p>}
                                                </div>
                                                <div className="md:col-span-3 space-y-2">
                                                    <Label>CTC <span className="text-red-500">*</span></Label>
                                                    <Input {...form.register(`roles.${index}.ctc` as const)} placeholder="e.g. 10 LPA" />
                                                    {form.formState.errors.roles?.[index]?.ctc && <p className="text-red-500 text-xs">{form.formState.errors.roles[index]?.ctc?.message}</p>}
                                                </div>
                                                {/* Added Salary (Numeric) Input hidden or explicit? For now implied from CTC or added explicit? 
                                        Let's add explicit Salary input for filtering correctness as per backend changes.
                                    */}
                                                <div className="md:col-span-2 space-y-2">
                                                    <Label>Salary (Numeric)</Label>
                                                    <Input type="number" {...form.register(`roles.${index}.salary` as const)} placeholder="600000" />
                                                </div>
                                                <div className="md:col-span-2 space-y-2">
                                                    <Label>Stipend</Label>
                                                    <Input {...form.register(`roles.${index}.stipend` as const)} placeholder="e.g. 30k" />
                                                </div>

                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeRole(index)} className="absolute top-2 right-2 text-red-500 hover:bg-red-50 h-6 w-6">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {roleFields.length > 0 && <p className="text-xs text-muted-foreground">Adding roles here allows students to select specific roles.</p>}
                                    </div>

                                    <div className="col-span-1 md:col-span-2 space-y-2">
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
                                        <Label>Offer Type</Label>
                                        <Controller
                                            name="offer_type"
                                            control={form.control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger><SelectValue placeholder="Select Offer Type" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Regular">Regular</SelectItem>
                                                        <SelectItem value="Dream">Dream</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2 col-span-1 md:col-span-2 mt-2">
                                        <div className="flex items-center space-x-2 border p-4 rounded-lg bg-gray-50/50">
                                            <Controller
                                                name="allow_placed_candidates"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <Checkbox id="allow_placed_candidates" checked={field.value} onCheckedChange={field.onChange} />
                                                )}
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <label htmlFor="allow_placed_candidates" className="text-sm font-medium leading-none cursor-pointer">Allow Placed Candidates to Apply</label>
                                                <p className="text-xs text-muted-foreground">If checked, students who are already placed can apply for this drive.</p>
                                            </div>
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
                                                        <SelectItem value="Internship to Full-Time">Internship to Full-Time</SelectItem>
                                                        <SelectItem value="Internship and Full-Time">Internship and Full-Time</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                    {/* SPOC Field */}
                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>SPOC (Single Point of Contact)</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={fetchSpocs}
                                                disabled={loadingSpocs}
                                                title="Refresh SPOC List"
                                            >
                                                <RefreshCw className={`h-3 w-3 ${loadingSpocs ? 'animate-spin' : ''}`} />
                                            </Button>
                                        </div>
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
                                        if (template) handleApplyTemplate(template);
                                    }}>
                                        <SelectTrigger className="w-[180px] h-9">
                                            <SelectValue placeholder={savedTemplates.length === 0 ? "No templates available" : "Load Template"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {savedTemplates.length === 0 ? (
                                                <div className="p-2 text-sm text-gray-500 text-center">No saved templates</div>
                                            ) : (
                                                savedTemplates.map((t, i) => <SelectItem key={i} value={t.name}>{t.name}</SelectItem>)
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" type="button" className="h-9" onClick={() => setManageTemplatesOpen(true)} title="Manage Templates">
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" type="button" className="h-9" onClick={openSaveDialog}>
                                        <Save className="mr-2 h-4 w-4" /> Save
                                    </Button>
                                    <div className="w-[1px] h-6 bg-gray-300 mx-1 self-center"></div>
                                    <Button variant="secondary" size="sm" type="button" className="h-9 font-medium text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100" onClick={handlePreviewEligibility}>
                                        <Eye className="mr-2 h-4 w-4" /> Preview Students
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
                                                        options={departments.map(d => d.code)}
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
                                                        options={batches.map(b => b.year.toString())}
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

                                </CardContent>
                            </Card>
                        </Element>

                        {/* 3. Schedule & Rounds */}
                        <Element name="schedule" className="space-y-6">
                            <div className="flex items-center gap-2 border-b pb-4">
                                <div className="h-8 w-1 bg-[#002147] rounded-full"></div>
                                <h2 className="text-2xl font-semibold text-gray-800">Schedule & Interview Rounds</h2>
                            </div>

                            <Card className="border-none shadow-sm bg-white/50">
                                <CardContent className="space-y-6 pt-6">
                                    {/* Dates */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-base font-semibold text-[#002147]">Application Deadline <span className="text-red-500">*</span></Label>
                                            <p className="text-xs text-muted-foreground mb-2">Last date for students to opt-in.</p>
                                            <Controller
                                                name="deadline_date"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <DateTimePicker
                                                        date={field.value ? new Date(field.value) : undefined}
                                                        setDate={(date) => field.onChange(date ? date.toISOString() : '')}
                                                        disablePastDates
                                                    />
                                                )}
                                            />
                                            {form.formState.errors.deadline_date && <p className="text-red-500 text-xs">{form.formState.errors.deadline_date.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-base font-semibold text-[#002147]">Expected Drive Date <span className="text-red-500">*</span></Label>
                                            <p className="text-xs text-muted-foreground mb-2">When is the placement drive taking place?</p>
                                            <Controller
                                                name="drive_date"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <DateTimePicker
                                                        date={field.value ? new Date(field.value) : undefined}
                                                        setDate={(date) => field.onChange(date ? date.toISOString() : '')}
                                                        disablePastDates
                                                        minDate={form.watch("deadline_date") ? new Date(form.watch("deadline_date")) : undefined}
                                                    />
                                                )}
                                            />
                                            {form.formState.errors.drive_date && <p className="text-red-500 text-xs">{form.formState.errors.drive_date.message}</p>}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-4 pt-2">
                                        <Label className="text-base font-semibold text-[#002147]">Interview Rounds Sequence</Label>
                                        <p className="text-xs text-muted-foreground">Define the timeline of the placement process.</p>

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
                                                        render={({ field }) => {
                                                            const prevDateStr = index > 0
                                                                ? form.watch(`rounds.${index - 1}.date`)
                                                                : form.watch("drive_date");
                                                            return (
                                                                <DateTimePicker
                                                                    date={field.value ? new Date(field.value) : undefined}
                                                                    setDate={(date) => field.onChange(date ? date.toISOString() : '')}
                                                                    className="w-full"
                                                                    disablePastDates
                                                                    minDate={prevDateStr ? new Date(prevDateStr) : undefined}
                                                                />
                                                            )
                                                        }}
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
                                    </div>
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

                                    <div className="flex justify-end gap-4 mt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="lg"
                                            disabled={isSubmitting}
                                            className="w-full md:w-auto min-w-[150px]"
                                            onClick={() => {
                                                setSubmitStatus('draft');
                                                form.handleSubmit(onSubmit)();
                                            }}
                                        >
                                            {isSubmitting && submitStatus === 'draft' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save as Draft'}
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="lg"
                                            disabled={isSubmitting}
                                            className="w-full md:w-auto min-w-[200px] bg-[#002147]"
                                            onClick={() => setSubmitStatus('open')}
                                        >
                                            {isSubmitting && submitStatus === 'open' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : 'Post Drive'}
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
                                    className="block px-4 py-2 text-sm border-transparent text-gray-500"
                                >
                                    {section.label}
                                </div>
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
                                        onClick={() => { handleApplyTemplate(t); setManageTemplatesOpen(false); }}
                                    >
                                        {t.name}
                                    </span>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => { handleApplyTemplate(t); setManageTemplatesOpen(false); }} title="Apply Template">
                                            <Check className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(t)} title="Rename/Update Template">
                                            <Pencil className="h-4 w-4 text-blue-500" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleDeleteTemplate(t.id)} className="text-red-500" title="Delete Template">
                                            <Trash2 className="h-4 w-4" />
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
                        <DialogTitle>Save Template</DialogTitle>
                        <DialogDescription>
                            Enter a name to save these eligibility criteria for future use.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="mb-2">Template Name</Label>
                        <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveTemplate} disabled={isSavingTemplate}>
                            {isSavingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Eligible Students Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b bg-gray-50/50 shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="flex items-center text-xl text-[#002147]">
                                    <Users className="mr-2 h-5 w-5" />
                                    Eligible Students Preview
                                </DialogTitle>
                                <DialogDescription className="mt-1">
                                    Based on the current criteria mapped in the form above.
                                </DialogDescription>
                            </div>
                            {!previewLoading && (
                                <div className="flex gap-2 items-center">
                                    <div className="bg-[#002147]/10 text-[#002147] text-sm font-semibold px-4 py-2 rounded-full flex items-center shadow-sm">
                                        {previewStudents.length} Students Matches
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-9">
                                                <Settings2 className="h-4 w-4 mr-2" /> Columns
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {Object.keys(visibleColumns).map(col => (
                                                <DropdownMenuCheckboxItem
                                                    key={col}
                                                    checked={visibleColumns[col as keyof typeof visibleColumns]}
                                                    onSelect={(e) => e.preventDefault()}
                                                    onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [col]: checked }))}
                                                    className="capitalize"
                                                >
                                                    {col.replace(/_/g, ' ')}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>
                        {!previewLoading && previewStudents.length > 0 && (
                            <div className="mt-4 flex items-center gap-4">
                                <div className="flex gap-2 flex-1">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search by name, register number, email or department..."
                                            className="pl-9 h-10 border-gray-200 focus:ring-[#002147] focus:border-[#002147] w-full"
                                            value={previewSearch}
                                            onChange={(e) => setPreviewSearch(e.target.value)}
                                        />
                                    </div>
                                    <Button type="button" variant="default" className="bg-[#002147] hover:bg-[#003366] h-10">
                                        <Search className="h-4 w-4 md:mr-2" />
                                        <span className="hidden md:inline">Search</span>
                                    </Button>
                                </div>
                                {selectedStudentIds.length > 0 && (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                        <span className="text-sm font-medium text-gray-600">{selectedStudentIds.length} selected</span>
                                        {/* Action button for multiple students could go here */}
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogHeader>

                    <div className="p-0 overflow-y-auto flex-1">
                        {previewLoading ? (
                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mb-4 text-[#002147]" />
                                <p>Analyzing student database...</p>
                            </div>
                        ) : previewStudents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                <div className="bg-gray-100 p-4 rounded-full mb-4">
                                    <Users className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="font-medium text-gray-700 text-lg">No students match these criteria</p>
                                <p className="text-sm mt-1">Try loosening the constraints (CGPA, marks, or backlogs).</p>
                            </div>
                        ) : (
                            <div className="border-t overflow-x-auto w-full">
                                <Table className="min-w-max border-separate border-spacing-0">
                                    <TableHeader className="bg-gray-50/80 sticky top-0 z-20 shadow-sm border-b">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[50px] pl-6 py-4">
                                                <Checkbox
                                                    checked={selectedStudentIds.length === displayStudents.length && displayStudents.length > 0}
                                                    onCheckedChange={toggleAllSelection}
                                                />
                                            </TableHead>
                                            <TableHead className="min-w-[200px] sticky left-0 z-30 bg-gray-50 border-r py-4">Student</TableHead>
                                            {visibleColumns.register_number && <TableHead className="py-4">Register No.</TableHead>}
                                            {visibleColumns.department && <TableHead className="py-4">Department</TableHead>}
                                            {visibleColumns.batch_year && <TableHead className="py-4">Batch</TableHead>}
                                            {visibleColumns.tenth_mark && <TableHead className="text-right py-4">10th %</TableHead>}
                                            {visibleColumns.twelfth_mark && <TableHead className="text-right py-4">12th %</TableHead>}
                                            {visibleColumns.diploma_mark && <TableHead className="text-right py-4">Diploma %</TableHead>}
                                            {visibleColumns.ug_cgpa && <TableHead className="text-right py-4">UG CGPA</TableHead>}
                                            {visibleColumns.pg_cgpa && <TableHead className="text-right py-4">PG CGPA</TableHead>}
                                            {visibleColumns.current_backlogs && <TableHead className="text-right py-4">Current Backlogs</TableHead>}
                                            {visibleColumns.history_backlogs && <TableHead className="text-right py-4">History Backlogs</TableHead>}
                                            <TableHead className="text-right pr-6 py-4">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {displayStudents.map((s) => (
                                            <TableRow key={s.id} className="hover:bg-gray-50/50 group">
                                                <TableCell className="pl-6 py-4">
                                                    <Checkbox
                                                        checked={selectedStudentIds.includes(s.id)}
                                                        onCheckedChange={() => toggleStudentSelection(s.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium sticky left-0 z-10 bg-white border-r py-4">
                                                    <div className="flex items-center gap-3 relative z-0">
                                                        <Avatar className="h-9 w-9 shrink-0 relative mt-0.5 ring-1 ring-gray-100">
                                                            <AvatarImage src={s.profile_photo_url || ''} />
                                                            <AvatarFallback className="text-xs bg-[#002147]/5 text-[#002147] font-semibold">{s.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-semibold text-gray-900 truncate max-w-[150px]">{s.full_name}</div>
                                                            <div className="text-[11px] text-muted-foreground truncate">{s.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                {visibleColumns.register_number && <TableCell className="py-4 font-mono text-xs">{s.register_number}</TableCell>}
                                                {visibleColumns.department && (
                                                    <TableCell className="py-4">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                            {s.department}
                                                        </span>
                                                    </TableCell>
                                                )}
                                                {visibleColumns.batch_year && <TableCell className="py-4">{s.batch_year}</TableCell>}
                                                {visibleColumns.tenth_mark && <TableCell className="text-right py-4">{s.tenth_mark?.toFixed(2) || '—'}</TableCell>}
                                                {visibleColumns.twelfth_mark && <TableCell className="text-right py-4">{s.twelfth_mark?.toFixed(2) || '—'}</TableCell>}
                                                {visibleColumns.diploma_mark && <TableCell className="text-right py-4">{s.diploma_mark?.toFixed(2) || '—'}</TableCell>}
                                                {visibleColumns.ug_cgpa && <TableCell className="text-right py-4 font-medium">{s.ug_cgpa > 0 ? s.ug_cgpa.toFixed(2) : '—'}</TableCell>}
                                                {visibleColumns.pg_cgpa && (
                                                    <TableCell className="text-right py-4 font-medium">
                                                        {s.pg_cgpa > 0 ? s.pg_cgpa.toFixed(2) : <span className="text-gray-400">—</span>}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.current_backlogs && (
                                                    <TableCell className="text-right py-4">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                                            s.current_backlogs > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                                                        )}>
                                                            {s.current_backlogs}
                                                        </span>
                                                    </TableCell>
                                                )}
                                                {visibleColumns.history_backlogs && <TableCell className="text-right py-4">{s.history_of_backlogs}</TableCell>}
                                                <TableCell className="text-right pr-6 py-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 transition-opacity"
                                                        onClick={() => handleRemoveStudentFromPreview(s.id)}
                                                        title="Remove from this preview"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
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
