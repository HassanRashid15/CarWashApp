'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Zap, CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PlanType } from '@/lib/utils/plan-limits';
import { PLAN_PRICING } from '@/lib/utils/plan-limits';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: PlanType;
  limitReached?: {
    currentCount: number;
    maxLimit: number | null;
    limitType: 'customers' | 'workers' | 'products';
  };
  message?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentPlan = 'trial',
  limitReached,
  message,
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const router = useRouter();

  const handleSelectPlan = async (planType: PlanType) => {
    if (planType === currentPlan) {
      return;
    }

    setLoading(true);
    setSelectedPlan(planType);

    try {
      // Check if user is logged in
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // Store plan and redirect to login
        sessionStorage.setItem('selectedPlan', planType);
        router.push(`/auth/login?role=admin&plan=${planType}&redirect=checkout`);
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
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      alert(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const getLimitMessage = () => {
    if (!limitReached) return message || 'Upgrade your plan to unlock more features.';
    
    const { currentCount, maxLimit, limitType } = limitReached;
    const limitTypeName = limitType === 'customers' ? 'customers' : limitType === 'workers' ? 'workers' : 'products';
    
    if (maxLimit) {
      return `You've reached your limit of ${maxLimit} ${limitTypeName}. Upgrade to continue adding more ${limitTypeName}.`;
    }
    
    return `You've reached your ${limitTypeName} limit. Upgrade to continue.`;
  };

  const { PLAN_DESCRIPTIONS } = require('@/lib/utils/plan-descriptions');
  
  const plans = [
    {
      type: 'starter' as PlanType,
      name: PLAN_DESCRIPTIONS.starter.name,
      price: PLAN_PRICING.starter.price,
      features: PLAN_DESCRIPTIONS.starter.features,
      recommended: false,
    },
    {
      type: 'professional' as PlanType,
      name: PLAN_DESCRIPTIONS.professional.name,
      price: PLAN_PRICING.professional.price,
      features: PLAN_DESCRIPTIONS.professional.features,
      recommended: true,
    },
    {
      type: 'enterprise' as PlanType,
      name: PLAN_DESCRIPTIONS.enterprise.name,
      price: PLAN_PRICING.enterprise.price,
      features: PLAN_DESCRIPTIONS.enterprise.features,
      recommended: false,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                Upgrade Your Plan
              </DialogTitle>
              <DialogDescription className="mt-2">
                {getLimitMessage()}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {currentPlan === 'trial' && (
          <Alert className="mb-4">
            <AlertDescription>
              You're currently on a free trial with limited features. Choose a plan to unlock full access.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.type === currentPlan;
            const isSelected = selectedPlan === plan.type;
            
            return (
              <div
                key={plan.type}
                className={`relative border-2 rounded-lg p-4 transition-all cursor-pointer ${
                  plan.recommended
                    ? 'border-primary bg-primary/5'
                    : isCurrentPlan
                    ? 'border-muted bg-muted/50'
                    : 'border-border hover:border-primary/50'
                } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                onClick={() => !isCurrentPlan && handleSelectPlan(plan.type)}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                      Recommended
                    </span>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-2">
                    <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded font-medium">
                      Current
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.recommended ? 'default' : 'outline'}
                  disabled={isCurrentPlan || loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCurrentPlan) {
                      handleSelectPlan(plan.type);
                    }
                  }}
                >
                  {isCurrentPlan ? (
                    'Current Plan'
                  ) : loading && isSelected ? (
                    'Processing...'
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Select Plan
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


