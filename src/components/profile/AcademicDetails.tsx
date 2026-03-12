'use client';

import { useState } from 'react';
import { StudentProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GraduationCap, BookOpen, Calculator, AlertTriangle } from 'lucide-react';

interface AcademicDetailsProps {
  profile: StudentProfile;
  onUpdate: (data: Partial<StudentProfile>) => void;
  isSaving: boolean;
}

export function AcademicDetails({ profile, onUpdate, isSaving }: AcademicDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<StudentProfile>>({
    tenth_mark: profile.tenth_mark,
    tenth_board: profile.tenth_board,
    tenth_institution: profile.tenth_institution,
    twelfth_mark: profile.twelfth_mark,
    twelfth_board: profile.twelfth_board,
    twelfth_institution: profile.twelfth_institution,
    diploma_mark: profile.diploma_mark,
    diploma_institution: profile.diploma_institution,
    ug_cgpa: profile.ug_cgpa,
    ug_gpa_s1: profile.ug_gpa_s1,
    ug_gpa_s2: profile.ug_gpa_s2,
    ug_gpa_s3: profile.ug_gpa_s3,
    ug_gpa_s4: profile.ug_gpa_s4,
    ug_gpa_s5: profile.ug_gpa_s5,
    ug_gpa_s6: profile.ug_gpa_s6,
    ug_gpa_s7: profile.ug_gpa_s7,
    ug_gpa_s8: profile.ug_gpa_s8,
    ug_gpa_s9: profile.ug_gpa_s9,
    ug_gpa_s10: profile.ug_gpa_s10,
    pg_cgpa: profile.pg_cgpa,
    pg_gpa_s1: profile.pg_gpa_s1,
    pg_gpa_s2: profile.pg_gpa_s2,
    pg_gpa_s3: profile.pg_gpa_s3,
    pg_gpa_s4: profile.pg_gpa_s4,
    pg_gpa_s5: profile.pg_gpa_s5,
    pg_gpa_s6: profile.pg_gpa_s6,
    pg_gpa_s7: profile.pg_gpa_s7,
    pg_gpa_s8: profile.pg_gpa_s8,
    current_backlogs: profile.current_backlogs,
    history_of_backlogs: profile.history_of_backlogs,
    gap_years: profile.gap_years,
    gap_reason: profile.gap_reason,
  });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const renderMarkField = (label: string, field: keyof StudentProfile, icon = <BookOpen className="h-4 w-4 text-slate-400" />) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {isEditing ? (
        <Input 
          type={typeof profile[field] === 'number' ? 'number' : 'text'}
          value={formData[field] as any || ''} 
          onChange={(e) => setFormData({...formData, [field]: typeof profile[field] === 'number' ? parseFloat(e.target.value) : e.target.value})} 
        />
      ) : (
        <p className="p-2 border rounded-md bg-slate-50 flex items-center gap-2">
          {icon}
          {String(profile[field] ?? 'N/A')}
        </p>
      )}
    </div>
  );

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Academic Qualifications
        </CardTitle>
        <Button 
          variant={isEditing ? "ghost" : "outline"} 
          size="sm" 
          onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-8 pt-4">
        {/* Schooling */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">Schooling Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderMarkField('10th Mark (%)', 'tenth_mark')}
            {renderMarkField('10th Board', 'tenth_board')}
            {renderMarkField('10th Institution', 'tenth_institution')}
            
            {renderMarkField('12th Mark (%)', 'twelfth_mark')}
            {renderMarkField('12th Board', 'twelfth_board')}
            {renderMarkField('12th Institution', 'twelfth_institution')}
          </div>
        </div>

        <Separator />

        {/* UG Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700">Undergraduate (UG) Details</h3>
            <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-2">
               <Calculator className="h-4 w-4 text-primary" />
               <span className="text-primary font-bold">CGPA: {profile.ug_cgpa || 'N/A'}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
             {[1,2,3,4,5,6,7,8,9,10].map(sem => (
                <div key={sem} className="space-y-1">
                  <Label className="text-xs text-slate-500">Sem {sem}</Label>
                  {isEditing ? (
                    <Input 
                      type="number"
                      step="0.01"
                      className="h-9 text-center"
                      value={(formData as any)[`ug_gpa_s${sem}`] || ''}
                      onChange={(e) => setFormData({...formData, [`ug_gpa_s${sem}`]: parseFloat(e.target.value)})}
                    />
                  ) : (
                    <p className="p-1.5 border rounded-md bg-slate-50 text-center font-medium">
                      {(profile as any)[`ug_gpa_s${sem}`] || '-'}
                    </p>
                  )}
                </div>
             ))}
          </div>
        </div>

        <Separator />

        {/* Backlogs */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Backlogs & Gap Years
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {renderMarkField('Current Backlogs', 'current_backlogs')}
            {renderMarkField('History of Backlogs', 'history_of_backlogs')}
            {renderMarkField('Gap Years', 'gap_years')}
            {renderMarkField('Gap Reason', 'gap_reason')}
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
