'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { studentService } from '@/services/student.service';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkUploadDialog({ isOpen, onClose, onSuccess }: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a valid CSV file.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      await studentService.bulkUploadStudents(file);
      setSuccess(true);
      if (onSuccess) {
          // Add a small delay so user sees success state before close if they want
          setTimeout(() => {
              onSuccess();
              setFile(null);
              setSuccess(false);
              onClose();
          }, 1500); 
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload students. Please check your CSV format.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
      setFile(null);
      setError(null);
      setSuccess(false);
      onClose();
  }

  const handleDownloadTemplate = () => {
    const headers = ['email', 'name', 'regNo', 'dept', 'batch_year', 'password'];
    // Add a sample row to help users understand the format
    const sampleRow = ['student@example.com', 'John Doe', '21CSR001', 'CSE', '2025', 'password123'];
    const csvContent = headers.join(',') + '\n' + sampleRow.join(',');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_bulk_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Students</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing student details. Ensure the format matches the required template.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadTemplate}
            className="text-xs h-8 gap-1"
          >
            <Download className="h-3 w-3" /> Download Template
          </Button>
        </div>

        <div className="grid gap-4 py-2">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input 
                id="csv-file" 
                type="file" 
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploading || success}
            />
          </div>

          {file && !error && !success && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-md">
                  <FileText className="h-4 w-4" />
                  <span className="truncate max-w-[250px]">{file.name}</span>
                  <span className="text-gray-400 text-xs ml-auto">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
          )}

          {error && (
              <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
              </Alert>
          )}

          {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>Students uploaded successfully!</AlertDescription>
              </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading || success} className="bg-[#002147] hover:bg-[#003366]">
            {uploading ? (
                <>
                    <Upload className="mr-2 h-4 w-4 animate-bounce" /> Uploading...
                </>
            ) : success ? (
                <>Upload Complete</>
            ) : (
                <>
                    <Upload className="mr-2 h-4 w-4" /> Upload
                </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
