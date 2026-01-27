'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success("OTP sent to your email");
      setStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) return;
    setLoading(true);
    try {
      await authService.resetPassword({ email, otp, new_password: newPassword });
      toast.success("Password reset successfully. Please login.");
      router.push('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8] p-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="text-center">
            {step === 1 && (
                <>
                    <CardTitle className="text-xl text-[#002147]">Forgot Password</CardTitle>
                    <CardDescription>Enter your email to receive a verification code</CardDescription>
                </>
            )}
            {step === 2 && (
                <>
                    <CardTitle className="text-xl text-[#002147]">Enter OTP</CardTitle>
                    <CardDescription>Enter the 6-digit code sent to {email}</CardDescription>
                </>
            )}
            {step === 3 && ( // Should not happen directly, simplified flow combines OTP + Password in one step or uses setStep(3)
                // Actually, let's make step 2 the final step where they enter OTP and New Password
                 <>
                    <CardTitle className="text-xl text-[#002147]">Reset Password</CardTitle>
                    <CardDescription>Enter the code and your new password</CardDescription>
                </>
            )}
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@kongu.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full bg-[#002147]" type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
               <div className="space-y-2 flex flex-col items-center">
                <Label htmlFor="otp" className="mb-2">One-Time Password</Label>
                <InputOTP maxLength={6} value={otp} onChange={(value: string) => setOtp(value)}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button className="w-full bg-[#002147]" type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Reset Password"}
              </Button>
              
              <div className="text-center">
                  <Button variant="link" size="sm" onClick={() => setStep(1)} type="button"> Change Email </Button>
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t py-4">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => router.push('/login')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
