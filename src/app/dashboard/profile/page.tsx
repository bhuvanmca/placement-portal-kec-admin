'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StudentService } from '@/services/student.service';
import { StudentProfile } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalInfo } from '@/components/profile/PersonalInfo';
import { AcademicDetails } from '@/components/profile/AcademicDetails';
import { SocialSkills } from '@/components/profile/SocialSkills';
import { DocumentSection } from '@/components/profile/DocumentSection';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Smartphone, Building, Key, ShieldCheck, Camera, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: StudentService.getProfile,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<StudentProfile>) => StudentService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      toast.error('Failed to update profile: ' + error.message);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => StudentService.changePassword(passwordForm),
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setIsChangingPassword(false);
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    },
    onError: (error: any) => {
      toast.error('Failed to change password: ' + error.message);
    }
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-slate-500 animate-pulse">Loading your profile...</p>
    </div>
  );

  if (!profile) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
      <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <User className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">Could not load profile</h2>
      <p className="text-slate-500 max-w-md">We encountered an error while fetching your profile data. This might be because your profile hasn't been initialized yet or there's a connectivity issue.</p>
      <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['profile'] })} className="mt-4">
        Try Again
      </Button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Student Profile</h1>
          <p className="text-slate-500 text-lg">Manage your digital identity and academic credentials.</p>
        </div>
        <div className="flex gap-2">
           <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
              <DialogTrigger render={
                <Button variant="outline" className="gap-2">
                  <Key className="h-4 w-4" />
                  Security Settings
                </Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>Update your password to keep your account secure.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input type="password" value={passwordForm.old_password} onChange={(e) => setPasswordForm({...passwordForm, old_password: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsChangingPassword(false)}>Cancel</Button>
                  <Button onClick={() => changePasswordMutation.mutate()}>Update Password</Button>
                </DialogFooter>
              </DialogContent>
           </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Left Sidebar: Brief Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-blue-800 text-white overflow-hidden">
            <CardContent className="pt-10 flex flex-col items-center relative">
              <div className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full cursor-pointer hover:bg-white/30 transition-colors">
                <Camera className="h-4 w-4" />
              </div>
              <Avatar className="h-32 w-32 mb-6 border-4 border-white/30 shadow-2xl scale-110">
                <AvatarImage src={profile.profile_photo_url} className="object-cover" />
                <AvatarFallback className="text-4xl bg-white/20 text-white backdrop-blur-sm">
                  {profile.full_name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-black text-center mb-1">{profile.full_name}</h2>
              <p className="text-blue-100 font-medium opacity-80 mb-6">{profile.register_number}</p>
              
              <div className="w-full space-y-3 bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                 <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-blue-200" />
                    <span className="truncate">{profile.email}</span>
                 </div>
                 <div className="flex items-center gap-3 text-sm">
                    <Building className="h-4 w-4 text-blue-200" />
                    <span className="truncate">{profile.department}</span>
                 </div>
                 <div className="flex items-center gap-3 text-sm">
                    <Smartphone className="h-4 w-4 text-blue-200" />
                    <span>{profile.mobile_number || 'No contact info'}</span>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm flex flex-col items-center justify-center p-6 bg-slate-50">
             <ShieldCheck className="h-10 w-10 text-emerald-500 mb-2" />
             <p className="text-slate-500 text-sm font-medium">Profile Status</p>
             <p className="text-slate-900 font-bold">100% Complete</p>
          </Card>
        </div>

        {/* Right Content: Tabs */}
        <Card className="lg:col-span-3 border-none shadow-none bg-transparent">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-12 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="personal" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Personal</TabsTrigger>
              <TabsTrigger value="academic" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Academic</TabsTrigger>
              <TabsTrigger value="social" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Skills & Social</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Documents</TabsTrigger>
            </TabsList>
            
            <div className="mt-8 space-y-8">
              <TabsContent value="personal" className="mt-0 outline-none">
                <PersonalInfo 
                  profile={profile} 
                  isSaving={updateMutation.isPending} 
                  onUpdate={(data) => updateMutation.mutate(data)} 
                />
              </TabsContent>
              
              <TabsContent value="academic" className="mt-0 outline-none">
                <AcademicDetails 
                  profile={profile} 
                  isSaving={updateMutation.isPending} 
                  onUpdate={(data) => updateMutation.mutate(data)} 
                />
              </TabsContent>
              
              <TabsContent value="social" className="mt-0 outline-none">
                <SocialSkills 
                  profile={profile} 
                  isSaving={updateMutation.isPending} 
                  onUpdate={(data) => updateMutation.mutate(data)} 
                />
              </TabsContent>
              
              <TabsContent value="documents" className="mt-0 outline-none">
                <DocumentSection 
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ['profile'] })}
                />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
