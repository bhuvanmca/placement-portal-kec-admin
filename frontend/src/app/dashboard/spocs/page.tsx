"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { spocService, Spoc, CreateSpocInput } from "@/services/spoc.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

export default function SpocDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [spocs, setSpocs] = useState<Spoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSpoc, setEditingSpoc] = useState<Spoc | null>(null);
  const [formData, setFormData] = useState<CreateSpocInput>({
    name: "",
    designation: "",
    mobile_number: "",
    email: "",
  });

  useEffect(() => {
    if (user?.role !== "super_admin") {
      router.push("/dashboard");
      return;
    }
    loadSpocs();
  }, [user, router]);

  const loadSpocs = async () => {
    try {
      setLoading(true);
      const data = await spocService.getAllSpocs();
      setSpocs(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to load SPOCs");
    } finally {
      setLoading(false);
    }
  };

  const filteredSpocs = useMemo(() => {
    if (!searchQuery.trim()) return spocs;
    const q = searchQuery.toLowerCase();
    return spocs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.mobile_number.includes(q),
    );
  }, [spocs, searchQuery]);

  const stats = useMemo(() => {
    const total = spocs.length;
    const active = spocs.filter((s) => s.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [spocs]);

  const resetForm = () => {
    setFormData({ name: "", designation: "", mobile_number: "", email: "" });
  };

  const handleAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (spoc: Spoc) => {
    setEditingSpoc(spoc);
    setFormData({
      name: spoc.name,
      designation: spoc.designation,
      mobile_number: spoc.mobile_number,
      email: spoc.email,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.mobile_number.trim()) {
      toast.error("Name and mobile number are required");
      return;
    }

    try {
      setIsSaving(true);
      await spocService.createSpoc(formData);
      toast.success("SPOC created successfully");
      setIsAddDialogOpen(false);
      resetForm();
      loadSpocs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create SPOC");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSpoc) return;
    if (!formData.name.trim() || !formData.mobile_number.trim()) {
      toast.error("Name and mobile number are required");
      return;
    }

    try {
      setIsSaving(true);
      await spocService.updateSpoc(editingSpoc.id, formData);
      toast.success("SPOC updated successfully");
      setIsEditDialogOpen(false);
      setEditingSpoc(null);
      resetForm();
      loadSpocs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update SPOC");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      setIsDeleting(true);
      await spocService.deleteSpoc(id);
      toast.success("SPOC deleted successfully");
      loadSpocs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete SPOC");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (spoc: Spoc) => {
    try {
      await spocService.toggleSpocStatus(spoc.id, !spoc.is_active);
      toast.success(`SPOC ${!spoc.is_active ? "activated" : "deactivated"}`);
      loadSpocs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update status");
    }
  };

  if (user?.role !== "super_admin") return null;

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002147]">
            SPOC Dashboard
          </h1>
          <p className="text-muted-foreground">
            Create and manage Single Points of Contact for placement drives
          </p>
        </div>
        <Button onClick={handleAdd} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create SPOC
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total SPOCs
              </p>
              <p className="text-2xl font-bold text-[#002147]">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 p-3">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active
              </p>
              <p className="text-2xl font-bold text-green-600">
                {stats.active}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-red-100 p-3">
              <UserX className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Inactive
              </p>
              <p className="text-2xl font-bold text-red-500">
                {stats.inactive}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SPOC Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All SPOCs</CardTitle>
              <CardDescription>
                View and manage all points of contact
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredSpocs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              {searchQuery
                ? "No SPOCs match your search."
                : "No SPOCs found. Create your first SPOC to get started."}
            </div>
          ) : (
            <div className="rounded-md border">
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
                  {filteredSpocs.map((spoc) => (
                    <TableRow key={spoc.id}>
                      <TableCell className="font-medium">{spoc.name}</TableCell>
                      <TableCell>{spoc.designation || "—"}</TableCell>
                      <TableCell>{spoc.mobile_number}</TableCell>
                      <TableCell>{spoc.email || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={spoc.is_active}
                            onCheckedChange={() => handleToggleStatus(spoc)}
                          />
                          <Badge
                            variant={spoc.is_active ? "default" : "secondary"}
                          >
                            {spoc.is_active ? "Active" : "Inactive"}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add SPOC Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New SPOC</DialogTitle>
            <DialogDescription>
              Enter contact details for the new Single Point of Contact
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) =>
                  setFormData({ ...formData, designation: e.target.value })
                }
                placeholder="e.g. Placement Officer"
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number *</Label>
              <Input
                value={formData.mobile_number}
                onChange={(e) =>
                  setFormData({ ...formData, mobile_number: e.target.value })
                }
                placeholder="+91..."
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create SPOC"
              )}
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) =>
                  setFormData({ ...formData, designation: e.target.value })
                }
                placeholder="e.g. Placement Officer"
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number *</Label>
              <Input
                value={formData.mobile_number}
                onChange={(e) =>
                  setFormData({ ...formData, mobile_number: e.target.value })
                }
                placeholder="+91..."
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update SPOC"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
