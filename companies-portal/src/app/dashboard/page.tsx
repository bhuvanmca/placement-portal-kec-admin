'use client';

import { useState } from 'react';
import {
    Building2,
    Plus,
    Pencil,
    Trash2,
    Search,
    Check,
    Calendar as CalendarIcon,
    LogOut
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { companyService, Company as APICompany, CreateCompanyInput, CompanyChecklist } from '@/services/company.service';
import { useAuth } from '@/context/auth-context';

interface Company {
    id: number;
    name: string;
    date: string;
    incharge: string;
    eligibleDepartments: string;
    salary: string;
    eligibility: string;
    remarks: string;
    checklist?: CompanyChecklist;
}

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isChecklistOpen, setIsChecklistOpen] = useState(false);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const { logout } = useAuth();

    // Form State
    const [formData, setFormData] = useState<Omit<Company, 'id' | 'checklist'>>({
        name: '',
        date: new Date().toISOString().split('T')[0],
        incharge: '',
        eligibleDepartments: '',
        salary: '',
        eligibility: '',
        remarks: ''
    });

    const fetchCompanies = async () => {
        try {
            setIsLoading(true);
            const data = await companyService.getAllCompanies();
            const mappedData: Company[] = data.map(c => ({
                id: c.id,
                name: c.name,
                date: new Date(c.visit_date).toISOString().split('T')[0],
                incharge: c.incharge,
                eligibleDepartments: c.eligible_departments,
                salary: c.salary,
                eligibility: c.eligibility,
                remarks: c.remarks,
                checklist: c.checklist
            }));
            setCompanies(mappedData);
        } catch (error) {
            toast.error("Failed to fetch companies");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddCompany = async () => {
        if (!formData.name) {
            toast.error("Company name is required");
            return;
        }
        try {
            const input: CreateCompanyInput = {
                name: formData.name,
                visit_date: formData.date,
                incharge: formData.incharge,
                eligible_departments: formData.eligibleDepartments,
                salary: formData.salary,
                eligibility: formData.eligibility,
                remarks: formData.remarks
            };
            await companyService.createCompany(input);
            fetchCompanies();
            setFormData({
                name: '',
                date: new Date().toISOString().split('T')[0],
                incharge: '',
                eligibleDepartments: '',
                salary: '',
                eligibility: '',
                remarks: ''
            });
            setIsAddDialogOpen(false);
            toast.success("Company added successfully");
        } catch (error) {
            toast.error("Failed to add company");
        }
    };

    const handleEditClick = (company: Company) => {
        setCurrentCompany(company);
        setFormData({
            name: company.name,
            date: company.date,
            incharge: company.incharge,
            eligibleDepartments: company.eligibleDepartments,
            salary: company.salary,
            eligibility: company.eligibility,
            remarks: company.remarks
        });
        setIsEditDialogOpen(true);
    };

    const handleRowClick = (company: Company) => {
        setCurrentCompany(company);
        setIsChecklistOpen(true);
    };

    const toggleChecklistItem = async (companyId: number, item: keyof CompanyChecklist) => {
        const company = companies.find(c => c.id === companyId);
        if (!company) return;

        const currentChecklist = company.checklist || {
            approved: false, cab: false, accommodation: false, rounds: false, qp_printout: false
        };
        const newChecklist = { ...currentChecklist, [item]: !currentChecklist[item] };

        try {
            // Optimistic update
            setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, checklist: newChecklist } : c));
            await companyService.updateChecklist(companyId, newChecklist);
        } catch (error) {
            toast.error("Failed to update checklist");
            fetchCompanies(); // Rollback
        }
    };

    const handleUpdateCompany = async () => {
        if (!currentCompany) return;
        try {
            const input: CreateCompanyInput = {
                name: formData.name,
                visit_date: formData.date,
                incharge: formData.incharge,
                eligible_departments: formData.eligibleDepartments,
                salary: formData.salary,
                eligibility: formData.eligibility,
                remarks: formData.remarks
            };
            await companyService.updateCompany(currentCompany.id, input);
            fetchCompanies();
            setIsEditDialogOpen(false);
            setCurrentCompany(null);
            toast.success("Company updated successfully");
        } catch (error) {
            toast.error("Failed to update company");
        }
    };

    const handleDeleteCompany = async (id: number) => {
        if (confirm("Are you sure you want to delete this company?")) {
            try {
                await companyService.deleteCompany(id);
                setCompanies(companies.filter(c => c.id !== id));
                toast.success("Company deleted successfully");
            } catch (error) {
                toast.error("Failed to delete company");
            }
        }
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.eligibleDepartments.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#002147]">Company Details</h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                        <Building2 size={14} />
                        Manage companies and their recruitment criteria.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#002147] hover:bg-[#003366]">
                                <Plus className="mr-2 h-4 w-4" /> Add Company
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Company</DialogTitle>
                                <DialogDescription>
                                    Enter the details of the company visiting for recruitment.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="date" className="text-right">Date</Label>
                                    <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="incharge" className="text-right">Incharge</Label>
                                    <Input id="incharge" name="incharge" value={formData.incharge} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="eligibleDepartments" className="text-right">Departments</Label>
                                    <Input id="eligibleDepartments" name="eligibleDepartments" value={formData.eligibleDepartments} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="salary" className="text-right">Salary</Label>
                                    <Input id="salary" name="salary" value={formData.salary} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="eligibility" className="text-right">Eligibility</Label>
                                    <Input id="eligibility" name="eligibility" value={formData.eligibility} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="remarks" className="text-right">Remarks</Label>
                                    <Textarea id="remarks" name="remarks" value={formData.remarks} onChange={handleInputChange} className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleAddCompany} className="bg-[#002147]">Save Company</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={logout}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </Button>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search company or department..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-xl bg-white shadow-xl overflow-hidden flex-1 border-gray-200/50">
                <div className="overflow-x-auto h-full">
                    <Table>
                        <TableHeader className="bg-[#002147] sticky top-0 z-10 shadow-sm">
                            <TableRow className="hover:bg-[#002147] border-none">
                                <TableHead className="w-[80px] text-white font-bold uppercase text-[10px] tracking-wider">S.no</TableHead>
                                <TableHead className="text-white font-bold uppercase text-[10px] tracking-wider">Name of the company</TableHead>
                                <TableHead className="text-white font-bold uppercase text-[10px] tracking-wider">Date</TableHead>
                                <TableHead className="text-white font-bold uppercase text-[10px] tracking-wider">Incharge</TableHead>
                                <TableHead className="text-white font-bold uppercase text-[10px] tracking-wider">Eligible department</TableHead>
                                <TableHead className="text-white font-bold uppercase text-[10px] tracking-wider">Salary</TableHead>
                                <TableHead className="text-white font-bold uppercase text-[10px] tracking-wider">Eligibility</TableHead>
                                <TableHead className="text-white font-bold uppercase text-[10px] tracking-wider">Remarks</TableHead>
                                <TableHead className="text-right text-white font-bold uppercase text-[10px] tracking-wider pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center text-gray-500">
                                        Loading companies...
                                    </TableCell>
                                </TableRow>
                            ) : filteredCompanies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center text-gray-500">
                                        No companies found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCompanies.map((company, index) => (
                                    <TableRow
                                        key={company.id}
                                        className="hover:bg-blue-50/40 transition-all duration-200 cursor-pointer border-b border-gray-100 group"
                                        onClick={() => handleRowClick(company)}
                                    >
                                        <TableCell className="font-semibold text-gray-500 text-xs pl-6">{index + 1}</TableCell>
                                        <TableCell className="font-bold text-[#002147] tracking-tight">{company.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-100 rounded-md w-fit">
                                                <CalendarIcon size={12} className="text-blue-600" />
                                                <span className="text-[11px] font-medium text-gray-700">
                                                    {new Date(company.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600 font-medium">{company.incharge}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {company.eligibleDepartments.split(',').map((dept, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase border border-indigo-100/50">
                                                        {dept.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                {company.salary}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-gray-600">{company.eligibility}</TableCell>
                                        <TableCell className="max-w-[180px] truncate text-xs text-gray-500 italic" title={company.remarks}>
                                            &quot;{company.remarks}&quot;
                                        </TableCell>
                                        <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditClick(company)}
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 rounded-full"
                                                >
                                                    <Pencil size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteCompany(company.id)}
                                                    className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-100/50 rounded-full"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Company Details</DialogTitle>
                        <DialogDescription>
                            Make changes to the company information here.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">Name</Label>
                            <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-date" className="text-right">Date</Label>
                            <Input id="edit-date" name="date" type="date" value={formData.date} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-incharge" className="text-right">Incharge</Label>
                            <Input id="edit-incharge" name="incharge" value={formData.incharge} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-eligibleDepartments" className="text-right">Departments</Label>
                            <Input id="edit-eligibleDepartments" name="eligibleDepartments" value={formData.eligibleDepartments} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-salary" className="text-right">Salary</Label>
                            <Input id="edit-salary" name="salary" value={formData.salary} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-eligibility" className="text-right">Eligibility</Label>
                            <Input id="edit-eligibility" name="eligibility" value={formData.eligibility} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-remarks" className="text-right">Remarks</Label>
                            <Textarea id="edit-remarks" name="remarks" value={formData.remarks} onChange={handleInputChange} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" onClick={handleUpdateCompany} className="bg-[#002147]">Update Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Checklist Dialog */}
            <Dialog open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
                <DialogContent className="sm:max-w-[425px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="bg-[#002147] p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Check size={80} />
                        </div>
                        <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <Check size={24} className="text-white" />
                            </div>
                            Readiness Checklist
                        </DialogTitle>
                        <DialogDescription className="text-blue-100/70 text-sm mt-1">
                            Preparation tracking for <span className="text-white font-bold">{currentCompany?.name}</span>&apos;s visit.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-8 space-y-5 bg-white">
                        {[
                            { id: 'approved', label: 'All Required Approved', icon: '📜' },
                            { id: 'cab', label: 'Cab Arrangement', icon: '🚗' },
                            { id: 'accommodation', label: 'Accommodation', icon: '🏨' },
                            { id: 'rounds', label: 'Rounds of interview', icon: '👥' },
                            { id: 'qp_printout', label: 'Q/P printout if any', icon: '📄' }
                        ].map((item) => {
                            const isChecked = companies.find(c => c.id === currentCompany?.id)?.checklist?.[item.id as keyof CompanyChecklist] || false;
                            return (
                                <div
                                    key={item.id}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${isChecked ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50 border-gray-100 hover:border-blue-200'
                                        }`}
                                    onClick={() => toggleChecklistItem(currentCompany!.id, item.id as keyof CompanyChecklist)}
                                >
                                    <div className="flex items-center space-x-4">
                                        <span className="text-xl">{item.icon}</span>
                                        <Label
                                            htmlFor={item.id}
                                            className={`text-sm font-semibold cursor-pointer transition-colors ${isChecked ? 'text-emerald-700' : 'text-gray-700 group-hover:text-blue-600'}`}
                                        >
                                            {item.label}
                                        </Label>
                                    </div>
                                    <Checkbox
                                        id={item.id}
                                        checked={isChecked}
                                        onCheckedChange={() => toggleChecklistItem(currentCompany!.id, item.id as keyof CompanyChecklist)}
                                        className={`h-5 w-5 rounded-md ${isChecked ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200' : ''}`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-6 bg-gray-50/50 border-t flex justify-end">
                        <Button onClick={() => setIsChecklistOpen(false)} className="bg-[#002147] hover:bg-[#003366] px-8 rounded-lg shadow-lg">
                            Done
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
