'use client';

import { useState, useEffect } from 'react';
import { 
  Settings2, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { settingsService, FieldPermission } from '@/services/settings.service';
import { cn } from '@/lib/utils';

export default function StudentFieldSettingsPage() {
  const [permissions, setPermissions] = useState<FieldPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const data = await settingsService.getPermissions();
      setPermissions(data || []);
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      toast.error("Failed to load field permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (fieldName: string, currentStatus: boolean) => {
    // Optimistic Update
    const newStatus = !currentStatus;
    setPermissions(prev => prev.map(p => 
      p.field_name === fieldName ? { ...p, is_enabled: newStatus } : p
    ));

    try {
      await settingsService.togglePermission(fieldName, newStatus);
      toast.success(`${newStatus ? 'Enabled' : 'Disabled'} student editing for this field`);
    } catch (error) {
      // Revert on error
      setPermissions(prev => prev.map(p => 
        p.field_name === fieldName ? { ...p, is_enabled: currentStatus } : p
      ));
      toast.error("Failed to update permission");
    }
  };

  // Group by Category
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, FieldPermission[]>);

  if (loading) {
     return <div className="p-8 flex justify-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Field Permissions</h2>
          <p className="text-muted-foreground">
            Control which profile fields students can edit. Disabled fields require admin approval for changes.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <Card key={category} className="shadow-sm">
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                 <ShieldCheck className="h-4 w-4 text-primary" />
                 {category} Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y">
                 {perms.map((perm) => (
                   <div key={perm.field_name} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                         <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                           {perm.label}
                         </label>
                         <p className="text-[0.8rem] text-muted-foreground flex items-center gap-1">
                            {perm.is_enabled ? (
                                <span className="text-green-600 flex items-center gap-1"><Unlock className="h-3 w-3"/> Student Editable</span>
                            ) : (
                                <span className="text-amber-600 flex items-center gap-1"><Lock className="h-3 w-3"/> Admin Approval</span>
                            )}
                         </p>
                      </div>
                      <Switch 
                        checked={perm.is_enabled}
                        onCheckedChange={() => handleToggle(perm.field_name, perm.is_enabled)}
                      />
                   </div>
                 ))}
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
