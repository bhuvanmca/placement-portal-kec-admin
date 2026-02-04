'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Pencil, X } from 'lucide-react';
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
import { configService, Department, Batch } from '@/services/config.service';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';

export default function AcademicConfigPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptType, setDeptType] = useState('UG');
  const [batchYear, setBatchYear] = useState('');

  // Loading States
  const [addingDept, setAddingDept] = useState(false);
  const [addingBatch, setAddingBatch] = useState(false);

  // Edit State
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);

  // Delete State
  const [deleteData, setDeleteData] = useState<{ type: 'dept' | 'batch', id: number, name: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const [deptsData, batchesData] = await Promise.all([
        configService.getAllDepartments(),
        configService.getAllBatches(),
      ]);
      setDepartments(deptsData || []);
      setBatches(batchesData || []);
    } catch (error) {
      console.warn('Failed to load configuration (possibly empty)', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Department Handlers ---

  const handleAddDepartment = async () => {
    if (!deptName || !deptCode) {
        toast.error('Please fill all department fields');
        return;
    }
    setAddingDept(true);
    try {
      await configService.addDepartment({
        name: deptName,
        code: deptCode,
        type: deptType as 'UG' | 'PG',
      });
      toast.success('Department added successfully');
      setDeptName('');
      setDeptCode('');
      fetchConfig();
    } catch (error) {
      toast.error('Failed to add department (Code might be duplicate)');
    } finally {
      setAddingDept(false);
    }
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDeptId(dept.id);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptType(dept.type);
  };

  const handleCancelEditDept = () => {
    setEditingDeptId(null);
    setDeptName('');
    setDeptCode('');
    setDeptType('UG');
  };

  const handleUpdateDepartment = async () => {
    if (!editingDeptId) return;
    setAddingDept(true);
    try {
        await configService.updateDepartment(editingDeptId, {
          name: deptName,
          code: deptCode,
          type: deptType as 'UG' | 'PG',
        });
        toast.success('Department updated successfully');
        handleCancelEditDept();
        fetchConfig();
    } catch (error) {
        toast.error('Failed to update department');
    } finally {
        setAddingDept(false);
    }
  };

  const initiateDeleteDept = (dept: Department) => {
      setDeleteData({ type: 'dept', id: dept.id, name: dept.name });
  };


  // --- Batch Handlers ---

  const handleAddBatch = async () => {
    if (!batchYear || isNaN(parseInt(batchYear))) {
        toast.error('Please enter a valid year');
        return;
    }
    setAddingBatch(true);
    try {
      await configService.addBatch(parseInt(batchYear));
      toast.success('Batch added successfully');
      setBatchYear('');
      fetchConfig();
    } catch (error) {
      toast.error('Failed to add batch (Year might be duplicate)');
    } finally {
      setAddingBatch(false);
    }
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatchId(batch.id);
    setBatchYear(batch.year.toString());
  };

  const handleCancelEditBatch = () => {
    setEditingBatchId(null);
    setBatchYear('');
  };

  const handleUpdateBatch = async () => {
    if (!editingBatchId) return;
    if (!batchYear || isNaN(parseInt(batchYear))) {
      toast.error('Please enter a valid year');
      return;
    }
    setAddingBatch(true);
    try {
        await configService.updateBatch(editingBatchId, parseInt(batchYear));
        toast.success('Batch updated');
        handleCancelEditBatch();
        fetchConfig();
    } catch (error) {
        toast.error('Failed to update batch');
    } finally {
        setAddingBatch(false);
    }
  };

  const initiateDeleteBatch = (batch: Batch) => {
    setDeleteData({ type: 'batch', id: batch.id, name: batch.year.toString() });
  };

  // --- Common Delete Handler ---

  const executeDelete = async () => {
    if (!deleteData) return;
    try {
        if (deleteData.type === 'dept') {
            await configService.deleteDepartment(deleteData.id);
            toast.success('Department deleted');
        } else {
            await configService.deleteBatch(deleteData.id);
            toast.success('Batch deleted');
        }
        fetchConfig();
    } catch (error) {
        toast.error(`Failed to delete ${deleteData.type === 'dept' ? 'department' : 'batch'}`);
    } 
    // Dialog handles its own close/loading via the specialized component
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading configuration...</div>;

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#002147]">Academic Configuration</h2>
        <p className="text-muted-foreground">Manage departments and batch years.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DEPARTMENTS CARD */}
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Manage available departments (UG/PG).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add/Edit Department Form */}
            <div className="grid grid-cols-12 gap-2 items-end border-b pb-4">
              <div className="col-span-4">
                <Label className="text-xs">Code</Label>
                <Input placeholder="e.g. CSE" value={deptCode} onChange={(e) => setDeptCode(e.target.value.toUpperCase())} />
              </div>
              <div className="col-span-5">
                <Label className="text-xs">Name</Label>
                <Input placeholder="Department Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
              </div>
              <div className="col-span-3">
                 <Label className="text-xs">Type</Label>
                 <Select value={deptType} onValueChange={setDeptType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="UG">UG</SelectItem>
                        <SelectItem value="PG">PG</SelectItem>
                        <SelectItem value="PhD">PhD</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <div className="col-span-12 mt-2 flex gap-2">
                {editingDeptId ? (
                    <>
                         <Button onClick={handleUpdateDepartment} disabled={addingDept} className="flex-1 bg-green-600 hover:bg-green-700">
                             {addingDept ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             Update Department
                         </Button>
                         <Button onClick={handleCancelEditDept} variant="outline" size="icon">
                             <X className="h-4 w-4" />
                         </Button>
                    </>
                ) : (
                    <Button onClick={handleAddDepartment} disabled={addingDept} className="w-full">
                        {addingDept ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Add Department
                    </Button>
                )}
              </div>
            </div>

            {/* Departments List */}
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No departments found</TableCell></TableRow>
                  ) : (
                    departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.code}</TableCell>
                        <TableCell>{dept.type}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditDepartment(dept)}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => initiateDeleteDept(dept)}>
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

        {/* BATCHES CARD */}
        <Card>
          <CardHeader>
            <CardTitle>Batches</CardTitle>
            <CardDescription>Manage graduation years.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {/* Add/Edit Batch Form */}
             <div className="flex gap-4 items-end border-b pb-4">
              <div className="flex-1">
                <Label className="text-xs">Year</Label>
                <Input 
                    type="number" 
                    placeholder="e.g. 2026" 
                    value={batchYear} 
                    onChange={(e) => setBatchYear(e.target.value)} 
                />
              </div>
              <div className="flex gap-2">
                 {editingBatchId ? (
                    <>
                         <Button onClick={handleUpdateBatch} disabled={addingBatch} className="bg-green-600 hover:bg-green-700">
                             {addingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             Update
                         </Button>
                         <Button onClick={handleCancelEditBatch} variant="outline" size="icon">
                             <X className="h-4 w-4" />
                         </Button>
                    </>
                 ) : (
                    <Button onClick={handleAddBatch} disabled={addingBatch}>
                        {addingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Add Batch
                    </Button>
                 )}
              </div>
            </div>

             {/* Batches List */}
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No batches found</TableCell></TableRow>
                  ) : (
                    batches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.year}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditBatch(batch)}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => initiateDeleteBatch(batch)}>
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

      {/* REUSED DELETE CONFIRMATION DIALOG */}
      <DeleteConfirmationDialog 
        isOpen={!!deleteData}
        onClose={() => setDeleteData(null)}
        onConfirm={executeDelete}
        title={`Delete ${deleteData?.type === 'dept' ? 'Department' : 'Batch'}`}
        description={`Are you sure you want to delete ${deleteData?.name ? `"${deleteData.name}"` : 'this item'}? This will PERMANENTLY DELETE ALL STUDENTS belonging to this ${deleteData?.type === 'dept' ? 'department' : 'batch'}.`}
        confirmationKeyword="DELETE"
      />
    </div>
  );
}
