'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { login } from '@/lib/utils/auth-helpers';
import { loginSchema } from '@/lib/utils/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

type FormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  isAdmin?: boolean;
  adminCode?: string | null;
}

export function LoginForm({ isAdmin = false, adminCode = null }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      await login(data.email, data.password);
      // Post-login gating for admins: require admin_code validation first
      if (isAdmin) {
        const codeInSession = typeof window !== 'undefined' ? sessionStorage.getItem('adminCode') : null;
        const hasCode = (adminCode && adminCode.length > 0) || (codeInSession && codeInSession.length > 0);
        if (!hasCode) {
          // Redirect back to login with role=admin to trigger the modal
          const next = searchParams.get('next') || '/dashboard';
          router.replace(`/auth/login?role=admin&next=${encodeURIComponent(next)}`);
          return;
        }
      }

      // Check if user was selecting a plan before login
      const selectedPlan = typeof window !== 'undefined' ? sessionStorage.getItem('selectedPlan') : null;
      const redirectParam = searchParams.get('redirect');
      const planParam = searchParams.get('plan');
      
      console.log('Login redirect check:', { selectedPlan, redirectParam, planParam, isAdmin });
      
      // If plan was selected or in URL, proceed to checkout
      // Check for redirect=checkout OR if plan is in URL/storage (more flexible)
      const planType = selectedPlan || planParam;
      const shouldRedirectToCheckout = planType && (redirectParam === 'checkout' || planParam);
      
      if (shouldRedirectToCheckout) {
        // Clear stored plan
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('selectedPlan');
        }
        
        // Create checkout session
        try {
          console.log('Creating checkout for plan:', planType);
          const response = await fetch('/api/subscriptions/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planType }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Checkout response:', data);
            if (data.checkoutUrl) {
              // Use window.location for external redirect
              window.location.href = data.checkoutUrl;
              return;
            } else {
              console.error('No checkoutUrl in response:', data);
              setError('Failed to get checkout URL. Please try again.');
              return;
            }
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Checkout error:', errorData);
            setError(errorData.error || 'Failed to create checkout session');
            return;
          }
        } catch (error) {
          console.error('Error creating checkout:', error);
          setError('Failed to create checkout session. Please try again.');
          return;
        }
      } else {
        console.log('Not redirecting to checkout:', { planType, redirectParam, planParam });
      }

      // Default redirect to home page (unless plan is selected, then go to checkout)
      const nextParam = searchParams.get('next');
      if (nextParam) {
        router.push(nextParam);
      } else {
        // Redirect to home page instead of dashboard
        router.push('/');
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Invalid email or password'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...field}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="text-right">
            <Link
              href="/auth/reset-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
