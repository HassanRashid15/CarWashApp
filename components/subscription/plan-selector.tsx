'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Zap, Shield, Award } from 'lucide-react';
import { useState } from 'react';
import { PLAN_PRICING } from '@/lib/utils/plan-limits';
import type { PlanType } from '@/lib/utils/plan-limits';
import { handlePlanSelection } from '@/lib/utils/plan-selection';
import { PLAN_DESCRIPTIONS } from '@/lib/utils/plan-descriptions';

interface PlanSelectorProps {
  currentPlan?: PlanType;
  onSelectPlan: (planType: PlanType) => Promise<void>;
}

const planFeatures = {
  starter: PLAN_DESCRIPTIONS.starter.features,
  professional: PLAN_DESCRIPTIONS.professional.features,
  enterprise: PLAN_DESCRIPTIONS.enterprise.features,
};

const planIcons = {
  starter: Shield,
  professional: Zap,
  enterprise: Award,
};

export function PlanSelector({ currentPlan, onSelectPlan }: PlanSelectorProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);

  const handleSelectPlan = async (planType: PlanType) => {
    if (planType === currentPlan) {
      return; // Already on this plan
    }

    setLoadingPlan(planType);
    try {
      // Check if user is authenticated
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Not logged in - store plan and redirect to login
        sessionStorage.setItem('selectedPlan', planType);
        window.location.href = `/auth/login?role=admin&plan=${planType}&redirect=checkout`;
        return;
      }
      
      // User is logged in - proceed with checkout
      await onSelectPlan(planType);
    } catch (error) {
      console.error('Error selecting plan:', error);
      alert(error instanceof Error ? error.message : 'Failed to select plan');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {(['starter', 'professional', 'enterprise'] as const).map((planType) => {
        const Icon = planIcons[planType];
        const pricing = PLAN_PRICING[planType];
        const features = planFeatures[planType];
        const isCurrentPlan = planType === currentPlan;
        const isPopular = planType === 'professional';

        return (
          <Card
            key={planType}
            className={`relative flex flex-col ${
              isPopular ? 'border-primary shadow-lg scale-105' : ''
            } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
          >
            {isPopular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            {isCurrentPlan && (
              <Badge variant="secondary" className="absolute -top-3 right-4">
                Current Plan
              </Badge>
            )}
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-5 w-5" />
                <CardTitle className="text-xl">
                  {planType.charAt(0).toUpperCase() + planType.slice(1)}
                </CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">${pricing.price}</span>
                <span className="text-muted-foreground">/{pricing.period}</span>
              </div>
              <CardDescription>Perfect for {planType === 'starter' ? 'small businesses' : planType === 'professional' ? 'growing businesses' : 'large enterprises'}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 space-y-4">
              <ul className="space-y-2 flex-1">
                {features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-auto"
                variant={isPopular ? 'default' : 'outline'}
                onClick={() => handleSelectPlan(planType)}
                disabled={isCurrentPlan || loadingPlan !== null}
              >
                {loadingPlan === planType ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : (
                  'Select Plan'
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

