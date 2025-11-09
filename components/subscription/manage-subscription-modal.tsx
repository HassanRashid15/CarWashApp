'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { PLAN_DESCRIPTIONS } from '@/lib/utils/plan-descriptions';
import type { PlanType } from '@/lib/utils/plan-limits';

interface ManageSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: PlanType;
  status: string;
}

export function ManageSubscriptionModal({
  isOpen,
  onClose,
  planType,
  status,
}: ManageSubscriptionModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Handle trial plan type - it's not in PLAN_DESCRIPTIONS
  const planDetails = planType === 'trial' 
    ? {
        name: 'Trial',
        price: 0,
        period: 'trial',
        maxCustomers: 2,
        features: [
          'Up to 2 customers',
          'Basic queue management',
          'Worker management',
          'Basic reports',
        ],
        description: 'Free trial plan',
      }
    : PLAN_DESCRIPTIONS[planType as keyof typeof PLAN_DESCRIPTIONS];
  const isActive = status === 'active';
  const isPending = status === 'pending';

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    try {
      setIsCanceling(true);
      setCancelError(null);

      const response = await fetch('/api/subscriptions/request-cancellation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request cancellation');
      }

      setCancelSuccess(true);
      // Close modal after 2 seconds
      setTimeout(() => {
        setCancelSuccess(false);
        setShowCancelConfirm(false);
        onClose();
        // Refresh the page to show updated status
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      setCancelError(error instanceof Error ? error.message : 'Failed to request cancellation');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleClose = () => {
    if (!isCanceling && !cancelSuccess) {
      setShowCancelConfirm(false);
      setCancelError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manage Subscription
          </DialogTitle>
          <DialogDescription>
            View your plan details and manage your subscription
          </DialogDescription>
        </DialogHeader>

        {cancelSuccess ? (
          <div className="py-8">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Cancellation Request Submitted</strong>
                <p className="mt-2 text-sm">
                  Your cancellation request has been submitted and is pending approval from the super admin.
                  You will be notified once the request is processed.
                </p>
              </AlertDescription>
            </Alert>
          </div>
        ) : showCancelConfirm ? (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Confirm Cancellation</strong>
                <p className="mt-2 text-sm">
                  Are you sure you want to cancel your subscription? This action will submit a cancellation request
                  that requires approval from the super admin. Your subscription will remain active until the request is approved.
                </p>
              </AlertDescription>
            </Alert>

            {cancelError && (
              <Alert variant="destructive">
                <AlertDescription>{cancelError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelError(null);
                }}
                disabled={isCanceling}
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={isCanceling}
              >
                {isCanceling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Confirm Cancellation
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Current Plan Status */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Current Plan</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{planDetails.name}</span>
                  <Badge variant={isActive ? 'default' : isPending ? 'outline' : 'secondary'}>
                    {status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{planDetails.description}</p>
                <div className="text-2xl font-bold">
                  ${planDetails.price}
                  <span className="text-sm font-normal text-muted-foreground">/{planDetails.period}</span>
                </div>
              </div>
            </div>

            {/* Plan Features */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Plan Features</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <ul className="space-y-2">
                  {planDetails.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Customer Limit */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Customer Limit</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  {planDetails.maxCustomers === null
                    ? 'Unlimited customers'
                    : `Up to ${planDetails.maxCustomers} customers`}
                </p>
              </div>
            </div>

            {/* Cancel Button */}
            {isActive && (
              <div className="pt-4 border-t">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Want to cancel?</strong>
                    <p className="mt-1 text-sm">
                      You can request to cancel your subscription. The cancellation will need to be approved by the super admin.
                    </p>
                  </AlertDescription>
                </Alert>
                <Button
                  variant="destructive"
                  className="w-full mt-4"
                  onClick={handleCancelClick}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Subscription
                </Button>
              </div>
            )}

            {isPending && (
              <Alert>
                <AlertDescription>
                  Your subscription is pending approval. Once approved, you'll be able to manage it here.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

