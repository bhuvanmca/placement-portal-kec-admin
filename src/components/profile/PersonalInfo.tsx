'use client';

import { useState } from 'react';
import { StudentProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Calendar, Smartphone, MapPin, Hash } from 'lucide-react';

interface PersonalInfoProps {
  profile: StudentProfile;
  onUpdate: (data: Partial<StudentProfile>) => void;
  isSaving: boolean;
}

export function PersonalInfo({ profile, onUpdate, isSaving }: PersonalInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    mobile_number: profile.mobile_number || '',
    dob: profile.dob || '',
    gender: profile.gender || '',
    aadhar_number: profile.aadhar_number || '',
    pan_number: profile.pan_number || '',
    address_line_1: profile.address_line_1 || '',
    address_line_2: profile.address_line_2 || '',
    state: profile.state || '',
  });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Personal Information
        </CardTitle>
        <Button 
          variant={isEditing ? "ghost" : "outline"} 
          size="sm" 
          onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Full Name</Label>
            {isEditing ? (
              <Input 
                value={formData.full_name} 
                onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
              />
            ) : (
              <p className="p-2 border rounded-md bg-slate-50 font-medium">{profile.full_name || 'N/A'}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mobile Number</Label>
            {isEditing ? (
              <Input 
                value={formData.mobile_number} 
                onChange={(e) => setFormData({...formData, mobile_number: e.target.value})} 
              />
            ) : (
              <p className="p-2 border rounded-md bg-slate-50 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-slate-400" />
                {profile.mobile_number || 'N/A'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Date of Birth</Label>
            {isEditing ? (
              <Input 
                type="date"
                value={formData.dob} 
                onChange={(e) => setFormData({...formData, dob: e.target.value})} 
              />
            ) : (
              <p className="p-2 border rounded-md bg-slate-50 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                {profile.dob || 'N/A'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            {isEditing ? (
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.gender} 
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <p className="p-2 border rounded-md bg-slate-50">{profile.gender || 'N/A'}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Aadhaar Number</Label>
            {isEditing ? (
              <Input 
                value={formData.aadhar_number} 
                onChange={(e) => setFormData({...formData, aadhar_number: e.target.value})} 
              />
            ) : (
              <p className="p-2 border rounded-md bg-slate-50 flex items-center gap-2">
                <Hash className="h-4 w-4 text-slate-400" />
                {profile.aadhar_number || 'N/A'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>PAN Number</Label>
            {isEditing ? (
              <Input 
                value={formData.pan_number} 
                onChange={(e) => setFormData({...formData, pan_number: e.target.value})} 
              />
            ) : (
              <p className="p-2 border rounded-md bg-slate-50 flex items-center gap-2">
                <Hash className="h-4 w-4 text-slate-400" />
                {profile.pan_number || 'N/A'}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-lg font-bold flex items-center gap-2 pt-4">
            <MapPin className="h-5 w-5 text-primary" />
            Address
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label>Address Line 1</Label>
              {isEditing ? (
                <Input 
                  value={formData.address_line_1} 
                  onChange={(e) => setFormData({...formData, address_line_1: e.target.value})} 
                />
              ) : (
                <p className="p-2 border rounded-md bg-slate-50">{profile.address_line_1 || 'N/A'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              {isEditing ? (
                <Input 
                  value={formData.address_line_2} 
                  onChange={(e) => setFormData({...formData, address_line_2: e.target.value})} 
                />
              ) : (
                <p className="p-2 border rounded-md bg-slate-50">{profile.address_line_2 || 'N/A'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              {isEditing ? (
                <Input 
                  value={formData.state} 
                  onChange={(e) => setFormData({...formData, state: e.target.value})} 
                />
              ) : (
                <p className="p-2 border rounded-md bg-slate-50">{profile.state || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
