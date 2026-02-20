'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { Loader2, User, Lock, Trash2, LogOut, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AccountSettingsPage() {
  const { user: authUser, setUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    profile_photo_url: '',
    last_login: '',
  });

  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await apiClient.get('/v1/user/account');
      setProfile({
        name: data.name || '',
        email: data.email || '',
        role: data.role || '',
        profile_photo_url: data.profile_photo_url || '',
        last_login: data.last_login || '',
      });
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to load profile');
    } finally {
      setFetching(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.put('/v1/user/account', {
        name: profile.name,
        profile_photo_url: profile.profile_photo_url,
      });
      toast.success('Profile updated successfully');
      
      if (authUser) {
         setUser({ ...authUser, name: profile.name, profile_photo_url: profile.profile_photo_url });
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to update profile');
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
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Updated path to use /v1
      const { data } = await apiClient.post('/v1/user/upload/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfile(prev => ({ ...prev, profile_photo_url: data.url }));
      
      if (authUser) {
         setUser({ ...authUser, profile_photo_url: data.url });
      }

      toast.success('Profile photo updated');
    } catch (error: any) {
      console.error("Upload failed", error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await apiClient.put('/v1/user/password', passwords);
      toast.success('Password changed successfully');
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await apiClient.delete('/v1/user/account');
      toast.success('Account deleted');
      logout();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to delete account');
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-[#002147]">Account Settings</h1>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2"><User size={16}/> Profile</TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2"><Lock size={16}/> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and public profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex items-center gap-6 mb-6">
                   <Avatar className="h-20 w-20 border">
                      <AvatarImage src={profile.profile_photo_url || `https://ui-avatars.com/api/?name=${profile.name}&background=random`} />
                      <AvatarFallback>User</AvatarFallback>
                   </Avatar>
                   <div className="flex-1 space-y-2">
                      <Label htmlFor="photo_url">Profile Photo</Label>
                      <div className="flex gap-2 items-center">
                         <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileUpload}
                         />
                         <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                         >
                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                            Upload Photo
                         </Button>
                         {profile.profile_photo_url && (
                             <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setProfile({...profile, profile_photo_url: ''})}
                             >
                                Remove
                             </Button>
                         )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, GIF or PNG. 2MB max.
                      </p>
                      {/* Hidden URL input for fallback if needed, but not showing it as per request to focus on upload */}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={profile.role.toUpperCase().replace('_', ' ')}
                      disabled
                      className="bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                     <Label>Last Login</Label>
                     <div className="text-sm border rounded-md px-3 py-2 bg-gray-50 text-gray-500">
                        {profile.last_login ? new Date(profile.last_login).toLocaleString() : 'Never'}
                     </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="bg-[#002147] hover:bg-[#002147]/90">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="old_pass">Current Password</Label>
                  <Input
                    id="old_pass"
                    type="password"
                    value={passwords.old_password}
                    onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_pass">New Password</Label>
                  <Input
                    id="new_pass"
                    type="password"
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_pass">Confirm New Password</Label>
                  <Input
                    id="confirm_pass"
                    type="password"
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="bg-[#002147] hover:bg-[#002147]/90 w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-red-100">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions requiring caution.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                     <h4 className="font-semibold text-red-600">Delete Account</h4>
                     <p className="text-sm text-slate-600/80">Permanently remove your account and all associated data.</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" disabled={loading} className="font-bold">
                          <Trash2 className="mr-2 h-4 w-4"/> Delete Account
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                       <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                             This action cannot be undone. This will permanently delete your account
                             and remove your data from our servers.
                          </AlertDialogDescription>
                       </AlertDialogHeader>
                       <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                             Yes, delete my account
                          </AlertDialogAction>
                       </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
               </div>
            </CardContent>
          </Card>
          
          <div className="pt-4 flex justify-end">
             <Button variant="outline" onClick={logout} className="text-red-600 border-red-200 hover:bg-red-50">
               <LogOut className="mr-2 h-4 w-4"/> Log Out
             </Button>
          </div>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
