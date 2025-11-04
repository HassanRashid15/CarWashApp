'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { UserMenu } from '@/components/dashboard/user-menu';
import { createClient } from '@/lib/supabase/client';
import { Droplet, MapPin, Calendar } from 'lucide-react';
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
  const renderButtons = () => {
    if (isCheckingAuth && selectedRole === 'admin') {
      return null; // Don't show anything while checking
    }

    if (selectedRole === 'user') {
      return (
        <>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </Button>
          <Button size="sm" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Book Now
          </Button>
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
      // If admin is not logged in, show login buttons
      return (
        <>
          <Link href="/auth/login?role=admin">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
          <Link href="/auth/signup?role=admin">
            <Button size="sm">Get Started</Button>
          </Link>
        </>
      );
    } else {
      return (
        <>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </>
      );
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <Droplet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              AquaVance
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="#services"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              Services
            </Link>
            <Link
              href="#about"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              href="#contact"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* Right Side Actions - SSR rendered based on role */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {renderButtons()}
          </div>
        </div>
      </div>
    </nav>
  );
}


