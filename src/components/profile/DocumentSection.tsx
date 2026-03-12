'use client';

import { useState } from 'react';
import { StudentService } from '@/services/student.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileText, Image as ImageIcon, Upload, Eye, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface DocumentSectionProps {
  onRefresh: () => void;
}

export function DocumentSection({ onRefresh }: DocumentSectionProps) {
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Max 2MB allowed.');
      return;
    }

    setUploading(type);
    try {
      await StudentService.uploadFile(file, type);
      toast.success(`${type.replace('_', ' ')} uploaded successfully!`);
      onRefresh();
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleView = async (type: string) => {
    try {
      const url = await StudentService.getDocumentURL(type);
      window.open(url, '_blank');
    } catch (error: any) {
      toast.error('Could not open document: ' + error.message);
    }
  };

  const docTypes = [
    { id: 'resume', name: 'Resume / CV', icon: FileText, color: 'text-blue-600' },
    { id: 'profile_pic', name: 'Profile Photo', icon: ImageIcon, color: 'text-purple-600' },
    { id: 'aadhar', name: 'Aadhaar Card', icon: FileText, color: 'text-emerald-600' },
    { id: 'pan', name: 'PAN Card', icon: FileText, color: 'text-amber-600' },
  ];

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          My Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {docTypes.map((doc) => (
          <div key={doc.id} className="p-4 border rounded-xl bg-slate-50/50 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white border ${doc.color}`}>
                   <doc.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{doc.name}</p>
                  <p className="text-xs text-slate-500">PDF or Images, Max 2MB</p>
                </div>
              </div>
              {uploading === doc.id ? (
                 <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              )}
            </div>

            <div className="flex gap-2 mt-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-2"
                onClick={() => handleView(doc.id)}
              >
                <Eye className="h-4 w-4" />
                View
              </Button>
              <div className="flex-1 relative">
                <Input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  accept=".pdf,image/*"
                  onChange={(e) => handleUpload(e, doc.id)}
                  disabled={!!uploading}
                />
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full gap-2 pointer-events-none"
                  disabled={!!uploading}
                >
                  <Upload className="h-4 w-4" />
                  Update
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
