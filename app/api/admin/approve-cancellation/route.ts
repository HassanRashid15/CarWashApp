import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendSubscriptionStatusChangeNotification } from '@/lib/emails/subscription-emails';

/**
 * POST - Approve or reject subscription cancellation request
 * Super admin only
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

    // Check if user is super admin
    const adminSupabase = createAdminClient();
    const { data: currentUserProfile } = await adminSupabase
      .from('profiles')
      .select('role, email')
      .eq('id', session.user.id)
      .single();

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'hassanrashid001@icloud.com';
    const isSuperAdmin = currentUserProfile?.role === 'super_admin' ||
                        currentUserProfile?.email === superAdminEmail;

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { subscriptionId, approve } = body;

    if (!subscriptionId || typeof approve !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing subscriptionId or approve parameter' },
        { status: 400 }
      );
    }

    // Get subscription
    const { data: subscription, error: fetchError } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (!subscription.cancellation_requested) {
      return NextResponse.json(
        { error: 'No cancellation request found for this subscription' },
        { status: 400 }
      );
    }

    if (approve) {
      // Approve cancellation: Revert to trial plan
      // Calculate trial end date (2 days from now, or 30 minutes if test mode)
      const isTestMode = process.env.TEST_MODE_TRIAL === 'true';
      const trialEndsAt = new Date();
      
      if (isTestMode) {
        // 30 minutes for testing
        trialEndsAt.setMinutes(trialEndsAt.getMinutes() + 30);
        console.log('🧪 TEST MODE: Setting trial period to 30 minutes');
      } else {
        // 2 days for production
        trialEndsAt.setDate(trialEndsAt.getDate() + 2);
        console.log('📅 PRODUCTION MODE: Setting trial period to 2 days');
      }

      // Revert to trial: Set status to 'trial' and calculate trial end date
      const { data: updatedSubscription, error: updateError } = await adminSupabase
        .from('subscriptions')
        .update({
          status: 'trial',
          plan_type: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
          // Clear subscription period dates
          current_period_start: null,
          current_period_end: null,
          // Clear Stripe subscription info (keep customer ID for reference)
          stripe_subscription_id: null,
          stripe_price_id: null,
          // Mark cancellation as approved
          cancellation_approved: true,
          cancellation_approved_at: new Date().toISOString(),
          cancellation_approved_by: session.user.id,
          // Clear cancellation request flags
          cancellation_requested: false,
          cancellation_requested_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error approving cancellation:', updateError);
        return NextResponse.json(
          { error: 'Failed to approve cancellation', details: updateError.message },
          { status: 500 }
        );
      }

      console.log('✅ Cancellation approved - subscription reverted to trial:', {
        subscriptionId,
        userId: subscription.user_id,
        trialEndsAt: trialEndsAt.toISOString(),
        isTestMode,
      });

      // Send email notification
      try {
        await sendSubscriptionStatusChangeNotification(
          subscription.user_id,
          'trial',
          'trial',
          subscription.status
        );
        console.log(`📧 Cancellation approval notification email sent to user ${subscription.user_id}`);
      } catch (emailError) {
        console.error('Error sending cancellation approval notification email:', emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Cancellation approved successfully. Subscription reverted to trial plan.',
        subscription: updatedSubscription,
      });
    } else {
      // Reject cancellation: Remove cancellation request and keep subscription active
      const { data: updatedSubscription, error: updateError } = await adminSupabase
        .from('subscriptions')
        .update({
          cancellation_requested: false,
          cancellation_requested_at: null,
          cancellation_approved: false,
          cancellation_approved_at: null,
          cancellation_approved_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error rejecting cancellation:', updateError);
        return NextResponse.json(
          { error: 'Failed to reject cancellation', details: updateError.message },
          { status: 500 }
        );
      }

      console.log('✅ Cancellation rejected for subscription:', subscriptionId);

      return NextResponse.json({
        success: true,
        message: 'Cancellation request rejected',
        subscription: updatedSubscription,
      });
    }
  } catch (error) {
    console.error('Error processing cancellation approval:', error);
    return NextResponse.json(
      { error: 'Failed to process cancellation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

