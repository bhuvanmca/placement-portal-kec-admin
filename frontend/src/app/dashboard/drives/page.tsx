"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  MapPin,
  Calendar,
  MoreHorizontal,
  Plus,
  Clock,
  IndianRupee,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { driveService, Drive } from "@/services/drive.service";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { formatDateTime } from "@/lib/utils";

export default function DriveListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [totalDrives, setTotalDrives] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedDrives, setSelectedDrives] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDrives = async (page = currentPage, search = searchTerm) => {
    try {
      setLoading(true);
      const data = await driveService.getAdminDrives(page, pageSize, search);
      setDrives(data.drives || []);
      setTotalDrives(data.total || 0);
    } catch (error) {
      // console.error("Failed to fetch drives", error);
      toast.error("Failed to load drives");
    } finally {
      setLoading(false);
    }
  };

  const isInitialMount = useRef(true);

  // Initial load + pagination change
  useEffect(() => {
    fetchDrives(currentPage, searchTerm);
  }, [currentPage]);

  // Handle search with debounce (skip initial mount to avoid double fetch)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      if (currentPage === 1) {
        fetchDrives(1, searchTerm);
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleDelete = (id: number) => {
    setDriveToDelete(id);
  };

  const confirmSingleDelete = async () => {
    if (!driveToDelete) return;
    try {
      await driveService.deleteDrive(driveToDelete);
      toast.success("Drive deleted");
      setDriveToDelete(null);
      fetchDrives();
    } catch (error) {
      toast.error("Failed to delete drive");
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    // Deadline Logic: If opening, ensure deadline is in the future
    if (newStatus === "open") {
      const drive = drives.find((d) => d.id === id);
      if (drive && new Date(drive.deadline_date) < new Date()) {
        toast.error(
          "Deadline is crossed. Please update the due date to reopen.",
          {
            description:
              "You can update the deadline from the Edit Drive page.",
            duration: 5000,
            icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          },
        );
        return;
      }
    }

    try {
      await driveService.patchDrive(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchDrives();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDrives(1, searchTerm);
      setCurrentPage(1);
      toast.success("Drives refreshed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalPages = Math.ceil(totalDrives / pageSize);

  const toggleSelect = (id: number) => {
    setSelectedDrives((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedDrives.length === drives.length) {
      setSelectedDrives([]);
    } else {
      setSelectedDrives(drives.map((d) => d.id));
    }
  };

  // ... inside component ...
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [driveToDelete, setDriveToDelete] = useState<number | null>(null);

  // ... (fetchDrives, etc.)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-8 pt-6">
      {/* Dialog */}
      {/* Bulk Delete Dialog */}
      <DeleteConfirmationDialog
        isOpen={isBulkDeleteDialogOpen}
        onClose={() => setIsBulkDeleteDialogOpen(false)}
        onConfirm={async () => {
          await driveService.bulkDeleteDrives(selectedDrives);
          toast.success("Drives deleted successfully");
          setSelectedDrives([]);
          setIsBulkDeleteDialogOpen(false);
          fetchDrives();
        }}
        title="Delete Drives"
        description="This action cannot be undone. This will permanently delete the selected drives and all associated applicant data."
        itemCount={selectedDrives.length}
      />

      {/* Single Delete Dialog */}
      <DeleteConfirmationDialog
        isOpen={driveToDelete !== null}
        onClose={() => setDriveToDelete(null)}
        onConfirm={confirmSingleDelete}
        title="Delete Drive"
        description="Are you sure you want to delete this drive? This will permanently delete the drive and all associated applicant data."
        itemCount={1}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#002147]">
            Placement Drives
          </h2>
          <p className="text-muted-foreground">
            Manage ongoing and upcoming campus drives.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedDrives.length > 0 && user?.role !== "coordinator" && (
            <Button
              variant="destructive"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete (
              {selectedDrives.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh drive list"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          {user?.role !== "coordinator" && (
            <Link href="/dashboard/drives/create">
              <Button className="bg-[#002147] hover:bg-[#003366]">
                <Plus className="mr-2 h-4 w-4" /> Create New Drive
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* Filters */}
        <div className="flex items-center gap-2 p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center h-full px-2">
            <Checkbox
              checked={
                drives.length > 0 && selectedDrives.length === drives.length
              }
              onCheckedChange={toggleSelectAll}
            />
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search company or role..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Add more filters (Status, Date) here later */}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading drives...
            </div>
          ) : drives.length === 0 ? (
            <div className="p-12 text-center border rounded-lg bg-gray-50">
              <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">
                No Drives Found
              </h3>
              {user?.role !== "coordinator" && (
                <>
                  <p className="text-gray-500 mb-4">
                    Get started by posting a new placement drive.
                  </p>
                  <Link href="/dashboard/drives/create">
                    <Button variant="outline">Post Drive</Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            drives.map((drive: Drive) => (
              <div
                key={drive.id}
                onClick={() => toggleSelect(drive.id)}
                className={`group flex flex-col md:flex-row md:items-center justify-between p-6 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${selectedDrives.includes(drive.id) ? "border-[#002147] bg-blue-50/20" : ""}`}
              >
                <div className="flex items-start gap-4 mb-4 md:mb-0">
                  <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                    {user?.role !== "coordinator" && (
                      <Checkbox
                        checked={selectedDrives.includes(drive.id)}
                        onCheckedChange={() => toggleSelect(drive.id)}
                      />
                    )}
                  </div>
                  <Avatar className="h-12 w-12 rounded-lg">
                    <AvatarImage
                      src={drive.logo_url}
                      alt={drive.company_name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-[#002147]/10 text-[#002147] font-bold text-xl rounded-lg">
                      {drive.company_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-[#002147] group-hover:text-[#003366] transition-colors">
                        {drive.company_name}
                      </h3>
                      <Badge variant="secondary" className="font-normal">
                        {drive.drive_type}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        {drive.roles.length} Role
                        {drive.roles.length !== 1 ? "s" : ""}
                      </Badge>

                      {/* Status Action */}
                      <div onClick={(e) => e.stopPropagation()}>
                        {user?.role !== "coordinator" ? (
                          drive.status === "draft" ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">Draft</Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs px-2"
                                onClick={() =>
                                  handleStatusChange(drive.id, "open")
                                }
                              >
                                Post Drive
                              </Button>
                            </div>
                          ) : drive.status === "cancelled" ? (
                            <Badge variant="secondary">Cancelled</Badge>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge
                                  variant={
                                    drive.status === "open"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className={`cursor-pointer hover:opacity-80 ${drive.status === "open" ? "bg-green-600 hover:bg-green-700" : ""}`}
                                >
                                  {drive.status}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuLabel>
                                  Change Status
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {["open", "on_hold", "cancelled"].map((s) => (
                                  <DropdownMenuItem
                                    key={s}
                                    onClick={() =>
                                      handleStatusChange(drive.id, s)
                                    }
                                    className={
                                      drive.status === s ? "bg-accent" : ""
                                    }
                                  >
                                    {s
                                      .replace("_", " ")
                                      .charAt(0)
                                      .toUpperCase() +
                                      s.replace("_", " ").slice(1)}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )
                        ) : (
                          <Badge
                            variant={
                              drive.status === "open" ? "default" : "secondary"
                            }
                            className={
                              drive.status === "open" ? "bg-green-600" : ""
                            }
                          >
                            {drive.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="font-medium">
                      {drive.roles.length > 0
                        ? `${drive.roles[0].role_name}${drive.roles.length > 1 ? ` +${drive.roles.length - 1} more` : ""}`
                        : "No Roles Defined"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                      <div className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        <span>{drive.roles[0]?.ctc || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{drive.location || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          Deadline: {formatDateTime(drive.deadline_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Stats Placeholder */}
                  {user?.role !== "coordinator" && (
                    <div className="hidden md:flex flex-col items-end mr-4 text-sm">
                      <span className="font-medium text-gray-900">
                        {drive.applicant_count || 0} Applicants
                      </span>
                      <Link
                        href={`/dashboard/drives/${drive.id}/analytics`}
                        className="text-[#002147] hover:underline cursor-pointer font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Analytics
                      </Link>
                    </div>
                  )}

                  <div onClick={(e) => e.stopPropagation()}>
                    <Link href={`/dashboard/drives/${drive.id}`}>
                      <Button variant="outline">
                        {user?.role === "coordinator"
                          ? "View Results"
                          : "Manage"}
                      </Button>
                    </Link>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {user?.role !== "coordinator" && (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/dashboard/drives/${drive.id}/edit`)
                            }
                          >
                            Edit Details
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/drives/${drive.id}?tab=applicants`,
                            )
                          }
                        >
                          View Applicants
                        </DropdownMenuItem>
                        {user?.role !== "coordinator" && (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(drive.id)}
                          >
                            Delete Drive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t mt-4 bg-white/80 backdrop-blur-sm sticky bottom-0 rounded-b-lg shadow-sm">
            <div className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, totalDrives)}
              </span>{" "}
              of <span className="font-medium">{totalDrives}</span> drives
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setCurrentPage((p) => Math.max(1, p - 1));
                }}
                disabled={currentPage === 1}
                className="h-8 gap-1 pr-3"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        setCurrentPage(page);
                      }}
                      className={`h-8 w-8 p-0 ${currentPage === page ? "bg-[#002147] text-white hover:bg-[#003366]" : "text-gray-600"}`}
                    >
                      {page}
                    </Button>
                  ),
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                }}
                disabled={currentPage === totalPages}
                className="h-8 gap-1 pl-3"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
