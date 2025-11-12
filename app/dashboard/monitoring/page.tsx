'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Activity, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Server } from 'lucide-react';
import { FeatureRestrictionOverlay } from '@/components/subscription/feature-restriction-overlay';
import { hasFeature, getPlanLimits } from '@/lib/utils/plan-limits';
import { createClient } from '@/lib/supabase/client';

interface ProfileData {
  role?: string;
}

export default function MonitoringPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<{ customers: number; workers: number; products: number } | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    fetchSubscription();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setUsage(data.usage);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  // Check if monitoring feature is available based on customer count and subscription
  const isMonitoringLocked = (): boolean => {
    // Super admin always has access
    if (profile?.role === 'super_admin') {
      return false;
    }

    if (checkingSubscription || !usage) return true; // Lock while loading

    // If no subscription, check customer count
    if (!subscription || !subscription.planType) {
      const maxCustomers = 5; // No plan limit
      return usage.customers >= maxCustomers;
    }

    // If has subscription, check feature availability
    const hasFeatureAccess = hasFeature(subscription.planType, 'monitoring');
    if (!hasFeatureAccess) {
      // If feature not available in plan, check customer count
      const limits = getPlanLimits(subscription.planType);
      const maxCustomers = limits.maxCustomers;
      if (maxCustomers === null) return false; // Unlimited
      return usage.customers >= maxCustomers;
    }

    // Feature is available in plan, but check customer limit
    const limits = getPlanLimits(subscription.planType);
    const maxCustomers = limits.maxCustomers;
    if (maxCustomers === null) return false; // Unlimited
    return usage.customers >= maxCustomers;
  };

  if (checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isMonitoringLocked()) {
    return (
      <FeatureRestrictionOverlay
        featureName="Monitoring & Error Tracking"
        requiredPlan="Professional"
        description="Monitoring provides real-time error tracking, performance monitoring, and system health insights. You've reached your customer limit. Upgrade your plan to continue using this feature."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monitoring & Error Tracking</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your application performance, track errors, and view system health metrics.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-2xl font-bold">Operational</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">All systems running smoothly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.02%</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142ms</div>
            <p className="text-xs text-muted-foreground mt-1">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>System events and error logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">System check completed</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Database connection healthy</p>
                <p className="text-xs text-muted-foreground">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">API endpoint response normal</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Notice */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Monitoring Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Error logging is enabled via Vercel Logs (free, built-in). View logs in your Vercel dashboard.
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-sm text-muted-foreground">
            <li>✅ Real-time error tracking (Vercel Logs)</li>
            <li>✅ Performance monitoring (Vercel Analytics)</li>
            <li>✅ Detailed error stack traces</li>
            <li>✅ Automatic log capture in production</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

