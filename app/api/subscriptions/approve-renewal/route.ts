import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateSubscription } from '@/lib/utils/subscription-helpers';

/**
 * POST - Super admin approves subscription renewal
 * This endpoint allows super admin to approve pending renewals
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

    const adminSupabase = createAdminClient();
    
    // Get current user profile
    const { data: currentUserProfile } = await adminSupabase
      .from('profiles')
      .select('email, role')
      .eq('id', session.user.id)
      .single();

    // Check if user is super admin (by role or email)
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
    const { subscriptionId, userId } = body;

    if (!subscriptionId && !userId) {
      return NextResponse.json(
        { error: 'Either subscriptionId or userId is required' },
        { status: 400 }
      );
    }

    // Get the subscription
    const query = userId 
      ? adminSupabase.from('subscriptions').select('*').eq('user_id', userId).single()
      : adminSupabase.from('subscriptions').select('*').eq('id', subscriptionId).single();

    const { data: subscription, error: subError } = await query;

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check if renewal is pending
    if (!subscription.pending_renewal) {
      return NextResponse.json(
        { error: 'No pending renewal for this subscription' },
        { status: 400 }
      );
    }

    // Calculate new period dates (extend by 1 month from current_period_end)
    const currentPeriodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end)
      : new Date();
    
    const newPeriodStart = new Date(currentPeriodEnd);
    const newPeriodEnd = new Date(currentPeriodEnd);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

    // Update subscription: reset period, clear pending renewal, mark as approved
    const updatedSubscription = await updateSubscription(subscription.user_id, {
      status: 'active',
      current_period_start: newPeriodStart.toISOString(),
      current_period_end: newPeriodEnd.toISOString(),
      pending_renewal: false,
      renewal_approved_at: new Date().toISOString(),
      renewal_approved_by: session.user.id,
    });

    if (!updatedSubscription) {
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // Get admin profile to send confirmation email
    const { data: adminProfile } = await adminSupabase
      .from('profiles')
      .select('email, first_name, last_name, full_name')
      .eq('id', subscription.user_id)
      .single();

    // Send confirmation email to admin (optional - you can add this later)
    if (adminProfile?.email) {
      console.log(`✅ Subscription renewal approved for user ${subscription.user_id} (${adminProfile.email})`);
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription renewal approved successfully',
      subscription: updatedSubscription,
      newPeriodStart: newPeriodStart.toISOString(),
      newPeriodEnd: newPeriodEnd.toISOString(),
    });
  } catch (error) {
    console.error('Error approving subscription renewal:', error);
    return NextResponse.json(
      { error: 'Failed to approve renewal', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET - Get all pending renewals (for super admin dashboard)
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

    const adminSupabase = createAdminClient();
    
    const { data: currentUserProfile } = await adminSupabase
      .from('profiles')
      .select('email, role')
      .eq('id', session.user.id)
      .single();

    // Check if user is super admin (by role or email)
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'hassanrashid001@icloud.com';
    const isSuperAdmin = currentUserProfile?.role === 'super_admin' ||
                        currentUserProfile?.email === superAdminEmail;

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // Get all pending renewals
    const { data: pendingRenewals, error } = await adminSupabase
      .from('subscriptions')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          first_name,
          last_name,
          full_name,
          admin_code
        )
      `)
      .eq('pending_renewal', true)
      .eq('status', 'active')
      .order('renewal_notification_sent_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending renewals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pending renewals' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pendingRenewals: pendingRenewals || [],
      count: pendingRenewals?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching pending renewals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending renewals', details: (error as Error).message },
      { status: 500 }
    );
  }
}

