import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendSubscriptionStatusChangeNotification } from '@/lib/emails/subscription-emails';

/**
 * POST - Approve or reject a pending subscription (super admin only)
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
        { error: 'Invalid request. subscriptionId and approve (boolean) are required.' },
        { status: 400 }
      );
    }

    // Get the subscription
    const { data: subscription, error: fetchError } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found or not pending' },
        { status: 404 }
      );
    }

    if (approve) {
      // Approve: Set status to 'active' and set period dates
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription

      const { data: updatedSubscription, error: updateError } = await adminSupabase
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error approving subscription:', updateError);
        return NextResponse.json(
          { error: 'Failed to approve subscription', details: updateError.message },
          { status: 500 }
        );
      }

      // Send email notification
      try {
        await sendSubscriptionStatusChangeNotification(
          subscription.user_id,
          subscription.plan_type,
          'active',
          'pending'
        );
        console.log(`📧 Subscription approval notification email sent to user ${subscription.user_id}`);
      } catch (emailError) {
        console.error('Error sending subscription approval notification email:', emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription approved successfully',
        subscription: updatedSubscription,
      });
    } else {
      // Reject: Set status to 'canceled'
      const { data: updatedSubscription, error: updateError } = await adminSupabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error rejecting subscription:', updateError);
        return NextResponse.json(
          { error: 'Failed to reject subscription', details: updateError.message },
          { status: 500 }
        );
      }

      // Send email notification
      try {
        await sendSubscriptionStatusChangeNotification(
          subscription.user_id,
          subscription.plan_type,
          'canceled',
          'pending'
        );
        console.log(`📧 Subscription rejection notification email sent to user ${subscription.user_id}`);
      } catch (emailError) {
        console.error('Error sending subscription rejection notification email:', emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription rejected successfully',
        subscription: updatedSubscription,
      });
    }
  } catch (error) {
    console.error('Error processing subscription approval:', error);
    return NextResponse.json(
      { error: 'Failed to process approval', details: (error as Error).message },
      { status: 500 }
    );
  }
}


