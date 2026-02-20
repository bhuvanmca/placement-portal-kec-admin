'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Pencil, Search, FileEdit, GraduationCap, Users as UsersIcon, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { eligibilityService, EligibilityTemplate, CreateEligibilityTemplateInput } from '@/services/eligibility.service';
import { configService, Department, Batch } from '@/services/config.service';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';

export default function EligibilityTemplatesPage() {
  const [templates, setTemplates] = useState<EligibilityTemplate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EligibilityTemplate | null>(null);
  const [deleteData, setDeleteData] = useState<EligibilityTemplate | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateEligibilityTemplateInput>({
    name: '',
    min_cgpa: 0,
    tenth_percentage: null,
    twelfth_percentage: null,
    ug_min_cgpa: null,
    pg_min_cgpa: null,
    use_aggregate: false,
    aggregate_percentage: null,
    max_backlogs_allowed: 0,
    eligible_departments: [],
    eligible_batches: [],
    eligible_gender: 'All',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesData, deptsData, batchesData] = await Promise.all([
        eligibilityService.getTemplates(),
        configService.getAllDepartments(),
        configService.getAllBatches(),
      ]);
      setTemplates(templatesData);
      setDepartments(deptsData);
      setBatches(batchesData);
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Failed to load eligibility data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      min_cgpa: 0,
      tenth_percentage: null,
      twelfth_percentage: null,
      ug_min_cgpa: null,
      pg_min_cgpa: null,
      use_aggregate: false,
      aggregate_percentage: null,
      max_backlogs_allowed: 0,
      eligible_departments: [],
      eligible_batches: [],
      eligible_gender: 'All',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (template: EligibilityTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      min_cgpa: template.min_cgpa,
      tenth_percentage: template.tenth_percentage,
      twelfth_percentage: template.twelfth_percentage,
      ug_min_cgpa: template.ug_min_cgpa,
      pg_min_cgpa: template.pg_min_cgpa,
      use_aggregate: template.use_aggregate,
      aggregate_percentage: template.aggregate_percentage,
      max_backlogs_allowed: template.max_backlogs_allowed,
      eligible_departments: template.eligible_departments,
      eligible_batches: template.eligible_batches,
      eligible_gender: template.eligible_gender,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Template name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate) {
        await eligibilityService.updateTemplate(editingTemplate.id, formData);
        toast.success('Template updated successfully');
      } else {
        await eligibilityService.createTemplate(formData);
        toast.success('Template created successfully');
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Save failed', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteData) return;
    try {
      await eligibilityService.deleteTemplate(deleteData.id);
      toast.success('Template deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading eligibility templates...</div>;

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#002147]">Eligibility Templates</h2>
          <p className="text-muted-foreground">Manage reusable eligibility criteria for recruitment drives.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-[#002147] hover:bg-[#002147]/90">
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>All saved eligibility criteria.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Min CGPA</TableHead>
                    <TableHead>Depts</TableHead>
                    <TableHead>Batches</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No templates found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{template.min_cgpa}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {template.eligible_departments.slice(0, 2).map((dept) => (
                              <Badge key={dept} variant="outline" className="text-[10px]">{dept}</Badge>
                            ))}
                            {template.eligible_departments.length > 2 && (
                              <Badge variant="outline" className="text-[10px]">+{template.eligible_departments.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-wrap gap-1">
                            {template.eligible_batches.slice(0, 2).map((batch) => (
                              <Badge key={batch} variant="secondary" className="text-[10px]">{batch}</Badge>
                            ))}
                            {template.eligible_batches.length > 2 && (
                              <Badge variant="secondary" className="text-[10px]">+{template.eligible_batches.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.eligible_gender === 'All' ? 'default' : 'outline'}>
                            {template.eligible_gender}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(template)}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteData(template)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CREATE/EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>
              Configure the eligibility criteria for this template.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Template Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g. Standard Core IT Template"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Basic Academic Info */}
              <Card className="shadow-none border-gray-100">
                <CardHeader className="py-3 bg-gray-50/50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    Academic Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4">
                   <div className="grid gap-2">
                    <Label className="text-xs">Minimum Overall CGPA</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.min_cgpa}
                      onChange={(e) => setFormData({ ...formData, min_cgpa: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label className="text-xs">10th %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="None"
                        value={formData.tenth_percentage || ''}
                        onChange={(e) => setFormData({ ...formData, tenth_percentage: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">12th %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="None"
                        value={formData.twelfth_percentage || ''}
                        onChange={(e) => setFormData({ ...formData, twelfth_percentage: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label className="text-xs">UG Min CGPA</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="None"
                        value={formData.ug_min_cgpa || ''}
                        onChange={(e) => setFormData({ ...formData, ug_min_cgpa: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">PG Min CGPA</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="None"
                        value={formData.pg_min_cgpa || ''}
                        onChange={(e) => setFormData({ ...formData, pg_min_cgpa: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 border-t pt-4">
                    <Checkbox
                      id="use_aggregate"
                      checked={formData.use_aggregate}
                      onCheckedChange={(checked) => setFormData({ ...formData, use_aggregate: !!checked })}
                    />
                    <Label htmlFor="use_aggregate" className="text-xs font-medium">Use Aggregate Percentage</Label>
                    {formData.use_aggregate && (
                      <Input
                        type="number"
                        className="w-20 h-8 text-xs"
                        placeholder="%"
                        value={formData.aggregate_percentage || ''}
                        onChange={(e) => setFormData({ ...formData, aggregate_percentage: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Filtering Rules */}
              <Card className="shadow-none border-gray-100">
                <CardHeader className="py-3 bg-gray-50/50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-emerald-600" />
                    Filtering & Restrictions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs">Max Backlogs Allowed</Label>
                    <Input
                      type="number"
                      value={formData.max_backlogs_allowed}
                      onChange={(e) => setFormData({ ...formData, max_backlogs_allowed: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Allowed Gender</Label>
                    <Select
                      value={formData.eligible_gender}
                      onValueChange={(val) => setFormData({ ...formData, eligible_gender: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Male">Male Only</SelectItem>
                        <SelectItem value="Female">Female Only</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Eligible Batches
                    </Label>
                    <MultiSelect
                      options={batches.map(b => ({ label: b.year.toString(), value: b.year }))}
                      selected={formData.eligible_batches}
                      onChange={(vals) => setFormData({ ...formData, eligible_batches: vals })}
                      placeholder="Select years..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Departments Section */}
            <div className="grid gap-2">
               <Label className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-orange-600" />
                  Eligible Departments
               </Label>
               <MultiSelect
                options={departments.map(d => ({ label: `${d.code} (${d.type})`, value: d.code }))}
                selected={formData.eligible_departments}
                onChange={(vals) => setFormData({ ...formData, eligible_departments: vals })}
                placeholder="Search and select departments..."
               />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#002147] hover:bg-[#002147]/90 min-w-[100px]">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <DeleteConfirmationDialog
        isOpen={!!deleteData}
        onClose={() => setDeleteData(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        description={`Are you sure you want to delete the template "${deleteData?.name}"? This action cannot be undone.`}
        confirmationKeyword="DELETE"
      />
    </div>
  );
}

// Missing icon import in previous thought, adding here
import { Building2 } from 'lucide-react';
