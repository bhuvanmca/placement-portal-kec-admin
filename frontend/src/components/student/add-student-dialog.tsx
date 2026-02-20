import { useState, useEffect } from 'react';
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

import { configService, Department, Batch } from '@/services/config.service';
import { studentService } from '@/services/student.service';

const formSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  register_number: z.string().min(5, 'Invalid register number'),
  batch_year: z.string().min(4, 'Select a batch'),
  department: z.string().min(1, 'Select a department'),
  student_type: z.enum(['Regular', 'Lateral'] as const),
  gender: z.enum(['Male', 'Female', 'Other'] as const),
  mobile_number: z.string().optional(),
  password: z.string().optional(),
});

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStudentDialog({ isOpen, onClose, onSuccess }: AddStudentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Fetch Config
  useEffect(() => {
    const loadConfig = async () => {
        try {
            const [d, b] = await Promise.all([
                configService.getAllDepartments(),
                configService.getAllBatches()
            ]);
            setDepartments(d || []);
            setBatches(b || []);
        } catch(e) {
            console.warn("Failed to load config (possibly empty)", e);
        }
    };
    if (isOpen) {
        loadConfig();
    }
  }, [isOpen]);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      register_number: '',
      batch_year: new Date().getFullYear().toString(),
      department: '',
      student_type: 'Regular',
      // @ts-ignore
      gender: undefined, 
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
        // console.error(error);
      toast.error(error.response?.data?.error || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
                Enter the details used to create a new student account.
            </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* ... Name & Register No */}
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
                                {batches.map((b) => (
                                    <SelectItem key={b.id} value={b.year.toString()}>{b.year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.batch_year && <span className="text-red-500 text-xs">{errors.batch_year.message}</span>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <Controller
                      control={control}
                      name="department"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.code}>
                                        {dept.code}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.department && <span className="text-red-500 text-xs">{errors.department.message}</span>}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="student_type">Student Type</Label>
                    <Controller
                      control={control}
                      name="student_type"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Regular">Regular</SelectItem>
                                <SelectItem value="Lateral">Lateral</SelectItem>
                            </SelectContent>
                        </Select>
                      )}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Controller
                      control={control}
                      name="gender"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.gender && <span className="text-red-500 text-xs">{errors.gender.message}</span>}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="mobile_number">Mobile Number</Label>
                    <Input id="mobile_number" placeholder="9876543210" {...register('mobile_number')} />
                    {errors.mobile_number && <span className="text-red-500 text-xs">{errors.mobile_number.message}</span>}
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="john@kongu.edu" {...register('email')} />
                {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
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
