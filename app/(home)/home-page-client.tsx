'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Car, Shield, Clock, Star, User, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HomePageClientProps {
  initialRole: string | null;
}

export function HomePageClient({ initialRole }: HomePageClientProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(initialRole);
  const [showRoleSelection, setShowRoleSelection] = useState(!initialRole);
  const [showAdminCodeInput, setShowAdminCodeInput] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminCodeError, setAdminCodeError] = useState<string | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  

  useEffect(() => {
    // Sync with cookie when role changes
    if (selectedRole) {
      document.cookie = `userRole=${selectedRole}; path=/; max-age=31536000`; // 1 year
    }
  }, [selectedRole]);

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
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"
                    >
                      <Sparkles className="h-8 w-8 text-primary" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-2">Welcome to CarWash</h2>
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
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5 pt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Premium Car Care Services</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Keep Your Car Shining
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Like New
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Professional car wash and detailing services tailored to your needs. 
              Book your appointment today and experience the difference.
            </p>
            
            {/* Show different buttons based on role - SSR rendered */}
            {selectedRole === 'user' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button size="lg" className="text-base px-8">
                  Location
                </Button>
                <Button variant="outline" size="lg" className="text-base px-8">
                  Book Now
                </Button>
              </motion.div>
            ) : selectedRole === 'admin' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/auth/signup?role=admin">
                  <Button size="lg" className="text-base px-8">
                    Get Started
                  </Button>
                </Link>
                <Link href="/auth/login?role=admin">
                  <Button variant="outline" size="lg" className="text-base px-8">
                    Sign In
                  </Button>
                </Link>
              </motion.div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose Us?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We provide top-notch car care services with attention to detail
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Premium Service</h3>
              <p className="text-muted-foreground text-sm">
                Professional-grade equipment and premium products for the best results
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Quality Guaranteed</h3>
              <p className="text-muted-foreground text-sm">
                We stand behind our work with a satisfaction guarantee
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Fast & Efficient</h3>
              <p className="text-muted-foreground text-sm">
                Quick service without compromising on quality
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Expert Team</h3>
              <p className="text-muted-foreground text-sm">
                Trained professionals with years of experience
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview Section */}
      <section id="services" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Comprehensive car care solutions for every need
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-lg border border-border bg-card">
              <h3 className="font-semibold text-xl mb-3">Basic Wash</h3>
              <p className="text-muted-foreground mb-4">
                Exterior wash and dry, tire cleaning, and window cleaning
              </p>
              <div className="text-2xl font-bold text-primary">$15</div>
            </div>
            
            <div className="p-8 rounded-lg border border-border bg-card">
              <h3 className="font-semibold text-xl mb-3">Premium Wash</h3>
              <p className="text-muted-foreground mb-4">
                Full exterior wash, interior vacuum, dashboard cleaning, and tire shine
              </p>
              <div className="text-2xl font-bold text-primary">$35</div>
            </div>
            
            <div className="p-8 rounded-lg border border-border bg-card">
              <h3 className="font-semibold text-xl mb-3">Full Detail</h3>
              <p className="text-muted-foreground mb-4">
                Complete interior and exterior detailing, waxing, and polish
              </p>
              <div className="text-2xl font-bold text-primary">$75</div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link href="/services">
              <Button variant="outline" size="lg">
                View All Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Preview Section */}
      <section id="about" className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">About CarWash</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              We've been serving the community with professional car care services for over a decade. 
              Our mission is to provide exceptional service that keeps your vehicle looking its best 
              while protecting your investment.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              From quick washes to full detailing services, we offer solutions tailored to your needs 
              and schedule. Book your appointment today and experience the CarWash difference.
            </p>
            <Link href="/about">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {selectedRole === 'user' && (
        <section className="py-20 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground text-lg mb-8">
                Join thousands of satisfied customers and book your appointment today
              </p>
              <Button size="lg" className="text-base px-8">
                Book Now
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Contact Preview Section */}
      <section id="contact" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Get In Touch</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Have questions? We're here to help!
            </p>
            <div className="space-y-4 mb-8">
              <p className="text-muted-foreground">Email: info@carwash.com</p>
              <p className="text-muted-foreground">Phone: +1 (555) 123-4567</p>
              <p className="text-muted-foreground">Hours: Monday - Saturday, 8AM - 6PM</p>
            </div>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
