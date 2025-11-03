'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { verifyOtpSchema } from '@/lib/utils/validation';
import { verifyOtp, markProfileVerified, logout } from '@/lib/utils/auth-helpers';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';

type FormData = z.infer<typeof verifyOtpSchema>;

export function VerifyForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      otp: '',
    },
  });

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('verificationEmail');
    if (!storedEmail) {
      router.push('/auth/signup');
      return;
    }

    const passwordResetFlag = sessionStorage.getItem('isPasswordReset');
    setIsPasswordReset(passwordResetFlag === 'true');

    setEmail(storedEmail);
  }, [router]);

  async function onSubmit(data: FormData) {
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      const verifyResult = await verifyOtp(email, data.otp);
      
      // Mark profile as verified once OTP succeeds
      try {
        await markProfileVerified();
      } catch (e) {
        // Non-fatal: continue flow even if this update fails
        console.error('Failed to mark profile verified:', e);
      }

      if (isPasswordReset) {
        sessionStorage.removeItem('verificationEmail');
        router.push('/auth/new-password');
      } else {
        sessionStorage.removeItem('isPasswordReset');
        
        // Get user ID from verification result
        let userId = verifyResult.user?.id;
        
        // Fallback: try to get user from session if not in verifyResult
        if (!userId) {
          try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
              userId = user.id;
            }
          } catch (e) {
            console.error('Failed to get user:', e);
          }
        }
        const signupDataStr = sessionStorage.getItem('signupData');
        const profileImageUrl = sessionStorage.getItem('profileImageUrl');
        const adminCodeFromStorage = sessionStorage.getItem('adminCode');
        
        // Update profile if signup data exists
        if (userId && signupDataStr) {
          try {
            const signupData = JSON.parse(signupDataStr);
            const isAdminValue = signupData.isAdmin === true || signupData.isAdmin === 'true' || signupData.isAdmin === 1;
            const adminCodeValue = adminCodeFromStorage || signupData.adminCode || null;
            
            console.log('Verify form - sending update-profile:', { 
              isAdmin: isAdminValue, 
              adminCode: adminCodeValue,
              signupData 
            });
            
            const updateResponse = await fetch('/api/update-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId,
                firstName: signupData.firstName,
                lastName: signupData.lastName,
                contactNo: signupData.contactNo,
                profileImageUrl: profileImageUrl || null,
                isAdmin: isAdminValue,
                adminCode: adminCodeValue,
              }),
            });

            if (!updateResponse.ok) {
              const errorData = await updateResponse.json();
              console.error('Profile update failed:', errorData);
              throw new Error(errorData.error || 'Failed to update profile');
            }

            const updateResult = await updateResponse.json();
            console.log('Profile updated successfully:', updateResult);
            
            // Clean up sessionStorage
            sessionStorage.removeItem('signupData');
            sessionStorage.removeItem('profileImageUrl');
          } catch (profileError) {
            console.error('Failed to update profile:', profileError);
            // Show error but don't block the flow
            setError(
              profileError instanceof Error
                ? `Profile update failed: ${profileError.message}`
                : 'Failed to update profile. Please update it manually later.'
            );
          }
        } else {
          console.warn('Missing userId or signupData:', { userId, signupDataStr });
        }

        // Send welcome email (non-blocking)
        fetch('/api/resend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'welcome',
            email: email,
            origin: window.location.origin,
          }),
        }).catch((err) => {
          console.error('Failed to send welcome email:', err);
        });

        sessionStorage.removeItem('verificationEmail');

        // Sign out user so they can login normally (OTP verification creates a session)
        await logout();

        // Redirect to login page after successful verification
        router.push('/auth/login');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred during verification'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function resendOtp() {
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      // Resend verification email
      await fetch('/api/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'verification',
          email,
          isPasswordReset: isPasswordReset,
        }),
      });

      setError('A new verification code has been sent to your email.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to resend verification code'
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (!email) {
    return null;
  }

  return (
    <div className="space-y-6">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert
            variant={
              error.includes('has been sent') ? 'default' : 'destructive'
            }
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      <div className="text-center mb-4">
        <p>
          We&apos;ve sent a verification code to{' '}
          <span className="font-medium">{email}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isPasswordReset
            ? 'Enter the code to continue with your password reset'
            : 'Enter the code to verify your account'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter 6-digit code"
                    {...field}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? 'Verifying...'
              : isPasswordReset
                ? 'Continue Password Reset'
                : 'Verify Email'}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm">
        Didn&apos;t receive the code?{' '}
        <button
          onClick={resendOtp}
          className="text-blue-600 hover:underline"
          disabled={isLoading}
        >
          Resend
        </button>
      </div>
    </div>
  );
}
