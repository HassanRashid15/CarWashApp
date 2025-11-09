import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/utils/subscription-helpers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

/**
 * GET - Debug endpoint to check purchase status
 * Shows what's in database vs what's in Stripe
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const adminSupabase = createAdminClient();
    
    // Check database
    const dbSubscription = await getSubscription(userId);
    
    // Check all subscriptions in database for this user
    const { data: allUserSubs, error: dbError } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    // Check Stripe
    let stripeSubscriptions: any[] = [];
    let stripeCustomers: any[] = [];
    
    try {
      // Find customer by email
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 10,
        });
        stripeCustomers = customers.data;
        
        // Get subscriptions for each customer
        for (const customer of customers.data) {
          const subs = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 10,
          });
          stripeSubscriptions.push(...subs.data);
        }
      }
    } catch (stripeError) {
      console.error('Error fetching Stripe data:', stripeError);
    }
    
    // Check all subscriptions in database (for debugging)
    const { data: allSubsInDb } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .limit(20);
    
    return NextResponse.json({
      userId,
      userEmail: session.user.email,
      database: {
        userSubscription: dbSubscription,
        allUserSubscriptions: allUserSubs || [],
        allSubscriptionsInTable: allSubsInDb || [],
        error: dbError,
      },
      stripe: {
        customers: stripeCustomers.map(c => ({
          id: c.id,
          email: c.email,
          created: c.created,
        })),
        subscriptions: stripeSubscriptions.map(s => ({
          id: s.id,
          status: s.status,
          customer: s.customer,
          metadata: s.metadata,
          created: s.created,
          current_period_start: s.current_period_start,
          current_period_end: s.current_period_end,
        })),
      },
      analysis: {
        hasDbSubscription: !!dbSubscription,
        hasStripeSubscription: stripeSubscriptions.length > 0,
        mismatch: !!dbSubscription !== (stripeSubscriptions.length > 0),
        recommendation: !dbSubscription && stripeSubscriptions.length > 0
          ? 'Subscription exists in Stripe but not in database. Run verify-checkout to create it.'
          : dbSubscription && stripeSubscriptions.length === 0
          ? 'Subscription exists in database but not in Stripe. Check Stripe dashboard.'
          : 'Everything looks synced.',
      },
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

