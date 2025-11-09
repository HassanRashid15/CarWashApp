import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET - Fetch all active subscription plans with their features
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch active subscription plans
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (plansError) {
      throw plansError;
    }

    if (!plans || plans.length === 0) {
      return NextResponse.json({ plans: [] });
    }

    // Fetch features for each plan
    const planIds = plans.map(plan => plan.id);
    const { data: features, error: featuresError } = await supabase
      .from('plan_features')
      .select('*')
      .in('plan_id', planIds)
      .order('sort_order', { ascending: true });

    if (featuresError) {
      throw featuresError;
    }

    // Group features by plan_id
    const featuresByPlan = (features || []).reduce((acc, feature) => {
      if (!acc[feature.plan_id]) {
        acc[feature.plan_id] = [];
      }
      acc[feature.plan_id].push(feature.feature_text);
      return acc;
    }, {} as Record<string, string[]>);

    // Combine plans with their features
    const plansWithFeatures = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.display_name,
      price: parseFloat(plan.price.toString()),
      currency: plan.currency,
      billingPeriod: plan.billing_period,
      description: plan.description,
      isPopular: plan.is_popular,
      iconName: plan.icon_name,
      gradientColors: plan.gradient_colors,
      features: featuresByPlan[plan.id] || [],
    }));

    return NextResponse.json({ plans: plansWithFeatures });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch subscription plans',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

