"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  Edit,
  FileText,
  Settings,
  X,
  User as UserIcon,
  Columns as ColumnsIcon,
  Check,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDateTime } from "@/lib/utils";
import { BulkUploadDialog } from "@/components/student/bulk-upload-dialog";
import {
  studentService,
  Student,
  StudentParams,
} from "@/services/student.service";
import { toast } from "sonner";

import { AddStudentDialog } from "@/components/student/add-student-dialog";
import { configService, Department, Batch } from "@/services/config.service";

export default function StudentsPage() {
  const router = useRouter();

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Config State
  const [deptOptions, setDeptOptions] = useState<Department[]>([]);
  const [batchOptions, setBatchOptions] = useState<Batch[]>([]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Initialize page size from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("studentPageSize");
      if (saved) setPageSize(parseInt(saved));
    }
  }, []);

  // Save page size to local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("studentPageSize", pageSize.toString());
    }
  }, [pageSize]);

  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );

  // Filter State
  const [searchType, setSearchType] = useState("name"); // 'name', 'regNo', 'phone'
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBatch, setFilterBatch] = useState("All");
  const [filterDept, setFilterDept] = useState("All");

  // Initialization state to prevent overwriting localStorage on mount
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedBatch = localStorage.getItem("studentFilterBatch");
      if (savedBatch) setFilterBatch(savedBatch);

      const savedDept = localStorage.getItem("studentFilterDept");
      if (savedDept) setFilterDept(savedDept);

      setIsInitialized(true);
    }
  }, []);

  // Save filters when changed, only after initialization
  useEffect(() => {
    if (typeof window !== "undefined" && isInitialized) {
      localStorage.setItem("studentFilterBatch", filterBatch);
      localStorage.setItem("studentFilterDept", filterDept);
    }
  }, [filterBatch, filterDept, isInitialized]);

  // Sorting State
  const [sortBy, setSortBy] = useState("register_number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Load column preferences from localStorage
  const [visibleColumns, setVisibleColumns] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("studentColumns");
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return {
      profile: true,
      email: true,
      regNo: true,
      dept: true,
      batch: true,
      gender: false, // NEW
      phone: true,
      ugCgpa: true,
      pgCgpa: true,
      ugInst: false,
      pgInst: false,
      backlogs: false, // Removed in favor of atomic
      currentBacklogs: true,
      historyBacklogs: true,
      resume: true,
      aadhar: false,
      pan: false,
      tenth: false, // Removed
      tenthMark: false,
      tenthBoard: false,
      tenthYear: false,
      twelfth: false, // Removed
      twelfthMark: false,
      twelfthBoard: false,
      twelfthYear: false,
      diploma: false,
      ugYear: false,
      dob: true,
      address: false,
      // actions: true // Removed
    };
  });

  // Save column preferences to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("studentColumns", JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  // Fetch Config Data
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [d, b] = await Promise.all([
          configService.getAllDepartments(),
          configService.getAllBatches(),
        ]);
        setDeptOptions(d || []);
        setBatchOptions(b || []);
      } catch (e) {
        toast.error("Failed to load filter options");
      }
    };
    fetchConfig();
  }, []);

  // Fetch Students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params: StudentParams = {
        dept: filterDept === "All" ? undefined : filterDept,
        batch: filterBatch !== "All" ? parseInt(filterBatch) : undefined,
        search: searchTerm,
        searchType: searchType,
        page: page,
        limit: pageSize,
        sortBy: sortBy,
        sortOrder: sortOrder,
      };
      const response = await studentService.getAllStudents(params);
      setStudents(response.data || []);
      setTotalRecords(response.meta.total);
    } catch (error) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  // Handle sort column click (client-side)
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Helper for sortable column headers
  const SortableHeader = ({
    column,
    label,
  }: {
    column: string;
    label: string;
  }) => (
    <th
      className="py-3 px-4 bg-[#f8fafc] cursor-pointer select-none hover:bg-gray-200 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortBy === column &&
          (sortOrder === "asc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          ))}
      </div>
    </th>
  );

  // Initial Fetch & Filter Change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 500);
    return () => clearTimeout(timer);
  }, [filterDept, filterBatch, page, pageSize, sortBy, sortOrder]);

  // Dialog States
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null); // ID of student to delete (single)
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);

  // Handlers
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(students.map((s) => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleDelete = (id: number) => {
    setStudentToDelete(id);
    setIsBulkDeleteMode(false);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedStudents.length === 0) return;
    setIsBulkDeleteMode(true);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (isBulkDeleteMode) {
        await studentService.bulkDeleteStudents(selectedStudents);
        toast.success(`${selectedStudents.length} students deleted`);
        setSelectedStudents([]);
        setLastSelectedIndex(null);
      } else if (studentToDelete) {
        await studentService.deleteStudent(studentToDelete);
        toast.success("Student deleted");
      }
      fetchStudents();
    } catch (e) {
      toast.error("Failed to delete");
    } finally {
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
      setIsBulkDeleteMode(false);
    }
  };

  const handleBulkUploadSuccess = () => {
    toast.success("Bulk upload processed successfully");
    setIsBulkUploadOpen(false);
    fetchStudents();
  };

  const handleBlockToggle = async (id: number, currentStatus: boolean) => {
    try {
      await studentService.toggleBlockStatus(id, !currentStatus);
      toast.success(currentStatus ? "Student unblocked" : "Student blocked");
      fetchStudents();
    } catch (e) {
      toast.error("Failed to update block status");
    }
  };

  const handleRowClick = (
    student: Student,
    index: number,
    e: React.MouseEvent,
  ) => {
    // Shift+Click Range Selection
    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeStudents = students.slice(start, end + 1);
      const rangeIds = rangeStudents.map((s) => s.id);

      // Determine target state based on the anchor row (lastSelectedIndex)
      // If the anchor row is selected, we want to SELECT the range.
      // If the anchor row is NOT selected, we want to UNSELECT the range.
      const anchorId = students[lastSelectedIndex].id;
      const shouldSelect = selectedStudents.includes(anchorId);

      setSelectedStudents((prev) => {
        const currentSet = new Set(prev);
        if (shouldSelect) {
          rangeIds.forEach((id) => currentSet.add(id));
        } else {
          rangeIds.forEach((id) => currentSet.delete(id));
        }
        return Array.from(currentSet);
      });
    } else {
      // Toggle selection
      toggleSelect(student.id);
      setLastSelectedIndex(index);
    }
  };

  const handleViewResume = async (studentId: number, url?: string) => {
    if (!url) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const proxyUrl = `/api/proxy/storage?studentId=${studentId}&type=resume`;
      const response = await fetch(proxyUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        toast.error("Could not access resume");
        return;
      }

      const contentType = response.headers.get('Content-Type') || 'application/pdf';
      const blob = await response.blob();
      const typedBlob = new Blob([blob], { type: contentType });
      const blobUrl = URL.createObjectURL(typedBlob);
      window.open(blobUrl, "_blank");
    } catch (error) {
      toast.error("Failed to access document");
    }
  };

  const handleExport = (student?: Student) => {
    // 1. Determine data to export
    let dataToExport: Student[] = [];
    if (student) {
      // Context menu action
      if (selectedStudents.includes(student.id)) {
        dataToExport = students.filter((s) => selectedStudents.includes(s.id));
      } else {
        dataToExport = [student];
      }
    } else {
      // Fallback for toolbar or other triggers (though toolbar button is being removed)
      dataToExport = students.filter((s) => selectedStudents.includes(s.id));
    }

    // 2. Validation
    if (dataToExport.length === 0) {
      toast.warning("Please select at least one student record to export");
      return;
    }

    // 3. Define Headers based on visible columns
    const columnMap: {
      key: keyof typeof visibleColumns;
      header: string;
      getValue: (s: Student) => any;
    }[] = [
      { key: "profile", header: "Student Name", getValue: (s) => s.full_name },
      { key: "email", header: "Email", getValue: (s) => s.email },
      {
        key: "regNo",
        header: "Register No",
        getValue: (s) => s.register_number,
      },
      { key: "dept", header: "Department", getValue: (s) => s.department },
      { key: "batch", header: "Batch", getValue: (s) => s.batch_year },
      { key: "gender", header: "Gender", getValue: (s) => s.gender || "N/A" },
      {
        key: "phone",
        header: "Phone No",
        getValue: (s) => s.mobile_number || "N/A",
      },
      { key: "ugCgpa", header: "UG CGPA", getValue: (s) => s.ug_cgpa || 0 },
      { key: "pgCgpa", header: "PG CGPA", getValue: (s) => s.pg_cgpa || 0 },
      {
        key: "ugInst",
        header: "UG Institution",
        getValue: (s) => s.ug_institution || "N/A",
      },
      {
        key: "pgInst",
        header: "PG Institution",
        getValue: (s) => s.pg_institution || "N/A",
      },
      {
        key: "backlogs",
        header: "Current Backlogs",
        getValue: (s) => s.current_backlogs || 0,
      },
      {
        key: "backlogs",
        header: "History Backlogs",
        getValue: (s) => s.history_of_backlogs || 0,
      },
      {
        key: "resume",
        header: "Resume URL",
        getValue: (s) => s.resume_url || "N/A",
      },
      {
        key: "aadhar",
        header: "Aadhar Number",
        getValue: (s) => s.aadhar_number || "N/A",
      },
      {
        key: "pan",
        header: "PAN Number",
        getValue: (s) => s.pan_number || "N/A",
      },
      {
        key: "tenthMark",
        header: "10th %",
        getValue: (s) => s.tenth_mark || 0,
      },
      {
        key: "tenthBoard",
        header: "10th Board",
        getValue: (s) => s.tenth_board || "N/A",
      },
      {
        key: "tenthYear",
        header: "10th Year",
        getValue: (s) => s.tenth_year_pass || 0,
      },
      {
        key: "twelfthMark",
        header: "12th %",
        getValue: (s) => s.twelfth_mark || 0,
      },
      {
        key: "twelfthBoard",
        header: "12th Board",
        getValue: (s) => s.twelfth_board || "N/A",
      },
      {
        key: "twelfthYear",
        header: "12th Year",
        getValue: (s) => s.twelfth_year_pass || 0,
      },
      {
        key: "ugYear",
        header: "UG Year of Completion",
        getValue: (s) => s.ug_year_pass || 0,
      },
      {
        key: "dob",
        header: "Date of Birth",
        getValue: (s) => (s.dob ? new Date(s.dob).toLocaleDateString() : "N/A"),
      },
      {
        key: "address",
        header: "Address",
        getValue: (s) =>
          [s.address_line_1, s.address_line_2, s.state]
            .filter(Boolean)
            .join(", "),
      },
    ];

    // Filter to only visible columns
    const visibleColumnMap = columnMap.filter((col) => visibleColumns[col.key]);

    const headers = visibleColumnMap.map((col) => col.header);
    const csvRows = [headers.join(",")];

    dataToExport.forEach((s) => {
      const row = visibleColumnMap.map((col) => {
        const value = col.getValue(s);
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(","));
    });

    // 4. Download
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_export_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${dataToExport.length} records successfully`);
  };

  // Render
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-8 pt-6">
      <AddStudentDialog
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onSuccess={() => {
          fetchStudents();
          setIsAddStudentOpen(false);
        }}
      />

      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={handleBulkUploadSuccess}
      />

      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#002147]">
            Students
          </h2>
          <p className="text-muted-foreground">
            Manage student records with full data visibility.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => setIsAddStudentOpen(true)}
            className="bg-[#002147]"
          >
            <UserIcon className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              {isBulkDeleteMode
                ? `Are you sure you want to delete ${selectedStudents.length} students? This action cannot be undone.`
                : "Are you sure you want to delete this student? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 p-4 bg-white border rounded-lg shadow-sm">
          {/* Search By Dropdown */}
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger className="w-[130px] bg-slate-50 border-slate-200">
              <SelectValue placeholder="Search By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="regNo">Reg No</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search by ${searchType === "name" ? "Name" : searchType === "regNo" ? "Register No" : "Phone"}...`}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    fetchStudents();
                  }
                }}
              />
            </div>
            <Button
              onClick={() => {
                setPage(1);
                fetchStudents();
              }}
              className="bg-[#002147] hover:bg-[#003366]"
            >
              Search
            </Button>
          </div>

          <Select
            value={filterBatch}
            onValueChange={(val) => {
              setFilterBatch(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Batches</SelectItem>
              {batchOptions.map((b) => (
                <SelectItem key={b.id} value={b.year.toString()}>
                  {b.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterDept}
            onValueChange={(val) => {
              setFilterDept(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              <SelectItem value="All">All Depts</SelectItem>
              {deptOptions.map((dept) => (
                <SelectItem key={dept.id} value={dept.code}>
                  {dept.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Columns Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2">
                <ColumnsIcon className="mr-2 h-4 w-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[200px] max-h-[400px] overflow-y-auto"
            >
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.profile}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    profile: c,
                  }))
                }
              >
                Profile (Name & Photo)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.email}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    email: c,
                  }))
                }
              >
                Email
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.regNo}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    regNo: c,
                  }))
                }
              >
                Register No
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.dept}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    dept: c,
                  }))
                }
              >
                Department
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.batch}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    batch: c,
                  }))
                }
              >
                Batch
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.phone}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    phone: c,
                  }))
                }
              >
                Phone No
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.ugCgpa}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    ugCgpa: c,
                  }))
                }
              >
                UG CGPA
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.pgCgpa}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    pgCgpa: c,
                  }))
                }
              >
                PG CGPA
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.ugInst}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    ugInst: c,
                  }))
                }
              >
                UG Institution
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.pgInst}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    pgInst: c,
                  }))
                }
              >
                PG Institution
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.backlogs}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    backlogs: c,
                    currentBacklogs: c,
                    historyBacklogs: c,
                  }))
                }
              >
                Backlogs (Group)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.currentBacklogs}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    currentBacklogs: c,
                  }))
                }
              >
                Current Backlogs
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.historyBacklogs}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    historyBacklogs: c,
                  }))
                }
              >
                History Backlogs
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.resume}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    resume: c,
                  }))
                }
              >
                Resume
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.aadhar}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    aadhar: c,
                  }))
                }
              >
                Aadhar Number
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.pan}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    pan: c,
                  }))
                }
              >
                PAN Number
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.tenth}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    tenth: c,
                    tenthMark: c,
                    tenthBoard: c,
                    tenthYear: c,
                  }))
                }
              >
                10th Details (Group)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.tenthMark}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    tenthMark: c,
                  }))
                }
              >
                10th Mark
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.tenthBoard}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    tenthBoard: c,
                  }))
                }
              >
                10th Board
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.tenthYear}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    tenthYear: c,
                  }))
                }
              >
                10th Year
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.twelfth}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    twelfth: c,
                    twelfthMark: c,
                    twelfthBoard: c,
                    twelfthYear: c,
                  }))
                }
              >
                12th Details (Group)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.twelfthMark}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    twelfthMark: c,
                  }))
                }
              >
                12th Mark
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.twelfthBoard}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    twelfthBoard: c,
                  }))
                }
              >
                12th Board
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.twelfthYear}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    twelfthYear: c,
                  }))
                }
              >
                12th Year
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.ugYear}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    ugYear: c,
                  }))
                }
              >
                UG Year of Completion
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.dob}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    dob: c,
                  }))
                }
              >
                Date of Birth
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onSelect={(e) => e.preventDefault()}
                checked={visibleColumns.address}
                onCheckedChange={(c: boolean) =>
                  setVisibleColumns((prev: typeof visibleColumns) => ({
                    ...prev,
                    address: c,
                  }))
                }
              >
                Address
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
        </div>

        {/* Table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-[#002147] font-semibold border-b sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 w-[40px] bg-[#f8fafc]">
                    <Checkbox
                      checked={
                        students.length > 0 &&
                        selectedStudents.length === students.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  {visibleColumns.profile && (
                    <SortableHeader column="full_name" label="Student Name" />
                  )}
                  {visibleColumns.email && (
                    <SortableHeader column="email" label="Email" />
                  )}
                  {visibleColumns.regNo && (
                    <SortableHeader
                      column="register_number"
                      label="Register No"
                    />
                  )}
                  {visibleColumns.dept && (
                    <SortableHeader column="department" label="Dept" />
                  )}
                  {visibleColumns.batch && (
                    <SortableHeader column="batch_year" label="Batch" />
                  )}
                  {visibleColumns.phone && (
                    <SortableHeader column="mobile_number" label="Phone No" />
                  )}
                  {visibleColumns.ugCgpa && (
                    <SortableHeader column="ug_cgpa" label="UG CGPA" />
                  )}
                  {visibleColumns.pgCgpa && (
                    <SortableHeader column="pg_cgpa" label="PG CGPA" />
                  )}
                  {visibleColumns.ugInst && (
                    <th className="py-3 px-4 bg-[#f8fafc]">UG Institution</th>
                  )}
                  {visibleColumns.pgInst && (
                    <th className="py-3 px-4 bg-[#f8fafc]">PG Institution</th>
                  )}
                  {visibleColumns.currentBacklogs && (
                    <SortableHeader
                      column="current_backlogs"
                      label="Current Backlogs"
                    />
                  )}
                  {visibleColumns.historyBacklogs && (
                    <SortableHeader
                      column="history_of_backlogs"
                      label="History Backlogs"
                    />
                  )}

                  {visibleColumns.resume && (
                    <th className="py-3 px-4 bg-[#f8fafc]">Resume</th>
                  )}
                  {visibleColumns.aadhar && (
                    <th className="py-3 px-4 bg-[#f8fafc]">Aadhar No</th>
                  )}
                  {visibleColumns.pan && (
                    <th className="py-3 px-4 bg-[#f8fafc]">PAN No</th>
                  )}

                  {visibleColumns.tenthMark && (
                    <SortableHeader column="tenth_mark" label="10th %" />
                  )}
                  {visibleColumns.tenthBoard && (
                    <th className="py-3 px-4 bg-[#f8fafc]">10th Board</th>
                  )}
                  {visibleColumns.tenthYear && (
                    <th className="py-3 px-4 bg-[#f8fafc]">10th Year</th>
                  )}

                  {visibleColumns.twelfthMark && (
                    <SortableHeader column="twelfth_mark" label="12th %" />
                  )}
                  {visibleColumns.twelfthBoard && (
                    <th className="py-3 px-4 bg-[#f8fafc]">12th Board</th>
                  )}
                  {visibleColumns.twelfthYear && (
                    <th className="py-3 px-4 bg-[#f8fafc]">12th Year</th>
                  )}

                  {visibleColumns.ugYear && (
                    <th className="py-3 px-4 bg-[#f8fafc]">UG Year Pass</th>
                  )}
                  {visibleColumns.dob && (
                    <th className="py-3 px-4 bg-[#f8fafc]">Date of Birth</th>
                  )}
                  {visibleColumns.address && (
                    <th className="py-3 px-4 bg-[#f8fafc] max-w-[200px]">
                      Address
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={20} className="p-8 text-center text-gray-500">
                      Loading students...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="p-8 text-center text-gray-500">
                      No students found
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => (
                    <ContextMenu key={student.id}>
                      <ContextMenuTrigger asChild>
                        <tr
                          onClick={(e) => handleRowClick(student, index, e)}
                          className={cn(
                            "transition-colors cursor-pointer group select-none",
                            student.is_blocked
                              ? "bg-red-50/60 hover:bg-red-100/60"
                              : "hover:bg-blue-50/50",
                            selectedStudents.includes(student.id) &&
                              "bg-blue-50 hover:bg-blue-100/50",
                          )}
                        >
                          <td
                            className="py-3 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={() => toggleSelect(student.id)}
                            />
                          </td>

                          {visibleColumns.profile && (
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-gray-100">
                                  <AvatarImage
                                    src={student.profile_photo_url}
                                  />
                                  <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                                    {student.full_name
                                      ?.substring(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/dashboard/students/${student.register_number}`,
                                    );
                                  }}
                                  className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer underline-offset-2 hover:underline"
                                >
                                  {student.full_name}
                                </span>
                              </div>
                            </td>
                          )}

                          {visibleColumns.email && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.email}
                            </td>
                          )}

                          {visibleColumns.regNo && (
                            <td className="py-3 px-4 text-gray-900 font-medium uppercase">
                              {student.register_number}
                            </td>
                          )}

                          {visibleColumns.dept && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.department}
                            </td>
                          )}
                          {visibleColumns.batch && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.batch_year}
                            </td>
                          )}
                          {visibleColumns.phone && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.mobile_number || "-"}
                            </td>
                          )}

                          {visibleColumns.ugCgpa && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.ug_cgpa?.toFixed(2) || "0.00"}
                            </td>
                          )}
                          {visibleColumns.pgCgpa && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.pg_cgpa?.toFixed(2) || "0.00"}
                            </td>
                          )}

                          {visibleColumns.ugInst && (
                            <td
                              className="py-3 px-4 text-gray-900 max-w-[150px] truncate"
                              title={student.ug_institution}
                            >
                              {student.ug_institution || "-"}
                            </td>
                          )}
                          {visibleColumns.pgInst && (
                            <td
                              className="py-3 px-4 text-gray-900 max-w-[150px] truncate"
                              title={student.pg_institution}
                            >
                              {student.pg_institution || "-"}
                            </td>
                          )}

                          {visibleColumns.currentBacklogs && (
                            <td className="py-3 px-4 text-gray-900 text-center">
                              {student.current_backlogs || 0}
                            </td>
                          )}
                          {visibleColumns.historyBacklogs && (
                            <td className="py-3 px-4 text-gray-900 text-center">
                              {student.history_of_backlogs || 0}
                            </td>
                          )}

                          {visibleColumns.resume && (
                            <td
                              className="py-3 px-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {student.resume_url ? (
                                <Button
                                  variant="link"
                                  className="p-0 h-auto text-blue-600 hover:underline flex items-center gap-1"
                                  onClick={() =>
                                    handleViewResume(
                                      student.id,
                                      student.resume_url,
                                    )
                                  }
                                >
                                  <FileText className="h-3 w-3" /> View
                                </Button>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          )}

                          {visibleColumns.aadhar && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.aadhar_number || "-"}
                            </td>
                          )}
                          {visibleColumns.pan && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.pan_number || "-"}
                            </td>
                          )}

                          {visibleColumns.tenthMark && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.tenth_mark}%
                            </td>
                          )}
                          {visibleColumns.tenthBoard && (
                            <td className="py-3 px-4 text-gray-900 uppercase">
                              {student.tenth_board || "-"}
                            </td>
                          )}
                          {visibleColumns.tenthYear && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.tenth_year_pass || "-"}
                            </td>
                          )}

                          {visibleColumns.twelfthMark && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.twelfth_mark}%
                            </td>
                          )}
                          {visibleColumns.twelfthBoard && (
                            <td className="py-3 px-4 text-gray-900 uppercase">
                              {student.twelfth_board || "-"}
                            </td>
                          )}
                          {visibleColumns.twelfthYear && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.twelfth_year_pass || "-"}
                            </td>
                          )}

                          {visibleColumns.ugYear && (
                            <td className="py-3 px-4 text-gray-900">
                              {student.ug_year_pass || "-"}
                            </td>
                          )}
                          {visibleColumns.dob && (
                            <td className="py-3 px-4 text-gray-900">
                              {formatDateTime(student.dob).split(" ")[0]}
                            </td>
                          )}

                          {visibleColumns.address && (
                            <td
                              className="py-3 px-4 text-gray-900 max-w-[200px] truncate"
                              title={`${student.address_line_1 || ""}, ${student.address_line_2 || ""}`}
                            >
                              {[
                                student.address_line_1,
                                student.address_line_2,
                                student.state,
                              ]
                                .filter(Boolean)
                                .join(", ") || "-"}
                            </td>
                          )}
                        </tr>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <DropdownMenuLabel>
                          Actions (
                          {selectedStudents.includes(student.id)
                            ? selectedStudents.length
                            : 1}{" "}
                          Selected)
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <ContextMenuItem onClick={() => handleExport(student)}>
                          <FileText className="mr-2 h-4 w-4" />
                          {selectedStudents.includes(student.id) &&
                          selectedStudents.length > 1
                            ? `Export ${selectedStudents.length} Selected`
                            : "Export Student"}
                        </ContextMenuItem>
                        <ContextMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            // If multiple selected, delete all. If just this one (and not in selection), delete this one.
                            if (
                              selectedStudents.includes(student.id) &&
                              selectedStudents.length > 1
                            ) {
                              handleBulkDelete();
                            } else {
                              handleDelete(student.id);
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {selectedStudents.includes(student.id) &&
                          selectedStudents.length > 1
                            ? `Delete ${selectedStudents.length} Students`
                            : "Delete Student"}
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Showing {totalRecords === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, totalRecords)} of {totalRecords}{" "}
              entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= totalRecords || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
