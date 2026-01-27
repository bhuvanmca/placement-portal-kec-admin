'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Search, 
  MapPin, 
  Calendar, 
  MoreHorizontal, 
  Plus, 
  Clock, 
  IndianRupee,
  Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { driveService, Drive } from '@/services/drive.service';
import { toast } from 'sonner';

import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';

export default function DriveListPage() {
  const router = useRouter();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [selectedDrives, setSelectedDrives] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const data = await driveService.getAdminDrives();
      setDrives(data);
    } catch (error) {
      console.error("Failed to fetch drives", error);
      toast.error("Failed to load drives");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this drive?')) return;
    try {
      await driveService.deleteDrive(id);
      toast.success("Drive deleted");
      fetchDrives();
    } catch (error) {
      toast.error("Failed to delete drive");
    }
  };


  const toggleSelect = (id: number) => {
     setSelectedDrives(prev => 
        prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
     );
  };

  const toggleSelectAll = () => {
     if (selectedDrives.length === filteredDrives.length) {
        setSelectedDrives([]);
     } else {
        setSelectedDrives(filteredDrives.map(d => d.id));
     }
  };

  const filteredDrives = (drives || []).filter(drive => 
    drive.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drive.job_role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ... inside component ...
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // ... (fetchDrives, etc.)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-8 pt-6">
      {/* Dialog */}
      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={async () => {
          await driveService.bulkDeleteDrives(selectedDrives);
          toast.success("Drives deleted successfully");
          setSelectedDrives([]);
          fetchDrives();
        }}
        title="Delete Drives"
        description="This action cannot be undone. This will permanently delete the selected drives and all associated applicant data."
        itemCount={selectedDrives.length}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#002147]">Placement Drives</h2>
          <p className="text-muted-foreground">Manage ongoing and upcoming campus drives.</p>
        </div>
        <div className="flex gap-2">
           {selectedDrives.length > 0 && (
              <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                 <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedDrives.length})
              </Button>
           )}
           <Link href="/dashboard/drives/create">
             <Button className="bg-[#002147] hover:bg-[#003366]">
               <Plus className="mr-2 h-4 w-4" /> Create New Drive
             </Button>
           </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* Filters */}
        <div className="flex items-center gap-2 p-4 bg-white border rounded-lg shadow-sm">
           <div className="flex items-center h-full px-2">
              <Checkbox 
                 checked={filteredDrives.length > 0 && selectedDrives.length === filteredDrives.length}
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
             <div className="p-8 text-center text-gray-500">Loading drives...</div>
           ) : filteredDrives.length === 0 ? (
             <div className="p-12 text-center border rounded-lg bg-gray-50">
                <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No Drives Found</h3>
                <p className="text-gray-500 mb-4">Get started by posting a new placement drive.</p>
                <Link href="/dashboard/drives/create">
                  <Button variant="outline">Post Drive</Button>
                </Link>
             </div>
           ) : (
             filteredDrives.map((drive) => (
               <div key={drive.id} className={`group flex flex-col md:flex-row md:items-center justify-between p-6 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${selectedDrives.includes(drive.id) ? 'border-[#002147]' : ''}`}>
                  <div className="flex items-start gap-4 mb-4 md:mb-0">
                     <div className="mt-1">
                        <Checkbox 
                           checked={selectedDrives.includes(drive.id)}
                           onCheckedChange={() => toggleSelect(drive.id)}
                        />
                     </div>
                     <Avatar className="h-12 w-12 rounded-lg">
                        <AvatarImage src={drive.logo_url} alt={drive.company_name} className="object-cover" />
                        <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-xl rounded-lg">
                           {drive.company_name.charAt(0)}
                        </AvatarFallback>
                     </Avatar>
                     <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <h3 className="font-semibold text-lg text-[#002147] group-hover:text-blue-600 transition-colors">
                             {drive.company_name}
                           </h3>
                           <Badge variant="secondary" className="font-normal">{drive.drive_type}</Badge>
                           <Badge variant={drive.status === 'open' ? 'default' : 'secondary'} className={drive.status === 'open' ? 'bg-green-600' : ''}>
                             {drive.status}
                           </Badge>
                        </div>
                        <p className="font-medium">{drive.job_role}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                           <div className="flex items-center gap-1">
                              <IndianRupee className="h-3 w-3" />
                              <span>{drive.ctc_display}</span>
                           </div>
                           <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{drive.location}</span>
                           </div>
                           <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Deadline: {new Date(drive.deadline_date).toLocaleDateString()}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-4">
                     {/* Stats Placeholder */}
                     <div className="hidden md:flex flex-col items-end mr-4 text-sm">
                        <span className="font-medium text-gray-900">{drive.applicant_count || 0} Applicants</span>
                        <span className="text-gray-500">View Analytics</span>
                     </div>

                     <Link href={`/dashboard/drives/${drive.id}`}>
                       <Button variant="outline">Manage</Button>
                     </Link>
                     
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                             <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => router.push(`/dashboard/drives/${drive.id}/edit`)}>Edit Details</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => router.push(`/dashboard/drives/${drive.id}?tab=applicants`)}>View Applicants</DropdownMenuItem>
                           <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(drive.id)}>Delete Drive</DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
}
