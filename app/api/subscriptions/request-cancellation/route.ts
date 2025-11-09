import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSubscription, updateSubscription } from '@/lib/utils/subscription-helpers';

/**
 * POST - Request subscription cancellation
 * Creates a cancellation request that needs super admin approval
 */
export async function POST(request: NextRequest) {
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
    
    // Get current subscription
    const subscription = await getSubscription(userId);
    
    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Check if subscription is already canceled or has pending cancellation
    if (subscription.status === 'canceled') {
      return NextResponse.json(
        { error: 'Subscription is already canceled' },
        { status: 400 }
      );
    }

    // Check if cancellation is already requested
    if ((subscription as any).cancellation_requested) {
      return NextResponse.json(
        { error: 'Cancellation request already pending approval' },
        { status: 400 }
      );
    }

    // Update subscription to request cancellation
    const adminSupabase = createAdminClient();
    const { data: updatedSubscription, error: updateError } = await adminSupabase
      .from('subscriptions')
      .update({
        cancellation_requested: true,
        cancellation_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error requesting cancellation:', updateError);
      return NextResponse.json(
        { error: 'Failed to request cancellation', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Cancellation requested for user:', userId, {
      subscriptionId: updatedSubscription.id,
      requestedAt: updatedSubscription.cancellation_requested_at,
    });

    return NextResponse.json({
      success: true,
      message: 'Cancellation request submitted successfully',
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error('Error in request cancellation:', error);
    return NextResponse.json(
      { error: 'Failed to request cancellation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

