'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTrialDaysRemaining } from '@/lib/utils/plan-limits';
import type { SubscriptionInfo } from '@/lib/utils/plan-limits';
import { ManageSubscriptionModal } from './manage-subscription-modal';

interface SubscriptionStatusProps {
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

export function SubscriptionStatus({ subscription, usage, limits }: SubscriptionStatusProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>No subscription found</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please contact support to set up your subscription.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isTrial = subscription.isTrial;
  const trialDaysRemaining = subscription.trialEndsAt 
    ? getTrialDaysRemaining(subscription.trialEndsAt)
    : null;

  const planName = subscription.planType.charAt(0).toUpperCase() + subscription.planType.slice(1);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      // Redirect to plan selection or checkout
      window.location.href = '/dashboard/settings?tab=billing';
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                {isTrial ? 'Trial Period' : 'Active Subscription'}
              </CardDescription>
            </div>
            <Badge 
              variant={subscription.isActive ? 'default' : 'destructive'}
              className="text-sm"
            >
              {subscription.isActive ? (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              ) : (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {subscription.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Plan</span>
              <span className="text-lg font-bold">{planName}</span>
            </div>
            {isTrial && trialDaysRemaining !== null && (
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-600 dark:text-orange-400">
                  {trialDaysRemaining} days remaining in trial
                </span>
              </div>
            )}
            {!isTrial && subscription.currentPeriodEnd && (
              <div className="text-sm text-muted-foreground mt-2">
                Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </div>
            )}
          </div>

          {subscription.isExpired && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your subscription has expired. Please upgrade to continue using the service.
              </AlertDescription>
            </Alert>
          )}

          {isTrial && trialDaysRemaining !== null && trialDaysRemaining <= 7 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your trial ends in {trialDaysRemaining} days. Upgrade now to continue using all features.
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Usage</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Customers</span>
                <span className="font-medium">
                  {usage.customers} / {limits.maxCustomers === null ? '∞' : limits.maxCustomers}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Workers</span>
                <span className="font-medium">
                  {usage.workers} / {limits.maxWorkers === null ? '∞' : limits.maxWorkers}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Products</span>
                <span className="font-medium">
                  {usage.products} / {limits.maxProducts === null ? '∞' : limits.maxProducts}
                </span>
              </div>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={isTrial ? handleUpgrade : () => setShowManageModal(true)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                {isTrial ? 'Upgrade Now' : 'Manage Subscription'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Manage Subscription Modal */}
      {!isTrial && subscription && (
        <ManageSubscriptionModal
          isOpen={showManageModal}
          onClose={() => setShowManageModal(false)}
          planType={subscription.planType}
          status={subscription.status}
        />
      )}
    </div>
  );
}


