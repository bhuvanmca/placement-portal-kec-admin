'use client';

import { useState } from 'react';
import { UploadCloud, X, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploadProps {
  onUploadComplete?: (url: string, name: string) => void;
  onFileSelect?: (file: File) => void;
  label?: string;
  mode?: 'direct' | 'local';
  multiple?: boolean;
}

export default function FileUpload({ 
  onUploadComplete, 
  onFileSelect,
  label = "Upload File", 
  mode = 'direct',
  multiple = false
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    // Convert FileList to Array if needed
    const fileArray = Array.from(files);

    for (const file of fileArray) {
       // Validate file type/size
       if (file.size > 5 * 1024 * 1024) {
         toast.error(`File "${file.name}" is too large (Max 5MB)`);
         continue; // Skip large files
       }

       if (mode === 'local') {
         if (onFileSelect) {
           onFileSelect(file);
           toast.success(`File "${file.name}" selected`);
         }
         continue;
       }

       // Direct Upload Logic (SEQUENTIAL for now to avoid state complexity)
       setIsUploading(true);
       const formData = new FormData();
       formData.append('file', file);
       formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'placement_docs');
       formData.append('folder', 'placement_drives');

       try {
         const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dj2ghh4oi'; 
         const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
           method: 'POST',
           body: formData,
         });

         if (!response.ok) {
           const errorData = await response.json();
           console.error("Cloudinary Error:", errorData);
           throw new Error(errorData.error?.message || 'Upload failed');
         }

         const data = await response.json();
         if (onUploadComplete) onUploadComplete(data.secure_url, file.name);
         toast.success(`File "${file.name}" uploaded`);
       } catch (error) {
         console.error(error);
         toast.error(`Failed to upload ${file.name}`);
       }
    }
    setIsUploading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2 text-gray-700">{label}</label>
      <div 
        className={`
          relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center
          transition-colors cursor-pointer bg-gray-50
          ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          multiple={multiple}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          disabled={isUploading}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center animate-pulse">
            <UploadCloud className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="bg-white p-3 rounded-full shadow-sm mb-3">
               <UploadCloud className="h-6 w-6 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-500 mt-1">PDF, DOC, Images (Max 5MB)</p>
          </div>
        )}
      </div>
    </div>
  );
}
