'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Car, Shield, Clock, Star, User, ShieldCheck, Loader2, Droplet, Sparkles as SparklesIcon, CheckCircle2, MapPin, Phone, Mail, Calendar, Award, Zap, Users, ListOrdered, RefreshCw, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

interface HomePageClientProps {
  initialRole: string | null;
}

interface QueueEntry {
  id: string;
  queue_number: number;
  status: string;
  service_type: string;
  created_at?: string;
  customer?: {
    id: string;
    name: string;
  } | null;
  worker?: {
    id: string;
    name: string;
  } | null;
}

export function HomePageClient({ initialRole }: HomePageClientProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(initialRole);
  const [showRoleSelection, setShowRoleSelection] = useState(!initialRole);
  const [showAdminCodeInput, setShowAdminCodeInput] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminCodeError, setAdminCodeError] = useState<string | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true); // Track if this is the first load
  
  // Service booking modal state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{ name: string; price: string; features: string[] } | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<string>('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    contactNo: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Reset booking form state when modal closes
  useEffect(() => {
    if (!isServiceModalOpen) {
      setBookingConfirmation('');
      setShowBookingForm(false);
      setSubmitError(null);
      setSubmitSuccess(false);
      setBookingForm({ name: '', contactNo: '', description: '' });
    }
  }, [isServiceModalOpen]);

  useEffect(() => {
    // Sync with cookie when role changes
    if (selectedRole) {
      document.cookie = `userRole=${selectedRole}; path=/; max-age=31536000`; // 1 year
    }
  }, [selectedRole]);

  // Check authentication status for admin
  useEffect(() => {
    const checkAuth = async () => {
      if (selectedRole === 'admin') {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          setIsAdminLoggedIn(!!session?.user);
        } catch (error) {
          console.error('Error checking auth:', error);
          setIsAdminLoggedIn(false);
        } finally {
          setIsCheckingAuth(false);
        }
      } else {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (selectedRole === 'admin') {
        setIsAdminLoggedIn(!!session?.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedRole]);

  const queueEntriesRef = useRef<QueueEntry[]>([]); // Use ref to avoid dependency issues

  const fetchQueue = useCallback(async (showLoading = false) => {
    try {
      // Only show loading state on initial load or manual refresh
      if (showLoading || isInitialLoadRef.current) {
        setIsInitialLoading(true);
      }
      
      // Add timestamp to prevent browser caching and force fresh data
      const timestamp = Date.now();
      const response = await fetch(`/api/queue/public?t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.queue !== undefined) {
        const newQueue = Array.isArray(data.queue) ? data.queue : [];
        // Deep clone to ensure React sees it as new data reference
        const queueClone = JSON.parse(JSON.stringify(newQueue));
        
        // Check if data actually changed using ref
        const currentQueueStr = JSON.stringify(queueEntriesRef.current);
        const newQueueStr = JSON.stringify(queueClone);
        
        if (currentQueueStr !== newQueueStr) {
          // Data changed - update both state and ref smoothly
          queueEntriesRef.current = queueClone;
          setQueueEntries(queueClone); // This triggers re-render
          console.log('✅ Home Queue UI updated at', new Date().toLocaleTimeString(), '- Entries:', newQueue.length);
        } else {
          console.log('ℹ️ Home: Queue data unchanged, skipping UI update');
        }
        
        // Log error if present in response
        if (data.error) {
          console.error('Queue API error:', data.error);
        }
      } else {
        console.warn('No queue data in response:', data);
        queueEntriesRef.current = [];
        setQueueEntries([]);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      queueEntriesRef.current = [];
      setQueueEntries([]);
    } finally {
      // Always reset loading state when it was set
      if (showLoading || isInitialLoadRef.current) {
        setIsInitialLoading(false);
      }
      // Mark initial load as complete
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    }
  }, []); // No dependencies - stable function

  // Fetch queue entries
  useEffect(() => {
    // Initial fetch with loading state
    fetchQueue(true);
    
    // Auto-refresh every 10 seconds to catch backend updates (backend refreshes every 15s)
    // No loading state on auto-refresh to prevent flickering
    intervalRef.current = setInterval(() => {
      fetchQueue(false); // Silent refresh - no loading state
    }, 10000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - fetchQueue is stable via useCallback
  
  // Update ref when state changes
  useEffect(() => {
    queueEntriesRef.current = queueEntries;
  }, [queueEntries]);

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'wash': 'Basic Wash',
      'detailing': 'Detailing',
      'wax': 'Wax',
      'interior': 'Interior Clean',
      'full_service': 'Full Service'
    };
    return labels[type] || type;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${month} ${day} ${year}, ${time}`;
  };

  const handleRoleSelect = (role: 'user' | 'admin') => {
    if (role === 'user') {
      // User selected - close modal immediately
      setSelectedRole('user');
      sessionStorage.setItem('userRole', 'user');
      document.cookie = `userRole=user; path=/; max-age=31536000`;
      setShowRoleSelection(false);
      window.dispatchEvent(new Event('roleChanged'));
    } else if (role === 'admin') {
      // Admin selected - show code input field
      setShowAdminCodeInput(true);
    }
  };

  const handleAdminCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCodeError(null);

    if (!adminCode.trim()) {
      setAdminCodeError('Please enter an admin code');
      return;
    }

    setIsValidatingCode(true);

    try {
      const response = await fetch('/api/validate-admin-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: adminCode.trim().toUpperCase(),
          mode: 'signup' // For signup flow
        }),
      });

      const data = await response.json();

      if (data.valid) {
        // Code is valid - proceed with admin role
        // If recovery code was used, use the returned admin code
        const codeToStore = data.adminCode || adminCode.trim().toUpperCase();
        setSelectedRole('admin');
        sessionStorage.setItem('userRole', 'admin');
        sessionStorage.setItem('adminCode', codeToStore);
        document.cookie = `userRole=admin; path=/; max-age=31536000`;
        setShowRoleSelection(false);
        setShowAdminCodeInput(false);
        window.dispatchEvent(new Event('roleChanged'));
      } else {
        setAdminCodeError(data.error || 'Invalid admin code');
      }
    } catch (err) {
      setAdminCodeError('Failed to validate code. Please try again.');
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleBackToRoleSelection = () => {
    setShowAdminCodeInput(false);
    setAdminCode('');
    setAdminCodeError(null);
  };

  return (
    <>
      {/* Role Selection Modal */}
      <AnimatePresence>
        {showRoleSelection && !selectedRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {/* Enhanced blurry backdrop */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-lg" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md z-10"
            >
              <Card className="border-2 shadow-2xl backdrop-blur-xl bg-card/95">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 mb-4"
                    >
                      <Droplet className="h-8 w-8 text-blue-500 fill-blue-500/20" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-2">Welcome to AquaVance</h2>
                    <p className="text-muted-foreground">
                      {showAdminCodeInput 
                        ? 'Enter your admin code to continue'
                        : 'Please select your role to continue'
                      }
                    </p>
                  </div>

                  {!showAdminCodeInput ? (
                    /* Role Selection Buttons */
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="role-selection"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 gap-4"
                      >
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleRoleSelect('user')}
                          className="p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg mb-1">User</h3>
                              <p className="text-sm text-muted-foreground">
                                Customer looking for car wash services
                              </p>
                            </div>
                          </div>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleRoleSelect('admin')}
                          className="p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                              <ShieldCheck className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg mb-1">Admin</h3>
                              <p className="text-sm text-muted-foreground">
                                Administrator managing the system
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    /* Admin Code Input */
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={'admin-code-input'}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <form onSubmit={handleAdminCodeSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="adminCode">Admin Code</Label>
                              <Input
                                id="adminCode"
                                type="text"
                                placeholder="ACW_123456"
                                value={adminCode}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  setAdminCode(e.target.value.toUpperCase());
                                  setAdminCodeError(null);
                                }}
                                className="font-mono"
                                disabled={isValidatingCode}
                                autoFocus
                              />
                              <p className="text-sm text-muted-foreground">
                                Enter an admin code to verify your admin access
                              </p>
                            </div>

                            {adminCodeError && (
                              <Alert variant="destructive">
                                <AlertDescription>{adminCodeError}</AlertDescription>
                              </Alert>
                            )}

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleBackToRoleSelection}
                                className="flex-1"
                                disabled={isValidatingCode}
                              >
                                Back
                              </Button>
                              <Button
                                type="submit"
                                className="flex-1"
                                disabled={isValidatingCode || !adminCode.trim()}
                              >
                                {isValidatingCode ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Validating...
                                  </>
                                ) : (
                                  'Verify & Continue'
                                )}
                              </Button>
                            </div>
                        </form>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-16">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left side - Content */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center md:text-left"
              >
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 animate-pulse">
                  <Droplet className="h-4 w-4 fill-current" />
                  <span className="text-sm font-medium">Professional Car Care</span>
            </div>
            
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-500 bg-clip-text text-transparent">
                    Shine Bright,
                  </span>
              <br />
                  <span className="text-foreground">
                    Drive Proud
              </span>
            </h1>
            
                <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Experience premium car wash and detailing services that keep your vehicle looking 
                  showroom-ready. Professional care, eco-friendly solutions, and exceptional results.
                </p>
                
                {/* Stats */}
                <div className="flex flex-wrap gap-6 mb-8 justify-center md:justify-start">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">10K+ Happy Customers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold">4.9/5 Rating</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">5+ Years Experience</span>
                  </div>
                </div>
                
                {/* CTA Buttons */}
            {selectedRole === 'user' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center gap-4"
              >
                    <Button size="lg" className="text-base px-8 py-6 text-lg w-full sm:w-auto">
                      <Calendar className="mr-2 h-5 w-5" />
                      Book Appointment
                </Button>
                    <Button variant="outline" size="lg" className="text-base px-8 py-6 text-lg w-full sm:w-auto">
                      <MapPin className="mr-2 h-5 w-5" />
                      Find Location
                </Button>
              </motion.div>
            ) : selectedRole === 'admin' ? (
              !isCheckingAuth && (
                isAdminLoggedIn ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center gap-4"
                  >
                    <Link href="/dashboard">
                      <Button size="lg" className="text-base px-8 py-6 text-lg w-full sm:w-auto">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center gap-4"
                  >
                    <Link href="/auth/signup?role=admin">
                      <Button size="lg" className="text-base px-8 py-6 text-lg w-full sm:w-auto">
                        Get Started
                      </Button>
                    </Link>
                    <Link href="/auth/login?role=admin">
                      <Button variant="outline" size="lg" className="text-base px-8 py-6 text-lg w-full sm:w-auto">
                        Sign In
                      </Button>
                    </Link>
                  </motion.div>
                )
              )
            ) : null}
              </motion.div>
              
              {/* Right side - Visual */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative hidden md:block"
              >
                <div className="relative w-full h-[500px] md:h-[600px] lg:h-[650px]">
                  {/* Image container with overlay */}
                  <div className="relative w-full h-full rounded-3xl overflow-visible">
                    {/* Glow effect - outside container so it shows around image */}
                    <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-400/40 via-cyan-400/30 to-blue-500/40 blur-3xl animate-pulse"></div>
                    <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-blue-500/30 via-cyan-400/20 to-blue-400/30 blur-xl"></div>
                    
                    {/* Hero car washing image - local image with drop shadow on car only */}
                    <div className="relative w-full h-full flex items-center justify-center" style={{ overflow: 'visible' }}>
                      <div 
                        className="relative inline-block"
                        style={{
                          filter: 'drop-shadow(0 25px 50px rgba(59, 130, 246, 0.5)) drop-shadow(0 15px 30px rgba(6, 182, 212, 0.4)) drop-shadow(0 8px 16px rgba(59, 130, 246, 0.3))',
                          maxWidth: '90%',
                          maxHeight: '90%'
                        }}
                      >
                        <img
                          src="/herocar.png"
                          alt="Professional car washing service"
                          className="w-auto h-auto max-w-full max-h-full block"
                          style={{
                            width: 'auto',
                            height: 'auto',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Gradient overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent z-[1]"></div>
                    
                    {/* Floating decorative elements */}
                    <motion.div
                      animate={{ y: [0, -20, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute top-10 right-10 z-10"
                    >
                      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                        <Droplet className="h-8 w-8 text-blue-500" />
                      </div>
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, 20, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute bottom-10 left-10 z-10"
                    >
                      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                        <SparklesIcon className="h-8 w-8 text-cyan-500" />
                      </div>
                    </motion.div>
                    
                    {/* Badge overlay */}
                    <div className="absolute bottom-6 left-6 right-6 z-20">
                      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl p-4 shadow-xl">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">Professional Service</div>
                            <div className="text-xs text-muted-foreground">Trusted by 10K+ customers</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
                Why Choose <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">AquaVance?</span>
              </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Experience the difference with our premium car care solutions
            </p>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Droplet,
                title: 'Eco-Friendly',
                description: '100% biodegradable products that protect your car and the environment',
                color: 'text-blue-500',
                bgColor: 'bg-blue-500/10'
              },
              {
                icon: Shield,
                title: 'Quality Guaranteed',
                description: 'Satisfaction guarantee with professional-grade equipment and products',
                color: 'text-green-500',
                bgColor: 'bg-green-500/10'
              },
              {
                icon: Zap,
                title: 'Fast Service',
                description: 'Quick turnaround without compromising on quality or attention to detail',
                color: 'text-yellow-500',
                bgColor: 'bg-yellow-500/10'
              },
              {
                icon: Star,
                title: 'Expert Team',
                description: 'Certified professionals with years of experience and training',
                color: 'text-purple-500',
                bgColor: 'bg-purple-500/10'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group relative p-8 rounded-2xl border border-border/50 bg-card hover:border-primary/50 hover:shadow-xl transition-all duration-300"
              >
                <div className={`p-4 ${feature.bgColor} rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`h-7 w-7 ${feature.color}`} />
              </div>
                <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview Section / Subscription Cards for Admin */}
      <section id="services" className="py-24 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {selectedRole === 'admin' ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
                  Choose Your <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Subscription</span>
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Select the perfect plan to manage your car wash business efficiently
                </p>
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {(() => {
                  const { PLAN_DESCRIPTIONS } = require('@/lib/utils/plan-descriptions');
                  return [
                    {
                      name: PLAN_DESCRIPTIONS.starter.name,
                      price: `$${PLAN_DESCRIPTIONS.starter.price}`,
                      period: `/${PLAN_DESCRIPTIONS.starter.period}`,
                      features: PLAN_DESCRIPTIONS.starter.features,
                      popular: false,
                      gradient: 'from-gray-500 to-gray-600',
                      icon: Shield
                    },
                    {
                      name: PLAN_DESCRIPTIONS.professional.name,
                      price: `$${PLAN_DESCRIPTIONS.professional.price}`,
                      period: `/${PLAN_DESCRIPTIONS.professional.period}`,
                      features: PLAN_DESCRIPTIONS.professional.features,
                      popular: true,
                      gradient: 'from-blue-500 to-cyan-500',
                      icon: Zap
                    },
                    {
                      name: PLAN_DESCRIPTIONS.enterprise.name,
                      price: `$${PLAN_DESCRIPTIONS.enterprise.price}`,
                      period: `/${PLAN_DESCRIPTIONS.enterprise.period}`,
                      features: PLAN_DESCRIPTIONS.enterprise.features,
                      popular: false,
                      gradient: 'from-purple-500 to-pink-500',
                      icon: Award
                    }
                  ];
                })().map((subscription, index) => {
                  const IconComponent = subscription.icon;
                  return (
                    <motion.div
                      key={subscription.name}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      className={`relative p-8 rounded-2xl border-2 flex flex-col h-full ${
                        subscription.popular 
                          ? 'border-primary shadow-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20' 
                          : 'border-border bg-card hover:border-primary/50'
                      } transition-all duration-300`}
                    >
                      {subscription.popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                            MOST POPULAR
                          </span>
                        </div>
                      )}
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${subscription.gradient} mb-6`}>
                        <IconComponent className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-bold text-2xl mb-2">{subscription.name}</h3>
                      <div className="mb-6 flex items-baseline">
                        <span className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                          {subscription.price}
                        </span>
                        <span className="text-muted-foreground ml-2">{subscription.period}</span>
                      </div>
                      <ul className="space-y-3 mb-8 flex-grow">
                        {subscription.features.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className={`w-full mt-auto ${subscription.popular ? '' : 'variant-outline'}`}
                        variant={subscription.popular ? 'default' : 'outline'}
                        onClick={async () => {
                          try {
                            // Map plan names to plan types
                            const planTypeMap: Record<string, 'starter' | 'professional' | 'enterprise'> = {
                              'Starter': 'starter',
                              'Professional': 'professional',
                              'Enterprise': 'enterprise'
                            };
                            
                            const planType = planTypeMap[subscription.name];
                            if (!planType) {
                              alert('Invalid plan selected');
                              return;
                            }

                            // Check if user is authenticated
                            const supabase = createClient();
                            const { data: { session } } = await supabase.auth.getSession();
                            
                            if (!session?.user) {
                              // Not logged in - store plan and redirect to login
                              sessionStorage.setItem('selectedPlan', planType);
                              window.location.href = `/auth/login?role=admin&plan=${planType}&redirect=checkout`;
                              return;
                            }

                            // User is logged in, go directly to checkout
                            const response = await fetch('/api/subscriptions/create-checkout', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ planType }),
                            });

                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.error || 'Failed to create checkout session');
                            }

                            const { checkoutUrl } = await response.json();
                            
                            // Redirect to Stripe Checkout
                            if (checkoutUrl) {
                              window.location.href = checkoutUrl;
                            } else {
                              alert('Failed to create checkout session');
                            }
                          } catch (err) {
                            console.error('Error creating checkout:', err);
                            alert(err instanceof Error ? err.message : 'Failed to start checkout');
                          }
                        }}
                      >
                        {subscription.popular ? 'Get Started' : 'Choose Plan'}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
                  Our <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Services</span>
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Comprehensive car care solutions tailored to your needs and budget
                </p>
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {[
                  {
                    name: 'Basic Wash',
                    price: '$15',
                    features: ['Exterior wash & dry', 'Tire cleaning', 'Window cleaning', 'Quick vacuum'],
                    popular: false,
                    gradient: 'from-gray-500 to-gray-600'
                  },
                  {
                    name: 'Premium Wash',
                    price: '$35',
                    features: ['Full exterior wash', 'Interior vacuum', 'Dashboard cleaning', 'Tire shine', 'Door jamb clean'],
                    popular: true,
                    gradient: 'from-blue-500 to-cyan-500'
                  },
                  {
                    name: 'Full Detail',
                    price: '$75',
                    features: ['Complete interior detail', 'Exterior wax & polish', 'Engine bay clean', 'Leather conditioning', 'Carpet shampoo'],
                    popular: false,
                    gradient: 'from-purple-500 to-pink-500'
                  }
                ].map((service, index) => (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className={`relative p-8 rounded-2xl border-2 flex flex-col h-full ${
                      service.popular 
                        ? 'border-primary shadow-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20' 
                        : 'border-border bg-card hover:border-primary/50'
                    } transition-all duration-300`}
                  >
                    {service.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                          MOST POPULAR
                        </span>
                      </div>
                    )}
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${service.gradient} mb-6`}>
                      <Car className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-2xl mb-2">{service.name}</h3>
                    <div className="mb-6">
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                        {service.price}
                      </span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-grow">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full mt-auto ${service.popular ? '' : 'variant-outline'}`}
                      variant={service.popular ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedService(service);
                        setIsServiceModalOpen(true);
                        setBookingConfirmation('');
                        setShowBookingForm(false);
                        setSubmitError(null);
                        setSubmitSuccess(false);
                        setBookingForm({ name: '', contactNo: '', description: '' });
                      }}
                    >
                      Select Service
                    </Button>
                  </motion.div>
                ))}
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <Link href="/services">
                  <Button variant="outline" size="lg" className="text-base px-8">
                    View All Services
                  </Button>
                </Link>
              </motion.div>
            </>
          )}
        </div>
      </section>

      {/* Live Queue System Section */}
      <section id="queue" className="py-24 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <ListOrdered className="h-4 w-4" />
              <span className="text-sm font-medium">Live Queue System</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
              Current <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Queue</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
              View real-time queue status and see where your vehicle stands
            </p>
            <Link href="/queue">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
                <ListOrdered className="mr-2 h-5 w-5" />
                View Full Queue System
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-5xl mx-auto"
          >
            <Card className="border-2 shadow-2xl backdrop-blur-xl bg-card/95 overflow-hidden">
              <CardContent className="p-0">
                {/* Header with refresh button */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <ListOrdered className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Active Queue</h3>
                      <p className="text-blue-100 text-sm">
                        {isInitialLoading ? 'Loading...' : `${queueEntries.length} ${queueEntries.length === 1 ? 'vehicle' : 'vehicles'} in queue`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchQueue(true)}
                    disabled={isInitialLoading}
                    className="text-white hover:bg-white/20"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isInitialLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {/* Queue List */}
                {isInitialLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : queueEntries.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                      <ListOrdered className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h4 className="text-xl font-semibold mb-2">Queue is Empty</h4>
                    <p className="text-muted-foreground">
                      No vehicles currently in the queue
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b border-border">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Queue #
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Customer
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Service
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                              Worker
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                              Time
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                    {queueEntries.map((entry, index) => (
                            <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className={`hover:bg-muted/30 transition-colors ${
                                entry.status === 'washing' 
                                  ? 'bg-blue-50/30 dark:bg-blue-950/10 border-l-4 border-l-blue-500' 
                                  : 'border-l-4 border-l-yellow-500'
                              }`}
                            >
                              {/* Queue Number */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg font-bold text-base shadow-md transition-transform hover:scale-105 ${
                              entry.status === 'washing' 
                                ? 'bg-blue-500 text-white' 
                                : entry.status === 'waiting'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-muted text-foreground'
                            }`}>
                              #{entry.queue_number}
                            </div>
                              </td>
                              
                              {/* Customer */}
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1">
                                  <div className="font-semibold text-sm text-foreground">
                                {entry.customer?.name || 'Customer'}
                                  </div>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono border border-border/50 inline-block w-fit">
                                    {entry.id.substring(0, 8).toUpperCase()}
                                </span>
                              </div>
                              </td>
                              
                              {/* Service */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-medium">{getServiceTypeLabel(entry.service_type)}</span>
                            </div>
                              </td>
                              
                              {/* Worker */}
                              <td className="px-4 py-3 hidden sm:table-cell">
                                {entry.worker ? (
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <User className="h-3.5 w-3.5" />
                                    <span>{entry.worker.name}</span>
                          </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </td>
                              
                              {/* Time */}
                              <td className="px-4 py-3 hidden md:table-cell">
                                {entry.created_at ? (
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{formatDateTime(entry.created_at)}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </td>
                              
                              {/* Status */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                              entry.status === 'washing'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700'
                            }`}>
                              {entry.status === 'washing' && (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              )}
                              {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                            </span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Footer info */}
                <div className="bg-muted/50 p-4 border-t border-border">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-center text-muted-foreground flex-1">
                      <Clock className="inline h-3 w-3 mr-1" />
                      Queue updates automatically every 30 seconds
                    </p>
                    <Link href="/queue">
                      <Button variant="outline" size="sm">
                        View Full Queue
                        <ListOrdered className="ml-2 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* About Preview Section */}
      <section id="about" className="py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                <Award className="h-4 w-4" />
                <span className="text-sm font-medium">Established 2018</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold mb-6">
                About <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">AquaVance</span>
              </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              We've been serving the community with professional car care services for over a decade. 
              Our mission is to provide exceptional service that keeps your vehicle looking its best 
              while protecting your investment.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              From quick washes to full detailing services, we offer solutions tailored to your needs 
                and schedule. Book your appointment today and experience the AquaVance difference.
            </p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="text-3xl font-bold text-primary mb-1">10K+</div>
                  <div className="text-sm text-muted-foreground">Happy Customers</div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="text-3xl font-bold text-primary mb-1">5+</div>
                  <div className="text-sm text-muted-foreground">Years Experience</div>
                </div>
              </div>
            <Link href="/about">
                <Button variant="outline" size="lg" className="text-base px-8">
                Learn More
              </Button>
            </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative w-full h-[400px] bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 p-8 w-full">
                    <div className="p-6 bg-white/80 dark:bg-gray-800/80 rounded-xl backdrop-blur-sm">
                      <Droplet className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                      <div className="text-center text-sm font-semibold">Eco-Friendly</div>
                    </div>
                    <div className="p-6 bg-white/80 dark:bg-gray-800/80 rounded-xl backdrop-blur-sm">
                      <Star className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
                      <div className="text-center text-sm font-semibold">Premium Quality</div>
                    </div>
                    <div className="p-6 bg-white/80 dark:bg-gray-800/80 rounded-xl backdrop-blur-sm">
                      <Zap className="h-10 w-10 text-orange-500 mx-auto mb-2" />
                      <div className="text-center text-sm font-semibold">Fast Service</div>
                    </div>
                    <div className="p-6 bg-white/80 dark:bg-gray-800/80 rounded-xl backdrop-blur-sm">
                      <Users className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <div className="text-center text-sm font-semibold">Expert Team</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {selectedRole === 'user' && (
        <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,transparent)]"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center"
            >
              <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 text-white">
                Ready to Get Started?
              </h2>
              <p className="text-blue-50 text-lg mb-10 text-lg max-w-2xl mx-auto">
                Join thousands of satisfied customers. Book your appointment today and give your car the shine it deserves!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" variant="secondary" className="text-base px-8 py-6 text-lg bg-white text-blue-600 hover:bg-blue-50">
                  <Calendar className="mr-2 h-5 w-5" />
                  Book Appointment
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8 py-6 text-lg border-2 border-white/30 text-white hover:bg-white/10">
                  View Packages
              </Button>
            </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Contact Preview Section */}
      <section id="contact" className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
                Get In <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Touch</span>
              </h2>
              <p className="text-muted-foreground text-lg">
              Have questions? We're here to help!
            </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                { icon: Mail, label: 'Email', value: 'info@aquavance.com', link: 'mailto:info@aquavance.com' },
                { icon: Phone, label: 'Phone', value: '+1 (555) 123-4567', link: 'tel:+15551234567' },
                { icon: MapPin, label: 'Location', value: '123 Car Wash St', link: '#' }
              ].map((contact, index) => (
                <motion.a
                  key={contact.label}
                  href={contact.link}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group p-8 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-lg transition-all text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 group-hover:bg-primary/20 mb-4 transition-colors">
                    <contact.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{contact.label}</h3>
                  <p className="text-muted-foreground group-hover:text-primary transition-colors">
                    {contact.value}
                  </p>
                </motion.a>
              ))}
            </div>
            
            <div className="bg-muted/50 rounded-2xl p-8 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">Operating Hours</h3>
              <p className="text-muted-foreground">Monday - Saturday: 8:00 AM - 6:00 PM</p>
              <p className="text-muted-foreground">Sunday: 10:00 AM - 4:00 PM</p>
            </div>
            
            <div className="text-center mt-12">
            <Link href="/contact">
                <Button variant="outline" size="lg" className="text-base px-8">
                Contact Us
              </Button>
            </Link>
          </div>
          </motion.div>
        </div>
      </section>

      {/* Service Booking Modal */}
      <Dialog 
        open={isServiceModalOpen} 
        onOpenChange={(open) => {
          setIsServiceModalOpen(open);
          if (!open) {
            // Reset form state when modal closes
            setBookingForm({ name: '', contactNo: '', description: '' });
            setBookingConfirmation('');
            setShowBookingForm(false);
            setSubmitError(null);
            setSubmitSuccess(false);
          }
        }}
      >
        <AnimatePresence>
          {isServiceModalOpen && selectedService && (
            <DialogContent className="sm:max-w-[500px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <DialogHeader>
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 mb-2"
                  >
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${
                      selectedService.name === 'Basic Wash' ? 'from-gray-500 to-gray-600' :
                      selectedService.name === 'Premium Wash' ? 'from-blue-500 to-cyan-500' :
                      'from-purple-500 to-pink-500'
                    }`}>
                      <Car className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold">
                        {selectedService.name}
                      </DialogTitle>
                      <DialogDescription className="text-lg mt-1">
                        <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                          {selectedService.price}
                        </span>
                      </DialogDescription>
                    </div>
                  </motion.div>
                </DialogHeader>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4 py-4"
                >
                  {/* Service Features */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-sm">Service Includes:</h4>
                    <ul className="space-y-1.5">
                      {selectedService.features.map((feature, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.3 + idx * 0.05 }}
                          className="flex items-start text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          {feature}
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  {/* Confirmation Step */}
                  {!showBookingForm && (
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-4"
                    >
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
                        <h3 className="text-lg font-semibold mb-4">Do you want to book this service?</h3>
                        <div className="space-y-3">
                          <Label htmlFor="bookingConfirmation" className="text-base font-medium">
                            Select your choice:
                          </Label>
                          <select
                            id="bookingConfirmation"
                            value={bookingConfirmation || ''}
                            onChange={(e) => {
                              const selectedValue = e.target.value;
                              setBookingConfirmation(selectedValue);
                              
                              if (selectedValue === 'yes') {
                                setTimeout(() => setShowBookingForm(true), 300);
                              } else if (selectedValue === 'no') {
                                // Auto-close modal when "No" is selected with smooth animation
                                // Dialog animation duration is 200ms, so we wait a bit for visual feedback
                                setTimeout(() => {
                                  setIsServiceModalOpen(false);
                                }, 200);
                              }
                            }}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">-- Select --</option>
                            <option value="yes">Yes, I want to book</option>
                            <option value="no">No, cancel</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Form Fields - Only show if Yes is selected */}
                  {showBookingForm && (
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="space-y-4"
                    >
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Label htmlFor="name">
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={bookingForm.name}
                        onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                        disabled={isSubmitting}
                        className="mt-1"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.45 }}
                    >
                      <Label htmlFor="contactNo">
                        Contact Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="contactNo"
                        type="tel"
                        placeholder="Enter your contact number"
                        value={bookingForm.contactNo}
                        onChange={(e) => setBookingForm({ ...bookingForm, contactNo: e.target.value })}
                        disabled={isSubmitting}
                        className="mt-1"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Label htmlFor="description">
                        Description <span className="text-muted-foreground text-xs">(Optional)</span>
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Any special requests or additional details..."
                        value={bookingForm.description}
                        onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                        disabled={isSubmitting}
                        className="mt-1 min-h-[100px]"
                        rows={4}
                      />
                    </motion.div>
                    </motion.div>
                  )}

                  {/* Error/Success Messages */}
                  <AnimatePresence>
                    {submitError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <Alert variant="destructive">
                          <AlertDescription>{submitError}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                    {submitSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                          <AlertDescription className="text-green-800 dark:text-green-200">
                            Booking request sent successfully! We'll contact you soon.
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <DialogFooter>
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex gap-2 w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsServiceModalOpen(false);
                        setBookingForm({ name: '', contactNo: '', description: '' });
                        setBookingConfirmation('');
                        setShowBookingForm(false);
                        setSubmitError(null);
                        setSubmitSuccess(false);
                      }}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-initial"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    {showBookingForm && (
                      <Button
                        onClick={async () => {
                        if (!bookingForm.name.trim() || !bookingForm.contactNo.trim()) {
                          setSubmitError('Please fill in all required fields');
                          return;
                        }

                        setIsSubmitting(true);
                        setSubmitError(null);
                        setSubmitSuccess(false);

                        try {
                          const response = await fetch('/api/service-booking', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              serviceName: selectedService.name,
                              servicePrice: selectedService.price,
                              serviceFeatures: selectedService.features,
                              customerName: bookingForm.name.trim(),
                              contactNo: bookingForm.contactNo.trim(),
                              description: bookingForm.description.trim() || undefined,
                            }),
                          });

                          const data = await response.json();

                          if (!response.ok) {
                            throw new Error(data.error || 'Failed to send booking request');
                          }

                          setSubmitSuccess(true);
                          setBookingForm({ name: '', contactNo: '', description: '' });

                          // Close modal after 2 seconds
                          setTimeout(() => {
                            setIsServiceModalOpen(false);
                            setSubmitSuccess(false);
                            setBookingConfirmation('');
                            setShowBookingForm(false);
                          }, 2000);
                        } catch (error) {
                          setSubmitError(error instanceof Error ? error.message : 'Failed to send booking request');
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting || !bookingForm.name.trim() || !bookingForm.contactNo.trim()}
                      className="flex-1 sm:flex-initial"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Request
                        </>
                      )}
                      </Button>
                    )}
                    {bookingConfirmation === 'no' && (
                      <Button
                        onClick={() => {
                          setIsServiceModalOpen(false);
                          setBookingForm({ name: '', contactNo: '', description: '' });
                          setBookingConfirmation('');
                          setShowBookingForm(false);
                          setSubmitError(null);
                          setSubmitSuccess(false);
                        }}
                        className="flex-1 sm:flex-initial"
                      >
                        Close
                      </Button>
                    )}
                  </motion.div>
                </DialogFooter>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
    </>
  );
}
