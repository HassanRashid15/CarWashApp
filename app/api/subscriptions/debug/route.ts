import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/utils/subscription-helpers';

/**
 * GET - Debug endpoint to check subscription status
 * This helps verify if the subscription exists and matches the user
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
    const userEmail = session.user.email;

    // Get subscription using helper
    const subscription = await getSubscription(userId);

    // Also query directly to compare
    const adminSupabase = createAdminClient();
    const { data: directQuery, error: directError } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Get all subscriptions for this user (in case there are multiple)
    const { data: allSubs, error: allError } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    // Also check if there are any subscriptions with pending status
    const { data: pendingSubs, error: pendingError } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'pending');

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userEmail,
      },
      subscription: subscription,
      directQuery: {
        data: directQuery,
        error: directError,
      },
      allSubscriptions: allSubs || [],
      allSubscriptionsError: allError,
      pendingSubscriptions: pendingSubs || [],
      pendingSubscriptionsError: pendingError,
      message: subscription 
        ? `Found subscription with status: ${subscription.status}` 
        : 'No subscription found for this user',
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

