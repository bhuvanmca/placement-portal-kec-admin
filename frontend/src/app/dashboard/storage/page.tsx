'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Download,
  Trash2,
  RefreshCw,
  File,
  FileText,
  Image,
  FileArchive,
  HardDrive,
  Database,
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { storageService, GarageObject, GarageStats, SystemStorageInfo } from '@/services/storage.service';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { ChatService, ChatGroup } from '@/services/chat.service';

export default function StorageConsolePage() {
  const { user } = useAuth();

  // State
  const [objects, setObjects] = useState<GarageObject[]>([]);
  const [stats, setStats] = useState<GarageStats | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemStorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [objectToDelete, setObjectToDelete] = useState<string | null>(null);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [activeTab, setActiveTab] = useState<'storage' | 'chat'>('storage');
  const [chatGroupIds, setChatGroupIds] = useState<number[]>([]);

  // Derived bucket name for API calls
  const bucketParam = activeTab === 'chat' ? 'chat' : undefined;

  // Fetch user's chat groups
  const fetchChatGroups = useCallback(async () => {
    if (!user?.id) return;
    try {
      const groups = await ChatService.getGroups(user.id);
      if (Array.isArray(groups)) {
        setChatGroupIds(groups.map((g: ChatGroup) => g.id));
      }
    } catch {
      // silently fail — user may not have chat groups
    }
  }, [user?.id]);

  // Fetch objects and system info
  const fetchObjects = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'chat') {
        if (chatGroupIds.length === 0) {
          setObjects([]);
          setStats(null);
          setLoading(false);
          return;
        }
        const chatRes = await storageService.listChatObjects(chatGroupIds);
        setObjects(chatRes.objects || []);
        setStats(chatRes.stats);
      } else {
        const [objectsRes, systemRes] = await Promise.all([
          storageService.listObjects(),
          storageService.getSystemStorageInfo()
        ]);
        setObjects(objectsRes.objects || []);
        setStats(objectsRes.stats);
        setSystemInfo(systemRes);
      }
    } catch (error: any) {
      if (!error?.handled) {
        toast.error('Failed to load storage data');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, chatGroupIds]);

  // Initial load — fetch chat groups
  useEffect(() => {
    fetchChatGroups();
  }, [fetchChatGroups]);

  // Load objects when tab or groups change
  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  // Reset selection and page on tab change
  useEffect(() => {
    setSelectedObjects([]);
    setLastSelectedIndex(null);
    setCurrentPage(1);
    setSearchTerm('');
  }, [activeTab]);

  // Filter objects by search term
  const filteredObjects = objects.filter(obj =>
    obj.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredObjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedObjects = filteredObjects.slice(startIndex, endIndex);

  // File type detection
  const getFileIcon = (key: string) => {
    const ext = key.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    } else if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
      return <FileArchive className="h-4 w-4 text-yellow-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  // Selection handlers
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedObjects(filteredObjects.map(o => o.key));
    } else {
      setSelectedObjects([]);
    }
  };

  const toggleSelect = (key: string) => {
    setSelectedObjects(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Shift+click range selection
  const handleRowClick = (obj: GarageObject, index: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeKeys = filteredObjects.slice(start, end + 1).map(o => o.key);

      // Determine if we should select or deselect based on anchor row
      const anchorKey = filteredObjects[lastSelectedIndex].key;
      const shouldSelect = selectedObjects.includes(anchorKey);

      setSelectedObjects(prev => {
        const currentSet = new Set(prev);
        if (shouldSelect) {
          rangeKeys.forEach(key => currentSet.add(key));
        } else {
          rangeKeys.forEach(key => currentSet.delete(key));
        }
        return Array.from(currentSet);
      });
    } else {
      // Toggle selection
      toggleSelect(obj.key);
      setLastSelectedIndex(index);
    }
  };

  // Delete handlers
  const handleDeleteSingle = (key: string) => {
    setObjectToDelete(key);
    setIsBulkDeleteMode(false);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedObjects.length === 0) {
      toast.warning('Please select at least one file to delete');
      return;
    }
    setIsBulkDeleteMode(true);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (isBulkDeleteMode) {
        const result = await storageService.bulkDeleteObjects(selectedObjects, bucketParam);
        if (result.success) {
          toast.success(`Deleted ${result.deleted_count} file(s) successfully`);
        } else {
          toast.warning(`Deleted ${result.deleted_count} files, ${result.failed_count} failed`);
        }
        setSelectedObjects([]);
        setLastSelectedIndex(null);
      } else if (objectToDelete) {
        await storageService.deleteObject(objectToDelete, bucketParam);
        toast.success('File deleted successfully');
      }
      fetchObjects();
    } catch (error: any) {
      if (!error?.handled) {
        toast.error('Failed to delete file(s)');
      }
    } finally {
      setIsDeleteDialogOpen(false);
      setObjectToDelete(null);
      setIsBulkDeleteMode(false);
    }
  };

  // Download handler
  const handleDownload = async (key: string) => {
    try {
      await storageService.triggerDownload(key, bucketParam);
      toast.success('Download started');
    } catch (error: any) {
      if (!error?.handled) {
        toast.error('Failed to download file');
      }
    }
  };

  // Preview handler (Fixed: Fetch as Blob to avoid internal DNS issues)
  const handlePreview = async (key: string) => {
    try {
      toast.loading("Opening preview...", { id: "preview-toast" }); 
      
      const blob = await storageService.downloadObject(key, bucketParam);
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab
      window.open(url, '_blank');
      
      toast.dismiss("preview-toast");

      // Revoke after 1 minute to clear memory
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      
    } catch (error: any) {
      toast.dismiss("preview-toast");
      if (!error?.handled) {
        toast.error('Failed to open preview');
      }
    }
  };

  // Download selected files as structured ZIP
  const handleDownloadSelected = async () => {
    if (selectedObjects.length === 0) {
      toast.warning('Please select at least one file to download');
      return;
    }

    try {
      toast.info('Preparing download...');
      const response = await api.post('/v1/admin/storage/download-zip', {
        keys: selectedObjects
      }, {
        responseType: 'blob'
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `storage_export_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded ${selectedObjects.length} file(s) in ZIP`);
    } catch (error: any) {
      if (!error?.handled) {
        toast.error('Failed to download files');
      }
    }
  };

  // Archive download by year
  const handleArchiveDownload = async (year: string) => {
    try {
      toast.info('Preparing archive...');
      const response = await api.post('/v1/admin/storage/download-archive', {
        year: parseInt(year)
      }, {
        responseType: 'blob'
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive_${year}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Archive for ${year} downloaded successfully`);
    } catch (error: any) {
      if (!error?.handled) {
        toast.error('Failed to download archive');
      }
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#002147]">Storage Console</h2>
          <p className="text-muted-foreground">
            Manage files in Garage object storage bucket
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Archive Download Dropdown — only for main storage */}
          {activeTab === 'storage' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Archive className="mr-2 h-4 w-4" />
                  Download Archive
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Select Year</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleArchiveDownload('2024')}>
                  2024
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleArchiveDownload('2023')}>
                  2023
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleArchiveDownload('2022')}>
                  2022
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="outline" onClick={fetchObjects} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          {selectedObjects.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedObjects.length})
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'storage' | 'chat')} className="w-auto">
        <TabsList>
          <TabsTrigger value="storage" className="gap-1.5">
            <HardDrive className="h-4 w-4" />
            All Files
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Chat Attachments
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats Cards */}
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Server Root Disk */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Disk (Root)</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {systemInfo ? (
                 <>
                    <div className="text-2xl font-bold">{systemInfo.used_percent.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Use: {systemInfo.used_gb.toFixed(1)}GB / {systemInfo.total_capacity_gb}GB
                    </div>
                     <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div 
                            className={cn("h-1.5 rounded-full", systemInfo.is_low_storage ? "bg-red-500" : "bg-green-500")} 
                            style={{ width: `${Math.min(systemInfo.used_percent, 100)}%` }}
                        ></div>
                    </div>
                 </>
             ) : (
                 <div className="animate-pulse h-10 w-20 bg-gray-100 rounded"></div>
             )}
          </CardContent>
        </Card>

        {/* Docker Volumes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Docker Volumes</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {systemInfo ? (
               systemInfo.docker_error ? (
                  <div className="text-xs text-red-500 break-words">{systemInfo.docker_error}</div>
               ) : (
                <div className="space-y-1">
                    <div className="text-2xl font-bold">{systemInfo.docker_volumes?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Active Volumes</p>
                </div>
               )
             ) : (
                <div className="animate-pulse h-10 w-20 bg-gray-100 rounded"></div>
             )}
          </CardContent>
        </Card>

        {/* Garage Object Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Object Storage</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats ? (
             <>
              <div className="text-2xl font-bold">{stats.total_objects}</div>
              <p className="text-xs text-muted-foreground">
                Files in {stats.bucket_name}
              </p>
             </>
            ) : <div className="animate-pulse h-10 w-20 bg-gray-100 rounded"></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Size</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
           {stats ? (
            <>
              <div className="text-2xl font-bold">{stats.total_size_human_readable}</div>
              <p className="text-xs text-muted-foreground">
                Total size used
              </p>
             </>
            ) : <div className="animate-pulse h-10 w-20 bg-gray-100 rounded"></div>}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              {isBulkDeleteMode
                ? `Are you sure you want to delete ${selectedObjects.length} file(s)? This action cannot be undone.`
                : "Are you sure you want to delete this file? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search files by name..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Files Table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={filteredObjects.length > 0 && selectedObjects.length === filteredObjects.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-8 text-center text-gray-500">
                      Loading files...
                    </TableCell>
                  </TableRow>
                ) : filteredObjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-8 text-center text-gray-500">
                      {searchTerm ? 'No files found matching your search' : 'No files in storage'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedObjects.map((obj, index) => (
                    <ContextMenu key={obj.key}>
                      <ContextMenuTrigger asChild>
                        <TableRow
                          className={cn(
                            "transition-colors cursor-pointer group select-none",
                            selectedObjects.includes(obj.key) && "bg-blue-50"
                          )}
                          onClick={(e) => handleRowClick(obj, index, e)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedObjects.includes(obj.key)}
                              onCheckedChange={() => toggleSelect(obj.key)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getFileIcon(obj.key)}
                              <span className="font-medium text-gray-900 truncate max-w-md" title={obj.key}>
                                {obj.key}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{obj.size_human}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {formatDate(obj.last_modified)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(obj.key)}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSingle(obj.key)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <DropdownMenuLabel>
                          Actions ({selectedObjects.includes(obj.key) ? selectedObjects.length : 1} Selected)
                        </DropdownMenuLabel>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => handleDownload(obj.key)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </ContextMenuItem>
                        <ContextMenuItem onClick={handleDownloadSelected}>
                          <Archive className="mr-2 h-4 w-4" />
                          {selectedObjects.includes(obj.key) && selectedObjects.length > 1
                            ? `Download ${selectedObjects.length} Selected (ZIP)`
                            : 'Download as ZIP'}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            if (selectedObjects.includes(obj.key) && selectedObjects.length > 1) {
                              handleBulkDelete();
                            } else {
                              handleDeleteSingle(obj.key);
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {selectedObjects.includes(obj.key) && selectedObjects.length > 1
                            ? `Delete ${selectedObjects.length} Files`
                            : 'Delete File'}
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredObjects.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredObjects.length)}</span> of{' '}
                  <span className="font-medium">{filteredObjects.length}</span> results
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
