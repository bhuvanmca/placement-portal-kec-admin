'use client';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(1, { message: "Password is required" }),
  });

  type FormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    console.log('[LoginPage] Submitting login form', { email: data.email });
    setLoading(true);
    setError('');
    try {
      await login(data);
      console.log('[LoginPage] Login successful');
    } catch (err: any) {
      console.error('[LoginPage] Login failed', err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex items-center justify-center min-h-screen w-full p-4 relative bg-[#f0f4f8]"
      style={{
        backgroundImage: `url('/campus-bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-[#002147]/80 backdrop-blur-sm" />

      <Card className="w-full max-w-[420px] bg-white shadow-2xl border-0 relative z-10 animate-in fade-in zoom-in duration-500 rounded-xl overflow-hidden">
        {/* Decorative Top Bar */}
        {/* <div className="h-2 w-full bg-[#002147]" /> */}
        
        <CardHeader className="text-center flex flex-col items-center space-y-4 pt-10 pb-6">
          <div className="w-24 h-24 relative mb-2 bg-white rounded-full p-2 shadow-sm border border-gray-100 flex items-center justify-center">
             <img 
               src="/kec-logo.png" 
               alt="KEC Logo" 
               className="w-full h-full object-contain"
             />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-[#002147] text-3xl font-bold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-gray-500">Sign in to the Placement Portal</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@kongu.edu"
                  {...register("email")}
                  className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-[#002147] focus:ring-[#002147] transition-all"
                />
              </div>
              {errors.email && <p className="text-destructive text-xs font-medium mt-1">{errors.email.message}</p>}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <a href="#" className="text-xs text-[#002147] hover:underline font-medium">Forgot Password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input 
                  id="password" 
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-[#002147] focus:ring-[#002147] transition-all"
                />
              </div>
              {errors.password && <p className="text-destructive text-xs font-medium mt-1">{errors.password.message}</p>}
            </div>
            
            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                {error}
              </div>
            )}
            
             <Button 
               className="w-full mt-2 font-bold h-12 text-[15px] bg-[#002147] hover:bg-[#003366] text-white shadow-lg shadow-[#002147]/20 transition-all duration-200" 
               type="submit" 
               disabled={loading}
             >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center py-6 bg-gray-50 border-t border-gray-100">
           <p className="text-xs text-gray-500 font-medium">
             Protected Area • KEC Placement Cell
           </p>
        </CardFooter>
      </Card>
      
      {/* Footer text outside card */}
      <div className="absolute bottom-6 text-white/60 text-xs font-medium tracking-wide z-10">
        © 2026 Kongu Engineering College.
      </div>
    </div>
  );
}
