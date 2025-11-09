'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CreditCard, AlertTriangle, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { SubscriptionInfo } from '@/lib/utils/plan-limits';
import { getTrialDaysRemaining } from '@/lib/utils/plan-limits';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function CurrentPlanCard() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchSubscription = async (skipCache = false) => {
    try {
      setRefreshing(true);
      const headers: HeadersInit = {};
      if (skipCache) {
        headers['x-skip-cache'] = 'true';
      }
      
      console.log('🔄 Fetching subscription from API (skipCache:', skipCache, ')');
      // Always add timestamp to prevent browser caching
      const response = await fetch(`/api/subscriptions?t=${Date.now()}`, { 
        headers,
        cache: 'no-store', // Always fetch fresh data
      });
      
      if (response.status === 429) {
        // Rate limited - stop polling and show cached data
        console.warn('Rate limited on subscription fetch');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        const cacheHeader = response.headers.get('X-Cache');
        console.log('📊 ========================================');
        console.log('📊 BROWSER: Subscription data received from API');
        console.log('📊 ========================================');
        console.log('📊 Cache Status:', cacheHeader || 'UNKNOWN');
        console.log('📊 Has Subscription:', !!data.subscription);
        console.log('📊 Subscription is Null:', data.subscription === null);
        console.log('📊 Subscription is Undefined:', data.subscription === undefined);
        console.log('📊 Status:', data.subscription?.status);
        console.log('📊 Plan Type:', data.subscription?.planType);
        console.log('📊 Is Pending:', data.subscription?.status === 'pending');
        console.log('📊 Full Data:', JSON.stringify(data.subscription, null, 2));
        if (cacheHeader === 'HIT') {
          console.warn('⚠️ ⚠️ ⚠️ USING CACHED DATA - This might be stale! ⚠️ ⚠️ ⚠️');
          console.warn('⚠️ Check SERVER console (terminal) for actual Supabase data');
          console.warn('⚠️ Click Refresh button to clear cache and get fresh data');
        }
        console.log('📊 ========================================');
        
        // CRITICAL: Explicitly set to null if subscription is null/undefined
        // This prevents showing "pending" when there's no subscription in database
        if (data.subscription === null || data.subscription === undefined || !data.subscription.status) {
          console.log('✅ No subscription in database - setting to null');
          setSubscription(null);
        } else if (data.subscription.status === 'pending') {
          // Only show pending if subscription actually exists and has pending status
          console.log('✅ Subscription exists with pending status:', data.subscription);
          setSubscription(data.subscription);
        } else {
          console.log('✅ Setting subscription with status:', data.subscription.status);
          setSubscription(data.subscription);
        }
        
        // Only poll if subscription is pending
        if (data.subscription?.status === 'pending') {
          console.log('⏳ Subscription is pending, starting polling...');
          // Start polling only if not already polling
          if (!intervalRef.current) {
            intervalRef.current = setInterval(() => {
              fetchSubscription(false); // Use cache for polling
            }, 10000); // Poll every 10 seconds instead of 5 to reduce rate limit hits
          }
        } else {
          // Stop polling if subscription is no longer pending
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
      }
    } catch (error) {
      console.error('❌ Error fetching subscription:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let initialFetch: NodeJS.Timeout | null = null;
    
    // IMPORTANT: Reset subscription state on mount to prevent stale data
    setSubscription(null);
    setLoading(true);
    
    // Get user ID for realtime subscription
    const setupRealtime = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('⚠️ No user session, skipping realtime setup');
        return;
      }
      
      userIdRef.current = session.user.id;
      console.log('🔔 Setting up realtime subscription for user:', session.user.id);
      
      // Set up realtime channel to listen for subscription changes
      const channel = supabase
        .channel(`subscription:${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            console.log('🔔 Real-time subscription update detected:', {
              new: payload.new,
              old: payload.old,
              event: payload.eventType,
              statusChanged: (payload.old as any)?.status !== (payload.new as any)?.status,
            });
            
            // Refresh subscription data immediately when database changes
            // Use a small delay to ensure database transaction is committed
            setTimeout(() => {
              fetchSubscription(true);
            }, 500);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            console.log('🔔 Real-time subscription insert detected:', payload.new);
            // Refresh subscription data when new subscription is created
            setTimeout(() => {
              fetchSubscription(true);
            }, 500);
          }
        )
        .subscribe((status) => {
          console.log('🔔 Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to realtime updates for subscriptions table');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to realtime channel');
          }
        });
      
      channelRef.current = channel;
    };
    
    // Fetch with cache skip on initial load to get fresh data from Supabase
    // CRITICAL: Always skip cache on initial load to ensure we get fresh data
    initialFetch = setTimeout(() => {
      // Clear cache first, then fetch
      fetch('/api/subscriptions/clear-cache', { method: 'POST' }).catch(() => {});
      fetchSubscription(true);
      setupRealtime();
    }, 100); // Reduced delay for faster initial load
    
    // Listen for subscription approval events to refresh data
    const handleSubscriptionApproved = () => {
      fetchSubscription(true); // Skip cache to get fresh data
    };
    
    // Listen for purchase success to refresh immediately
    const handlePurchaseSuccess = () => {
      // Wait a bit for subscription to be saved, then fetch
      setTimeout(() => {
        fetchSubscription(true);
      }, 1000);
    };
    
    window.addEventListener('purchase-success', handlePurchaseSuccess);
    window.addEventListener('subscription-approved', handleSubscriptionApproved);
    
    return () => {
      if (initialFetch) {
        clearTimeout(initialFetch);
      }
      window.removeEventListener('subscription-approved', handleSubscriptionApproved);
      window.removeEventListener('purchase-success', handlePurchaseSuccess);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Clean up realtime subscription
      if (channelRef.current) {
        console.log('🔕 Unsubscribing from realtime channel');
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Loading subscription information...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // IMPORTANT: Check for null/undefined subscription FIRST
  // If subscription is null, it means there's no subscription record in Supabase
  if (!subscription || !subscription.status) {
    console.log('📋 No subscription found - showing "No plan" state');
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>No plan is active now</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                // Clear cache first, then fetch fresh data
                try {
                  await fetch('/api/subscriptions/clear-cache', { method: 'POST' });
                } catch (error) {
                  console.error('Error clearing cache:', error);
                }
                fetchSubscription(true);
              }}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No plan is active now. Choose a plan to get started and unlock all features.
          </p>
          <Button asChild>
            <Link href="/?role=admin">View Plans</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show pending status if subscription is pending approval
  // Only check this if subscription exists and has a status
  if (subscription.status === 'pending') {
    console.log('📋 Subscription found with pending status:', subscription);
    const planDisplayNames: Record<string, string> = {
      starter: 'Starter Plan',
      professional: 'Professional Plan',
      enterprise: 'Enterprise Plan',
    };
    const displayName = planDisplayNames[subscription.planType] || subscription.planType;

    return (
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Pending Approval</CardDescription>
            </div>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Your plan is being reviewed and wait for approval from super admin
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Plan:</span> {displayName}
            </p>
            <p className="text-sm text-muted-foreground">
              Status: Awaiting super admin approval
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const planName = subscription.planType.charAt(0).toUpperCase() + subscription.planType.slice(1);
  const isTrial = subscription.isTrial;
  const trialDaysRemaining = subscription.trialEndsAt 
    ? getTrialDaysRemaining(subscription.trialEndsAt)
    : null;

  // Map plan names for display
  const planDisplayNames: Record<string, string> = {
    starter: 'Test Plan',
    professional: 'Professional Plan',
    enterprise: 'Enterprise Plan',
  };

  const displayName = planDisplayNames[subscription.planType] || planName;

  // Check if subscription is expired first
  const isExpired = subscription.isExpired;
  const showExpiredMessage = isExpired;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              {isExpired 
                ? 'Expired Subscription' 
                : isTrial 
                  ? 'Trial Period' 
                  : 'Active Subscription'}
            </CardDescription>
          </div>
          <Badge 
            variant={subscription.isActive && !isExpired ? 'default' : 'destructive'}
            className="text-sm"
          >
            {subscription.isActive && !isExpired ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Inactive
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Plan</span>
            <span className="text-2xl font-bold">{displayName}</span>
          </div>
          
          {isTrial && trialDaysRemaining !== null && !isExpired && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                {trialDaysRemaining} days remaining in trial
              </span>
            </div>
          )}
          
          {!isTrial && subscription.currentPeriodEnd && !isExpired && (
            <div className="text-sm text-muted-foreground mt-2">
              Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}

          {!isTrial && subscription.currentPeriodEnd && isExpired && (
            <div className="text-sm text-muted-foreground mt-2">
              Expired on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}
        </div>

        {showExpiredMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              Your subscription has expired. Please upgrade to continue.
            </p>
          </div>
        )}

        <Button asChild className="w-full" variant="outline">
          <Link href="/dashboard/settings?tab=billing">
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Subscription
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

