'use client';

import { useState } from 'react';
import { StudentProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Linkedin, Github, Code, Globe, MessageSquare, X, Plus } from 'lucide-react';

interface SocialSkillsProps {
  profile: StudentProfile;
  onUpdate: (data: Partial<StudentProfile>) => void;
  isSaving: boolean;
}

export function SocialSkills({ profile, onUpdate, isSaving }: SocialSkillsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [formData, setFormData] = useState({
    social_links: {
      linkedin: profile.social_links?.linkedin || '',
      github: profile.social_links?.github || '',
      leetcode: profile.social_links?.leetcode || '',
    },
    language_skills: profile.language_skills || [],
  });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.language_skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        language_skills: [...formData.language_skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      language_skills: formData.language_skills.filter(s => s !== skill)
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Social Links
          </CardTitle>
          <Button 
            variant={isEditing ? "ghost" : "outline"} 
            size="sm" 
            onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-blue-600" />
                LinkedIn
              </Label>
              {isEditing ? (
                <Input 
                  value={formData.social_links.linkedin} 
                  onChange={(e) => setFormData({...formData, social_links: {...formData.social_links, linkedin: e.target.value}})} 
                />
              ) : (
                <p className="p-2 border rounded-md bg-slate-50 truncate">
                  {profile.social_links?.linkedin || 'Not linked'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Github className="h-4 w-4 text-slate-900" />
                GitHub
              </Label>
              {isEditing ? (
                <Input 
                  value={formData.social_links.github} 
                  onChange={(e) => setFormData({...formData, social_links: {...formData.social_links, github: e.target.value}})} 
                />
              ) : (
                <p className="p-2 border rounded-md bg-slate-50 truncate">
                  {profile.social_links?.github || 'Not linked'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Code className="h-4 w-4 text-orange-500" />
                LeetCode
              </Label>
              {isEditing ? (
                <Input 
                  value={formData.social_links.leetcode} 
                  onChange={(e) => setFormData({...formData, social_links: {...formData.social_links, leetcode: e.target.value}})} 
                />
              ) : (
                <p className="p-2 border rounded-md bg-slate-50 truncate">
                  {profile.social_links?.leetcode || 'Not linked'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Language Skills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2 min-h-[100px] p-4 border rounded-lg bg-slate-50/50">
            {formData.language_skills.length > 0 ? (
              formData.language_skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm bg-white border flex items-center gap-2">
                  {skill}
                  {isEditing && (
                    <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => removeSkill(skill)} />
                  )}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-slate-400 italic">No skills added yet.</p>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-2">
              <Input 
                placeholder="Add a language (e.g. English, Tamil)" 
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSkill()}
              />
              <Button type="button" size="icon" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

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
    </div>
  );
}
