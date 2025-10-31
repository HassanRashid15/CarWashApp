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
import { signupSchema } from '@/lib/utils/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Eye, EyeOff, Upload, X } from 'lucide-react';

type FormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  isAdmin?: boolean;
  adminCode?: string | null;
}

export function SignupForm({ isAdmin = false, adminCode = null }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingContact, setIsCheckingContact] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [contactNotice, setContactNotice] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  
  // Debounce timers
  const emailDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const contactDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const emailNoticeTimer = useRef<NodeJS.Timeout | null>(null);
  const contactNoticeTimer = useRef<NodeJS.Timeout | null>(null);
  const passwordNoticeTimer = useRef<NodeJS.Timeout | null>(null);

  // Async validation function for duplicates
  const checkDuplicate = useCallback(async (email?: string, contactNo?: string) => {
    if (!email && !contactNo) return { emailExists: false, contactNoExists: false };
    
    try {
      const response = await fetch('/api/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, contactNo }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to check duplicates');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Duplicate check error:', error);
      return { emailExists: false, contactNoExists: false };
    }
  }, []);

  // Debounced email validation
  const validateEmailAsync = useCallback(async (email: string): Promise<string | true> => {
    // Clear previous timer
    if (emailDebounceTimer.current) {
      clearTimeout(emailDebounceTimer.current);
    }

    // Basic email format validation
    if (!email.includes('@') || !email.includes('.')) {
      return true; // Let zod handle format validation
    }

    return new Promise((resolve) => {
      emailDebounceTimer.current = setTimeout(async () => {
        setIsCheckingEmail(true);
        const result = await checkDuplicate(email);
        setIsCheckingEmail(false);
        
        if (result.emailExists) {
          resolve('An account with this email already exists. Please use a different email or sign in instead.');
        } else {
          resolve(true);
        }
      }, 500); // 500ms debounce
    });
  }, [checkDuplicate]);

  // Debounced contact number validation
  const validateContactNoAsync = useCallback(async (contactNo: string): Promise<string | true> => {
    // Clear previous timer
    if (contactDebounceTimer.current) {
      clearTimeout(contactDebounceTimer.current);
    }

    // Basic contact number validation
    if (contactNo.length < 10) {
      return true; // Let zod handle length validation
    }

    return new Promise((resolve) => {
      contactDebounceTimer.current = setTimeout(async () => {
        setIsCheckingContact(true);
        const result = await checkDuplicate(undefined, contactNo);
        setIsCheckingContact(false);
        
        if (result.contactNoExists) {
          resolve('An account with this contact number already exists. Please use a different contact number.');
        } else {
          resolve(true);
        }
      }, 500); // 500ms debounce
    });
  }, [checkDuplicate]);

  const form = useForm<FormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      contactNo: '',
      password: '',
      confirmPassword: '',
      profileImage: undefined,
    },
    mode: 'onBlur', // Validate on blur for better UX
  });

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (emailDebounceTimer.current) {
        clearTimeout(emailDebounceTimer.current);
      }
      if (contactDebounceTimer.current) {
        clearTimeout(contactDebounceTimer.current);
      }
      if (emailNoticeTimer.current) {
        clearTimeout(emailNoticeTimer.current);
      }
      if (contactNoticeTimer.current) {
        clearTimeout(contactNoticeTimer.current);
      }
      if (passwordNoticeTimer.current) {
        clearTimeout(passwordNoticeTimer.current);
      }
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('profileImage', file);
    }
  };

  const removeImage = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
    form.setValue('profileImage', undefined);
  };

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      // Store signup data in sessionStorage temporarily
      sessionStorage.setItem('verificationEmail', data.email);
      sessionStorage.setItem('signupData', JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        contactNo: data.contactNo,
        hasProfileImage: !!profileImageFile,
        isAdmin: isAdmin || false,
        adminCode: adminCode || null,
      }));

      // Upload profile image if provided
      let imageUrl = null;
      if (profileImageFile) {
        const formData = new FormData();
        formData.append('file', profileImageFile);
        formData.append('email', data.email);

        const uploadResponse = await fetch('/api/upload-profile', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload profile image');
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
        sessionStorage.setItem('profileImageUrl', imageUrl);
      }

      const resendResponse = await fetch('/api/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'verification',
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          contactNo: data.contactNo,
          profileImageUrl: imageUrl,
          isAdmin: isAdmin,
          adminCode: adminCode, // Pass validated admin code for new admin signup
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        throw new Error(errorData.error || 'Failed to send verification email');
      }

      router.push('/auth/verify');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'An error occurred during signup'
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
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="you@example.com" 
                      {...field}
                      onBlur={async () => {
                        field.onBlur();
                        if (field.value) {
                          const result = await validateEmailAsync(field.value);
                          if (result !== true) {
                            form.setError('email', { message: result });
                            // Show transient notice for 5s
                            setEmailNotice(String(result));
                            if (emailNoticeTimer.current) clearTimeout(emailNoticeTimer.current);
                            emailNoticeTimer.current = setTimeout(() => setEmailNotice(null), 5000);
                          } else {
                            form.clearErrors('email');
                            setEmailNotice(null);
                          }
                        }
                      }}
                      onChange={(e) => {
                        field.onChange(e);
                        // Clear errors while typing
                        if (form.formState.errors.email?.message?.includes('already exists')) {
                          form.clearErrors('email');
                        }
                        // Clear transient notice immediately on typing
                        if (emailNotice) {
                          setEmailNotice(null);
                          if (emailNoticeTimer.current) clearTimeout(emailNoticeTimer.current);
                        }
                      }}
                    />
                    {isCheckingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
                {emailNotice && (
                  <div className="text-xs text-red-600 mt-1">{emailNotice}</div>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Number</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="+1 234 567 8900" 
                      {...field}
                      onBlur={async () => {
                        field.onBlur();
                        if (field.value && field.value.length >= 10) {
                          const result = await validateContactNoAsync(field.value);
                          if (result !== true) {
                            form.setError('contactNo', { message: result });
                            // Show transient notice for 5s
                            setContactNotice(String(result));
                            if (contactNoticeTimer.current) clearTimeout(contactNoticeTimer.current);
                            contactNoticeTimer.current = setTimeout(() => setContactNotice(null), 5000);
                          } else {
                            form.clearErrors('contactNo');
                            setContactNotice(null);
                          }
                        }
                      }}
                      onChange={(e) => {
                        field.onChange(e);
                        // Clear errors while typing
                        if (form.formState.errors.contactNo?.message?.includes('already exists')) {
                          form.clearErrors('contactNo');
                        }
                        // Clear transient notice immediately on typing
                        if (contactNotice) {
                          setContactNotice(null);
                          if (contactNoticeTimer.current) clearTimeout(contactNoticeTimer.current);
                        }
                      }}
                    />
                    {isCheckingContact && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
                {contactNotice && (
                  <div className="text-xs text-red-600 mt-1">{contactNotice}</div>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="profileImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile Image (Optional)</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    {profileImagePreview ? (
                      <div className="relative inline-block">
                        <img
                          src={profileImagePreview}
                          alt="Profile preview"
                          className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>
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

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...field}
                      className="pr-10"
                      onBlur={() => {
                        field.onBlur();
                        const pwd = form.getValues('password');
                        const cpwd = form.getValues('confirmPassword');
                        // Only show notice if both fields have values
                        if (pwd && cpwd) {
                          // Clear any existing notice/timer first
                          if (passwordNoticeTimer.current) clearTimeout(passwordNoticeTimer.current);
                          if (pwd === cpwd) {
                            setPasswordNotice({ type: 'success', text: 'Passwords match' });
                          } else {
                            setPasswordNotice({ type: 'error', text: 'Passwords do not match' });
                          }
                          passwordNoticeTimer.current = setTimeout(() => setPasswordNotice(null), 3000);
                        }
                      }}
                      onChange={(e) => {
                        field.onChange(e);
                        // Remove any existing notice immediately when typing
                        if (passwordNotice) {
                          setPasswordNotice(null);
                          if (passwordNoticeTimer.current) clearTimeout(passwordNoticeTimer.current);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
                {passwordNotice && (
                  <div className={`text-xs mt-1 ${passwordNotice.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordNotice.text}
                  </div>
                )}
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
