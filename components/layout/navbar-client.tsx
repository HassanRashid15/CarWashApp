'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Droplet, MapPin, Calendar } from 'lucide-react';

interface NavbarClientProps {
  initialRole: string | null;
}

export function NavbarClient({ initialRole }: NavbarClientProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(initialRole);

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

  // SSR rendered buttons based on initial role
  const renderButtons = () => {
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


