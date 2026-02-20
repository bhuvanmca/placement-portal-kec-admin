'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { Loader2, Upload } from 'lucide-react';

export default function CollegeProfilePage() {
  const { user, updateCollegeSettings } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    college_name: '',
    college_logo_url: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Updated path to use /v1
      const { data } = await apiClient.get('/v1/settings');
      if (data.settings) {
        setFormData({
          college_name: data.settings.college_name || '',
          college_logo_url: data.settings.college_logo_url || '',
        });
      }
    } catch (error: any) {
      console.error("Failed to load settings:", error.message || error);
      toast.error('Failed to load settings');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Updated path to use /v1
      await apiClient.post('/v1/admin/settings', formData);
      
      // Update global context
      updateCollegeSettings({
        college_name: formData.college_name,
        college_logo_url: formData.college_logo_url
      });

      toast.success('College profile updated successfully');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      // Updated path to use /v1/super-admin (correct route group)
      const { data } = await apiClient.post('/v1/super-admin/upload/college-logo', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newUrl = data.url;
      setFormData(prev => ({ ...prev, college_logo_url: newUrl }));
      
      // Update global context immediately
      updateCollegeSettings({
         college_logo_url: newUrl
      });
      
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      console.error("Upload failed", error);
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  if (user?.role !== 'super_admin') {
    return <div className="p-6">Access Denied</div>;
  }

  if (fetching) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-[#002147]">College Profile</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Update the college name and branding assets used across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="college_name">College Name</Label>
              <Input
                id="college_name"
                value={formData.college_name}
                onChange={(e) => setFormData({ ...formData, college_name: e.target.value })}
                placeholder="e.g. Kongu Engineering College"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">College Logo</Label>
              <div className="flex items-start gap-4">
                {formData.college_logo_url && (
                   <div className="border rounded p-2 bg-gray-50">
                      <img 
                        src={formData.college_logo_url} 
                        alt="College Logo" 
                        className="h-16 w-auto object-contain"
                      />
                   </div>
                )}
                <div className="flex-1 space-y-2">
                   {/* Hidden File Input */}
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileUpload}
                   />
                   
                   <div className="flex gap-2">
                      <Button 
                         type="button" 
                         variant="outline" 
                         disabled={uploading}
                         onClick={() => fileInputRef.current?.click()}
                      >
                         {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                         Upload Logo
                      </Button>
                      {formData.college_logo_url && (
                         <Button 
                            type="button" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setFormData({...formData, college_logo_url: ''})}
                         >
                            Remove
                         </Button>
                      )}
                   </div>
                   <p className="text-xs text-gray-500">
                     Recommended: PNG or SVG with transparent background. Max 2MB.
                   </p>
                </div>
              </div>
              
              {/* Fallback URL Input if upload fails or user prefers URL */}
               <div className="mt-2">
                 <Label className="text-xs text-gray-400">Or use a direct URL</Label>
                 <Input
                   value={formData.college_logo_url}
                   onChange={(e) => setFormData({ ...formData, college_logo_url: e.target.value })}
                   placeholder="https://example.com/logo.png"
                   className="mt-1 h-8 text-sm"
                 />
               </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading} className="bg-[#002147] hover:bg-[#002147]/90">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
