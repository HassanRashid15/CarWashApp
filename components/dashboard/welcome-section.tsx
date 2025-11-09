'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface WelcomeSectionProps {
  firstName?: string;
  lastName?: string;
  userEmail: string;
}

export function WelcomeSection({ firstName, lastName, userEmail }: WelcomeSectionProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session?.user);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsLoggedIn(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  // Use first and last name if available, otherwise use email prefix
  const displayName = firstName && lastName 
    ? `${firstName} ${lastName}` 
    : firstName || lastName || userEmail.split('@')[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-none">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {isLoggedIn ? `Welcome back, ${displayName}!` : 'Welcome to Car Wash App'}
              </h2>
              <p className="text-muted-foreground mt-1">
                {isLoggedIn 
                  ? "Here's what's happening with your account today."
                  : "Get started with your car wash management system today."
                }
              </p>
            </div>
            {!isChecking && (
              <div className="flex gap-2">
                {isLoggedIn ? (
                  <>
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/settings">View Profile</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link href="/auth/login">Login</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/auth/signup">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
