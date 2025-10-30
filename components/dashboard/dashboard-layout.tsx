'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { UserMenu } from '@/components/dashboard/user-menu';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface ProfileData {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  email?: string;
  role?: string;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();

  // Close sidebar on mobile and tablet by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Check on mount
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProfile = async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/auth/login');
      return;
    }

    setUser(session.user);

      // Fetch profile data
      if (session.user) {
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
          // Fallback to user email if no profile
          setProfile({
            email: session.user.email,
          });
        }
      }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [router]);

  // Listen for profile update events
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [router]);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleMobileNavigate = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background relative">
      {/* Backdrop overlay for mobile and tablet */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className={`p-6 border-b border-border flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <Link href="/dashboard" className="flex items-center justify-center">
            {isSidebarOpen ? (
              <span className="text-xl font-bold">Dashboard</span>
            ) : (
              <span className="text-xl font-bold">D</span>
            )}
          </Link>
          {/* Mobile and tablet close button */}
          {isSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="text-muted-foreground lg:hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Button>
          )}
        </div>

        <nav className={`flex-1 p-4 space-y-1`}>
          <SidebarItem
            href="/dashboard"
            icon={<HomeIcon className="h-5 w-5" />}
            label="Home"
            isCollapsed={!isSidebarOpen}
            onNavigate={handleMobileNavigate}
          />
          <SidebarItem
            href="/dashboard/profile"
            icon={<UserIcon className="h-5 w-5" />}
            label="Profile"
            isCollapsed={!isSidebarOpen}
            onNavigate={handleMobileNavigate}
          />
          <SidebarItem
            href="/dashboard/settings"
            icon={<SettingsIcon className="h-5 w-5" />}
            label="Settings"
            isCollapsed={!isSidebarOpen}
            onNavigate={handleMobileNavigate}
          />
        </nav>
        <div className={`flex items-center p-4 ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}>
              <Avatar className="h-10 w-10">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile.email || user?.email || 'User'} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {isSidebarOpen && (
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.first_name && profile?.last_name
                      ? `${profile.first_name} ${profile.last_name}`
                      : profile?.email || user?.email || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile?.email || user?.email}
                  </p>
                  {profile?.role && (
                    <p className="text-xs text-muted-foreground truncate capitalize">
                      {profile.role}
                    </p>
                  )}
                </div>
              )}
            </div>
        <div className="mt-auto">
          <div className="p-4 space-y-3 border-t border-border">
 
            <Button
              variant="ghost"
              className={`${isSidebarOpen ? 'w-full justify-start' : 'w-full justify-center'} text-muted-foreground hover:text-destructive`}
              onClick={handleSignOut}
            >
              <LogOutIcon className={`h-5 w-5 ${isSidebarOpen ? 'mr-2' : ''}`} />
              {isSidebarOpen && <span>Sign out</span>}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-muted-foreground hidden lg:block"
            >
              {isSidebarOpen ? (
                <ChevronLeftIcon className="h-5 w-5" />
              ) : (
                <ChevronRightIcon className="h-5 w-5" />
              )}
            </Button>
            {/* Mobile and tablet menu button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="text-muted-foreground lg:hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </Button>
            {/* <h1 className="text-xl font-semibold">
              Welcome,{' '}
              <span className="text-primary">
                {profile?.first_name && profile?.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile?.email || user?.email}
              </span>
            </h1> */}
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {user && (
              <UserMenu
                user={{
                  email: profile?.email || user.email,
                  firstName: profile?.first_name,
                  lastName: profile?.last_name,
                  avatarUrl: profile?.avatar_url,
                  role: profile?.role,
                }}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

function SidebarItem({ href, icon, label, isCollapsed, onNavigate }: SidebarItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center rounded-md hover:bg-accent group transition-colors ${
        isCollapsed 
          ? 'justify-center p-2 w-full' 
          : 'justify-start p-2'
      }`}
    >
      <div className={`${isCollapsed ? '' : 'mr-2'} text-muted-foreground group-hover:text-foreground flex items-center justify-center`}>
        {icon}
      </div>
      {!isCollapsed && (
        <span className="text-muted-foreground group-hover:text-foreground">
          {label}
        </span>
      )}
    </Link>
  );
}

// Icons
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LogOutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
