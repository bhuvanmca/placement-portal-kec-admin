import { useState } from 'react';
import { DriveRequest } from '@/services/drive.service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink, Check, X, Loader2, Building2, GraduationCap, Calendar, Briefcase } from 'lucide-react';
import Link from 'next/link';

interface DriveRequestCardProps {
  request: DriveRequest;
  onApprove: (id: number, studentId: number, remarks: string) => Promise<void>;
  onReject: (id: number, studentId: number, remarks: string) => Promise<void>;
  isProcessing: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (driveId: number, studentId: number) => void;
}

export function DriveRequestCard({ request, onApprove, onReject, isProcessing, selectionMode, isSelected, onToggleSelect }: DriveRequestCardProps) {
  const [remarks, setRemarks] = useState(request.remarks || '');

  const cgpaLabel = request.department_type === 'PG' ? 'PG CGPA' : 'UG CGPA';

  return (
    <div className={`p-4 border rounded-lg bg-white space-y-3 transition-all ${isSelected ? 'ring-2 ring-[#002147] border-[#002147]/30 bg-[#002147]/[0.02]' : ''}`}>
      {/* Company Name — prominent */}
      <div className="flex items-center gap-2 pb-2 border-b">
        {selectionMode && (
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(request.drive_id, request.student_id)}
            className="data-[state=checked]:bg-[#002147] data-[state=checked]:border-[#002147]"
          />
        )}
        <Building2 className="h-4 w-4 text-[#002147]" />
        <span className="font-bold text-sm text-[#002147]">{request.company_name}</span>
      </div>

      {/* Student Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={request.profile_photo_url} />
            <AvatarFallback className="text-xs bg-[#002147]/10 text-[#002147]">
              {request.full_name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-sm">{request.full_name}</div>
            <div className="text-xs text-muted-foreground">
              {request.register_number} · {request.department}
            </div>
          </div>
        </div>
        <Link href={`/dashboard/students/${request.student_id}`} target="_blank">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View Profile">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Details Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{cgpaLabel}: {request.cgpa}</span>
        </div>
        {request.applied_role_names && (
          <div className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{request.applied_role_names}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{request.applied_at}</span>
        </div>
      </div>

      {/* Actions */}
      {!selectionMode && (
        <div className="flex items-center gap-2 pt-1">
          <Input 
            placeholder="Remarks (optional)" 
            className="h-7 text-xs flex-1"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <Button 
            size="sm" 
            className="h-7 text-xs px-3 bg-[#002147] hover:bg-[#003366]"
            onClick={() => onApprove(request.drive_id, request.student_id, remarks)}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            Approve
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs px-3 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => onReject(request.drive_id, request.student_id, remarks)}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
