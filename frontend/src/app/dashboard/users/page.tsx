"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  userManagementService,
  ManagedUser,
  PermissionKey,
  Department,
} from "@/services/user-management.service";
import { spocService, Spoc, CreateSpocInput } from "@/services/spoc.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  MoreHorizontal,
  Trash2,
  Edit,
  Shield,
  Loader2,
  Search,
  Plus,
  Pencil,
  Contact,
} from "lucide-react";

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<PermissionKey[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "admin" as "admin" | "coordinator",
    department_code: "",
    permissions: [] as string[],
  });
  const [creating, setCreating] = useState(false);

  // Edit permissions dialog state
  const [editPermsOpen, setEditPermsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // SPOC state
  const [spocs, setSpocs] = useState<Spoc[]>([]);
  const [spocsLoading, setSpocsLoading] = useState(true);
  const [spocSearch, setSpocSearch] = useState("");
  const [spocDialogOpen, setSpocDialogOpen] = useState(false);
  const [spocEditDialogOpen, setSpocEditDialogOpen] = useState(false);
  const [editingSpoc, setEditingSpoc] = useState<Spoc | null>(null);
  const [spocSaving, setSpocSaving] = useState(false);
  const [spocForm, setSpocForm] = useState<CreateSpocInput>({
    name: "",
    designation: "",
    mobile_number: "",
    email: "",
  });
  const [spocDeleteOpen, setSpocDeleteOpen] = useState(false);
  const [deletingSpoc, setDeletingSpoc] = useState<Spoc | null>(null);
  const [spocDeleting, setSpocDeleting] = useState(false);

  // Redirect if not super_admin
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const fetchData = useCallback(
    async (isInitial = false) => {
      try {
        if (isInitial) setLoading(true);
        const [usersData, permsData, deptsData] = await Promise.all([
          userManagementService.listUsers(
            searchQuery,
            roleFilter === "all" ? "" : roleFilter,
          ),
          userManagementService.getAllPermissionKeys(),
          userManagementService.getDepartments(),
        ]);
        setUsers(usersData);
        setPermissionKeys(permsData);
        setDepartments(deptsData);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error("Failed to load user data");
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [searchQuery, roleFilter],
  );

  // Fetch SPOCs
  const fetchSpocs = useCallback(async () => {
    try {
      setSpocsLoading(true);
      const data = await spocService.getAllSpocs();
      setSpocs(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to load SPOCs");
    } finally {
      setSpocsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData(true);
    fetchSpocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only fetch if not loading (to avoid double fetch on mount)
      if (!loading) fetchData(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, roleFilter]);

  // Initial fetch handled by debounce effect
  // useEffect(() => {
  //   fetchData();
  // }, [fetchData]);

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password) {
      toast.error("Email and password are required");
      return;
    }
    if (createForm.role === "coordinator" && !createForm.department_code) {
      toast.error("Department is required for coordinators");
      return;
    }

    setCreating(true);
    try {
      await userManagementService.createUser({
        email: createForm.email,
        password: createForm.password,
        name: createForm.name || undefined,
        role: createForm.role,
        department_code:
          createForm.role === "coordinator"
            ? createForm.department_code
            : undefined,
        permissions: createForm.permissions,
      });
      toast.success("User created successfully");
      setCreateOpen(false);
      setCreateForm({
        email: "",
        password: "",
        name: "",
        role: "admin",
        department_code: "",
        permissions: [],
      });
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleEditPermissions = (u: ManagedUser) => {
    setEditingUser(u);
    setEditPerms(u.permissions || []);
    setEditPermsOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setSavingPerms(true);
    try {
      await userManagementService.updateUserPermissions(
        editingUser.id,
        editPerms,
      );
      toast.success("Permissions updated");
      setEditPermsOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to update permissions");
    } finally {
      setSavingPerms(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await userManagementService.deleteUser(deletingUser.id);
      toast.success("User deleted");
      setDeleteOpen(false);
      setDeletingUser(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const togglePermission = (
    key: string,
    list: string[],
    setter: (v: string[]) => void,
  ) => {
    if (list.includes(key)) {
      setter(list.filter((k) => k !== key));
    } else {
      setter([...list, key]);
    }
  };

  // SPOC handlers
  const filteredSpocs = useMemo(() => {
    if (!spocSearch.trim()) return spocs;
    const q = spocSearch.toLowerCase();
    return spocs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.mobile_number.includes(q),
    );
  }, [spocs, spocSearch]);

  const resetSpocForm = () => {
    setSpocForm({ name: "", designation: "", mobile_number: "", email: "" });
  };

  const handleCreateSpoc = async () => {
    if (!spocForm.name.trim() || !spocForm.mobile_number.trim()) {
      toast.error("Name and mobile number are required");
      return;
    }
    setSpocSaving(true);
    try {
      await spocService.createSpoc(spocForm);
      toast.success("SPOC created successfully");
      setSpocDialogOpen(false);
      resetSpocForm();
      fetchSpocs();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to create SPOC");
    } finally {
      setSpocSaving(false);
    }
  };

  const handleEditSpoc = (spoc: Spoc) => {
    setEditingSpoc(spoc);
    setSpocForm({
      name: spoc.name,
      designation: spoc.designation,
      mobile_number: spoc.mobile_number,
      email: spoc.email,
    });
    setSpocEditDialogOpen(true);
  };

  const handleUpdateSpoc = async () => {
    if (!editingSpoc) return;
    if (!spocForm.name.trim() || !spocForm.mobile_number.trim()) {
      toast.error("Name and mobile number are required");
      return;
    }
    setSpocSaving(true);
    try {
      await spocService.updateSpoc(editingSpoc.id, spocForm);
      toast.success("SPOC updated successfully");
      setSpocEditDialogOpen(false);
      setEditingSpoc(null);
      resetSpocForm();
      fetchSpocs();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to update SPOC");
    } finally {
      setSpocSaving(false);
    }
  };

  const handleDeleteSpoc = async () => {
    if (!deletingSpoc) return;
    setSpocDeleting(true);
    try {
      await spocService.deleteSpoc(deletingSpoc.id);
      toast.success("SPOC deleted");
      setSpocDeleteOpen(false);
      setDeletingSpoc(null);
      fetchSpocs();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete SPOC");
    } finally {
      setSpocDeleting(false);
    }
  };

  const handleToggleSpocStatus = async (spoc: Spoc) => {
    try {
      await spocService.toggleSpocStatus(spoc.id, !spoc.is_active);
      toast.success(`SPOC ${!spoc.is_active ? "activated" : "deactivated"}`);
      fetchSpocs();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage admin, coordinator, and SPOC accounts
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Admin &amp; Coordinators
          </TabsTrigger>
          <TabsTrigger value="spocs" className="gap-2">
            <Contact className="h-4 w-4" />
            SPOCs
          </TabsTrigger>
        </TabsList>

        {/* ─── Users Tab ─── */}
        <TabsContent value="users" className="space-y-6">
          {/* Add User Button */}
          <div className="flex justify-end">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new admin or coordinator to the dashboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="Full name"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      placeholder="user@kongu.edu"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password *</label>
                    <Input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          password: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role *</label>
                    <Select
                      value={createForm.role}
                      onValueChange={(v: "admin" | "coordinator") =>
                        setCreateForm({ ...createForm, role: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="coordinator">Coordinator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {createForm.role === "coordinator" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Department *
                      </label>
                      <Select
                        value={createForm.department_code}
                        onValueChange={(v) =>
                          setCreateForm({ ...createForm, department_code: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.code} value={d.code}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Permissions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {permissionKeys.map((pk) => (
                        <label
                          key={pk.key}
                          className="flex items-center gap-2 text-sm p-2 rounded border hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={createForm.permissions.includes(pk.key)}
                            onChange={() =>
                              togglePermission(
                                pk.key,
                                createForm.permissions,
                                (v) =>
                                  setCreateForm({
                                    ...createForm,
                                    permissions: v,
                                  }),
                              )
                            }
                            className="rounded"
                          />
                          <div>
                            <div className="font-medium">{pk.label}</div>
                            <div className="text-[10px] text-gray-400">
                              {pk.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search users..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="coordinator">Coordinator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 text-sm font-semibold text-gray-600">
                    User
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-600">
                    Role
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-600">
                    Department
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-600">
                    Permissions
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-600">
                    Last Login
                  </th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No admin or coordinator users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {u.name || "Unnamed"}
                          </div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.role === "admin"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {u.role === "admin" ? "Admin" : "Coordinator"}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {u.department_code || "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(u.permissions || []).length === 0 ? (
                            <span className="text-xs text-gray-400">None</span>
                          ) : (
                            (u.permissions || []).slice(0, 3).map((p) => (
                              <span
                                key={p}
                                className="inline-flex px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]"
                              >
                                {p.replace(/_/g, " ")}
                              </span>
                            ))
                          )}
                          {(u.permissions || []).length > 3 && (
                            <span className="text-[10px] text-gray-400">
                              +{u.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            u.is_blocked
                              ? "text-red-600"
                              : u.is_active
                                ? "text-green-600"
                                : "text-gray-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.is_blocked
                                ? "bg-red-500"
                                : u.is_active
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                            }`}
                          />
                          {u.is_blocked
                            ? "Blocked"
                            : u.is_active
                              ? "Active"
                              : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditPermissions(u)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Edit Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setDeletingUser(u);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Permissions Dialog */}
          <Dialog open={editPermsOpen} onOpenChange={setEditPermsOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Permissions</DialogTitle>
                <DialogDescription>
                  {editingUser?.name || editingUser?.email} —{" "}
                  {editingUser?.role}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                {permissionKeys.map((pk) => (
                  <label
                    key={pk.key}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={editPerms.includes(pk.key)}
                      onChange={() =>
                        togglePermission(pk.key, editPerms, setEditPerms)
                      }
                      className="rounded"
                    />
                    <div>
                      <div className="text-sm font-medium">{pk.label}</div>
                      <div className="text-xs text-gray-400">
                        {pk.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSavePermissions} disabled={savingPerms}>
                  {savingPerms && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Permissions
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete{" "}
                  <strong>{deletingUser?.name || deletingUser?.email}</strong>?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── SPOCs Tab ─── */}
        <TabsContent value="spocs" className="space-y-6">
          {/* SPOC Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{spocs.length} total</span>
              <span className="text-green-600">
                {spocs.filter((s) => s.is_active).length} active
              </span>
              <span className="text-gray-400">
                {spocs.filter((s) => !s.is_active).length} inactive
              </span>
            </div>
            <Button
              className="gap-2"
              onClick={() => {
                resetSpocForm();
                setSpocDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add SPOC
            </Button>
          </div>

          {/* SPOC Search */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search SPOCs..."
                className="pl-9"
                value={spocSearch}
                onChange={(e) => setSpocSearch(e.target.value)}
              />
            </div>
          </div>

          {/* SPOC Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            {spocsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">
                      Designation
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">
                      Mobile
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">
                      Email
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">
                        {spocSearch
                          ? "No SPOCs match your search."
                          : "No SPOCs found. Create your first SPOC to get started."}
                      </td>
                    </tr>
                  ) : (
                    filteredSpocs.map((spoc) => (
                      <tr
                        key={spoc.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-4 font-medium text-gray-900">
                          {spoc.name}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {spoc.designation || "—"}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {spoc.mobile_number}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {spoc.email || "—"}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={spoc.is_active}
                              onCheckedChange={() =>
                                handleToggleSpocStatus(spoc)
                              }
                            />
                            <Badge
                              variant={spoc.is_active ? "default" : "secondary"}
                            >
                              {spoc.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditSpoc(spoc)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit SPOC
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setDeletingSpoc(spoc);
                                  setSpocDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete SPOC
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Create SPOC Dialog */}
          <Dialog open={spocDialogOpen} onOpenChange={setSpocDialogOpen}>
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
                    value={spocForm.name}
                    onChange={(e) =>
                      setSpocForm({ ...spocForm, name: e.target.value })
                    }
                    placeholder="Full Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input
                    value={spocForm.designation}
                    onChange={(e) =>
                      setSpocForm({ ...spocForm, designation: e.target.value })
                    }
                    placeholder="e.g. Placement Officer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number *</Label>
                  <Input
                    value={spocForm.mobile_number}
                    onChange={(e) =>
                      setSpocForm({
                        ...spocForm,
                        mobile_number: e.target.value,
                      })
                    }
                    placeholder="+91..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={spocForm.email}
                    onChange={(e) =>
                      setSpocForm({ ...spocForm, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSpocDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateSpoc} disabled={spocSaving}>
                  {spocSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create SPOC
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit SPOC Dialog */}
          <Dialog
            open={spocEditDialogOpen}
            onOpenChange={setSpocEditDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit SPOC</DialogTitle>
                <DialogDescription>Update contact details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={spocForm.name}
                    onChange={(e) =>
                      setSpocForm({ ...spocForm, name: e.target.value })
                    }
                    placeholder="Full Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input
                    value={spocForm.designation}
                    onChange={(e) =>
                      setSpocForm({ ...spocForm, designation: e.target.value })
                    }
                    placeholder="e.g. Placement Officer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number *</Label>
                  <Input
                    value={spocForm.mobile_number}
                    onChange={(e) =>
                      setSpocForm({
                        ...spocForm,
                        mobile_number: e.target.value,
                      })
                    }
                    placeholder="+91..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={spocForm.email}
                    onChange={(e) =>
                      setSpocForm({ ...spocForm, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSpocEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateSpoc} disabled={spocSaving}>
                  {spocSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Update SPOC
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete SPOC Dialog */}
          <Dialog open={spocDeleteOpen} onOpenChange={setSpocDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete SPOC</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete{" "}
                  <strong>{deletingSpoc?.name}</strong>? This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSpoc}
                  disabled={spocDeleting}
                >
                  {spocDeleting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
