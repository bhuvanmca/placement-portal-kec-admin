import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { studentService } from '@/services/student.service';
import { DEPARTMENTS } from '@/constants/departments';

const formSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  register_number: z.string().min(5, 'Invalid register number'),
  batch_year: z.string().min(4, 'Select a batch'),
  department: z.string().min(1, 'Select a department'),
  mobile_number: z.string().min(10, 'Invalid mobile number'),
  password: z.string().optional(),
});

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStudentDialog({ isOpen, onClose, onSuccess }: AddStudentDialogProps) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      register_number: '',
      batch_year: '2025',
      department: '',
      mobile_number: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        batch_year: parseInt(values.batch_year),
      };

      const res = await studentService.createStudent(payload);
      toast.success('Student added successfully');
      
      if (res.default_password) {
        toast.info(`Default password: ${res.default_password}`, {
          duration: 10000,
        });
      }

      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
        console.error(error);
      toast.error(error.response?.data?.error || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Student</DialogTitle>
          <DialogDescription>
            Manually add a student to the system. They will receive default credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" placeholder="John Doe" {...register('full_name')} />
              {errors.full_name && <span className="text-red-500 text-xs">{errors.full_name.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="register_number">Register No</Label>
                    <Input id="register_number" placeholder="21CSR001" {...register('register_number')} />
                    {errors.register_number && <span className="text-red-500 text-xs">{errors.register_number.message}</span>}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="batch_year">Batch</Label>
                    <Controller
                      control={control}
                      name="batch_year"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.batch_year && <span className="text-red-500 text-xs">{errors.batch_year.message}</span>}
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                    {dept}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  )}
                />
                {errors.department && <span className="text-red-500 text-xs">{errors.department.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" placeholder="john@kongu.edu" {...register('email')} />
                    {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="mobile_number">Mobile</Label>
                    <Input id="mobile_number" placeholder="9876543210" {...register('mobile_number')} />
                    {errors.mobile_number && <span className="text-red-500 text-xs">{errors.mobile_number.message}</span>}
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input id="password" placeholder="Default: Student@123" {...register('password')} />
            </div>

            <DialogFooter>
               <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
               <Button type="submit" className="bg-[#002147] hover:bg-[#003366]" disabled={loading}>
                 {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Add Student
               </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
