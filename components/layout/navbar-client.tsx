'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { UserMenu } from '@/components/dashboard/user-menu';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { Droplet, MapPin, Calendar, Menu, LogIn, UserPlus } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface NavbarClientProps {
  initialRole: string | null;
}

interface ProfileData {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  email?: string;
  role?: string;
}

export function NavbarClient({ initialRole }: NavbarClientProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(initialRole);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Sync with cookie when role changes
    if (selectedRole) {
      document.cookie = `userRole=${selectedRole}; path=/; max-age=31536000`;
    }

    // Listen for role changes
    const handleRoleChange = () => {
      const role = sessionStorage.getItem('userRole');
      setSelectedRole(role);
    };
    
    window.addEventListener('roleChanged', handleRoleChange);
    
    return () => {
      window.removeEventListener('roleChanged', handleRoleChange);
    };
  }, [selectedRole]);

  // Check authentication status for admin
  useEffect(() => {
    const checkAuth = async () => {
      if (selectedRole === 'admin') {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            setUser(session.user);
            
            // Fetch profile data
            const { data: profileData } = await supabase
              .from('profiles')
              .select('first_name, last_name, avatar_url, email, role')
              .eq('id', session.user.id)
              .single();

            if (profileData) {
              setProfile({
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                avatar_url: profileData.avatar_url,
                email: profileData.email || session.user.email,
                role: profileData.role,
              });
            } else {
              setProfile({
                email: session.user.email,
              });
            }
          }
        } catch (error) {
          console.error('Error checking auth:', error);
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
        if (session?.user) {
          setUser(session.user);
          // Fetch profile again
          checkAuth();
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedRole]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      router.push('/auth/login?role=admin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Render buttons based on role and auth status
  const renderButtons = (isMobile = false) => {
    if (isCheckingAuth && selectedRole === 'admin') {
      return null; // Don't show anything while checking
    }

    if (selectedRole === 'user') {
      const handleLocationClick = (e: React.MouseEvent) => {
        // Check if we're on the home page
        if (window.location.pathname === '/') {
          e.preventDefault();
          // Scroll to contact section on home page
          const locationSection = document.getElementById('contact');
          if (locationSection) {
            locationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        // If on another page, Link will handle navigation to /#contact
      };

      return (
        <>
          <Link href="/#contact" onClick={handleLocationClick}>
            <Button 
              variant="ghost" 
              size={isMobile ? "default" : "sm"} 
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <MapPin className="h-4 w-4" />
              {isMobile && <span>Location</span>}
              {!isMobile && <span className="hidden sm:inline">Location</span>}
            </Button>
          </Link>
          <Link href="/contact">
            <Button size={isMobile ? "default" : "sm"} className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="h-4 w-4" />
              {isMobile && <span>Book Now</span>}
              {!isMobile && <span className="hidden sm:inline">Book Now</span>}
            </Button>
          </Link>
        </>
      );
    } else if (selectedRole === 'admin') {
      // If admin is logged in, show avatar with dropdown
      if (user && profile) {
        return (
          <UserMenu
            user={{
              email: profile.email || user.email,
              firstName: profile.first_name,
              lastName: profile.last_name,
              avatarUrl: profile.avatar_url,
              role: profile.role,
            }}
            onSignOut={handleSignOut}
          />
        );
      }
      // If admin is not logged in, show buttons with text on desktop, icons on mobile
      return (
        <>
          <Link href="/auth/login?role=admin">
            <Button variant="ghost" size={isMobile ? "default" : "sm"} className={isMobile ? "w-full justify-start" : ""} title="Login">
              <LogIn className="h-4 w-4 lg:mr-2" />
              {isMobile ? <span className="ml-2">Login</span> : <span className="hidden lg:inline">Login</span>}
            </Button>
          </Link>
          <Link href="/auth/signup?role=admin">
            <Button size={isMobile ? "default" : "sm"} className={isMobile ? "w-full justify-start" : ""} title="Get Started">
              <UserPlus className="h-4 w-4 lg:mr-2" />
              {isMobile ? <span className="ml-2">Get Started</span> : <span className="hidden lg:inline">Get Started</span>}
            </Button>
          </Link>
        </>
      );
    } else {
      return (
        <>
          <Link href="/auth/login">
            <Button variant="ghost" size={isMobile ? "default" : "sm"} className={isMobile ? "w-full justify-start" : ""}>
              <LogIn className="h-4 w-4 lg:mr-2" />
              {isMobile ? <span className="ml-2">Login</span> : <span className="hidden lg:inline">Login</span>}
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size={isMobile ? "default" : "sm"} className={isMobile ? "w-full justify-start" : ""}>
              <UserPlus className="h-4 w-4 lg:mr-2" />
              {isMobile ? <span className="ml-2">Get Started</span> : <span className="hidden lg:inline">Get Started</span>}
            </Button>
          </Link>
        </>
      );
    }
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '#services', label: 'Services' },
    { href: '#about', label: 'About' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Side - Mobile Menu & Logo */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Mobile Menu Button - Left Side */}
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Main navigation menu with links and actions
                  </SheetDescription>
                  <div className="flex flex-col space-y-6 mt-8">
                    {/* Mobile Navigation Links */}
                    <div className="flex flex-col space-y-4">
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors py-2"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="flex flex-col space-y-3 pt-4 border-t border-border">
                      {selectedRole === 'user' && (
                        <>
                          <Link 
                            href="/#contact" 
                            className="w-full" 
                            onClick={(e) => {
                              setIsMobileMenuOpen(false);
                              // Check if we're on the home page
                              if (window.location.pathname === '/') {
                                e.preventDefault();
                                // Scroll to contact section on home page
                                const locationSection = document.getElementById('contact');
                                if (locationSection) {
                                  locationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }
                              // If on another page, Link will handle navigation to /#contact
                            }}
                          >
                            <Button variant="ghost" className="w-full justify-start">
                              <MapPin className="h-4 w-4 mr-2" />
                              Location
                            </Button>
                          </Link>
                          <Link href="/contact" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button className="w-full justify-start">
                              <Calendar className="h-4 w-4 mr-2" />
                              Book Now
                            </Button>
                          </Link>
                        </>
                      )}
                      {selectedRole === 'admin' && !user && (
                        <>
                          <Link href="/auth/login?role=admin" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">
                              <LogIn className="h-4 w-4 mr-2" />
                              Login
                            </Button>
                          </Link>
                          <Link href="/auth/signup?role=admin" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button className="w-full justify-start">
                              <UserPlus className="h-4 w-4 mr-2" />
                              Get Started
                            </Button>
                          </Link>
                        </>
                      )}
                      {!selectedRole && (
                        <>
                          <Link href="/auth/login" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">
                              <LogIn className="h-4 w-4 mr-2" />
                              Login
                            </Button>
                          </Link>
                          <Link href="/auth/signup" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button className="w-full justify-start">
                              <UserPlus className="h-4 w-4 mr-2" />
                              Get Started
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <Droplet className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                AquaVance
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-6 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions - Desktop */}
          <div className="hidden lg:flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <ThemeToggle />
            {renderButtons(false)}
          </div>

          {/* Right Side Actions - Mobile */}
          <div className="flex lg:hidden items-center space-x-2 flex-shrink-0">
            <ThemeToggle />
            {selectedRole === 'admin' && user && profile ? (
              <UserMenu
                user={{
                  email: profile.email || user.email,
                  firstName: profile.first_name,
                  lastName: profile.last_name,
                  avatarUrl: profile.avatar_url,
                  role: profile.role,
                }}
                onSignOut={handleSignOut}
              />
            ) : (
              <div className="flex items-center space-x-1">
                {selectedRole === 'admin' && !user && (
                  <>
                    <Link href="/auth/login?role=admin">
                      <Button variant="ghost" size="sm" className="p-2 lg:px-3" title="Login">
                        <LogIn className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">Login</span>
                      </Button>
                    </Link>
                    <Link href="/auth/signup?role=admin">
                      <Button size="sm" className="p-2 lg:px-3" title="Get Started">
                        <UserPlus className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">Get Started</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}


