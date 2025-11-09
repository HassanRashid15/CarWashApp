'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { SubscriptionStatus } from './subscription-status';
import { PlanSelector } from './plan-selector';
import { TestModeBanner } from './test-mode-banner';
import type { PlanType, SubscriptionInfo } from '@/lib/utils/plan-limits';

interface SubscriptionData {
  subscription: SubscriptionInfo | null;
  usage: {
    customers: number;
    workers: number;
    products: number;
  };
  limits: {
    maxCustomers: number | null;
    maxWorkers: number | null;
    maxProducts: number | null;
  };
}

export function BillingTab() {
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions');
      if (!response.ok) {
        throw new Error('Failed to load subscription data');
      }
      const data = await response.json();
      setSubscriptionData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planType: PlanType) => {
    try {
      // Check auth first (user should be logged in if they're in billing tab, but double-check)
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Store plan and redirect to login
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading subscription data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!subscriptionData) {
    return (
      <Alert>
        <AlertDescription>No subscription data available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <TestModeBanner />
      
      <div>
        <h3 className="text-lg font-semibold">Subscription & Billing</h3>
        <p className="text-sm text-muted-foreground">
          Manage your subscription plan and billing information.
        </p>
      </div>

      <SubscriptionStatus
        subscription={subscriptionData.subscription}
        usage={subscriptionData.usage}
        limits={subscriptionData.limits}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                Choose the plan that best fits your business needs
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPlans(!showPlans)}
            >
              {showPlans ? 'Hide Plans' : 'View Plans'}
            </Button>
          </div>
        </CardHeader>
        {showPlans && (
          <CardContent>
            <PlanSelector
              currentPlan={subscriptionData.subscription?.planType}
              onSelectPlan={handleSelectPlan}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}

