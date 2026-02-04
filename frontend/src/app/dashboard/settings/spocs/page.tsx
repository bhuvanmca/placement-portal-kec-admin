'use client';

import { useState, useEffect } from 'react';
import { spocService, Spoc, CreateSpocInput } from '@/services/spoc.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SpocsPage() {
  const [spocs, setSpocs] = useState<Spoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSpoc, setEditingSpoc] = useState<Spoc | null>(null);
  const [formData, setFormData] = useState<CreateSpocInput>({
    name: '',
    designation: '',
    mobile_number: '',
    email: ''
  });

  useEffect(() => {
    loadSpocs();
  }, []);

  const loadSpocs = async () => {
    try {
      setLoading(true);
      const data = await spocService.getAllSpocs();
      setSpocs(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load SPOCs');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({ name: '', designation: '', mobile_number: '', email: '' });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (spoc: Spoc) => {
    setEditingSpoc(spoc);
    setFormData({
      name: spoc.name,
      designation: spoc.designation,
      mobile_number: spoc.mobile_number,
      email: spoc.email
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.mobile_number) {
      toast.error('Name and mobile number are required');
      return;
    }

    try {
      setIsSaving(true);
      await spocService.createSpoc(formData);
      toast.success('SPOC created successfully');
      setIsAddDialogOpen(false);
      loadSpocs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create SPOC');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSpoc) return;
    if (!formData.name || !formData.mobile_number) {
      toast.error('Name and mobile number are required');
      return;
    }

    try {
      setIsSaving(true);
      await spocService.updateSpoc(editingSpoc.id, formData);
      toast.success('SPOC updated successfully');
      setIsEditDialogOpen(false);
      setEditingSpoc(null);
      loadSpocs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update SPOC');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      setIsDeleting(true);
      await spocService.deleteSpoc(id);
      toast.success('SPOC deleted successfully');
      loadSpocs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete SPOC');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (spoc: Spoc) => {
    try {
      await spocService.toggleSpocStatus(spoc.id, !spoc.is_active);
      toast.success(`SPOC ${!spoc.is_active ? 'activated' : 'deactivated'}`);
      loadSpocs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002147]">SPOC Management</h1>
          <p className="text-muted-foreground">Manage Single Points of Contact for placement drives</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add SPOC
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All SPOCs</CardTitle>
          <CardDescription>View and manage all points of contact</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : spocs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No SPOCs found. Add your first SPOC to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spocs.map((spoc) => (
                  <TableRow key={spoc.id}>
                    <TableCell className="font-medium">{spoc.name}</TableCell>
                    <TableCell>{spoc.designation}</TableCell>
                    <TableCell>{spoc.mobile_number}</TableCell>
                    <TableCell>{spoc.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={spoc.is_active}
                          onCheckedChange={() => handleToggleStatus(spoc)}
                        />
                        <Badge variant={spoc.is_active ? 'default' : 'secondary'}>
                          {spoc.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(spoc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(spoc.id, spoc.name)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add SPOC Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New SPOC</DialogTitle>
            <DialogDescription>Enter contact details for the new SPOC</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Placement Officer"
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number *</Label>
              <Input
                value={formData.mobile_number}
                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                placeholder="+91..."
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Adding...' : 'Add SPOC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit SPOC Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit SPOC</DialogTitle>
            <DialogDescription>Update contact details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Placement Officer"
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number *</Label>
              <Input
                value={formData.mobile_number}
                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                placeholder="+91..."
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Update SPOC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
