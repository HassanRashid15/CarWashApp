import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET - Get all pending subscription requests (super admin only)
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

    // Get all pending subscriptions
    const { data: pendingSubscriptions, error: subscriptionsError } = await adminSupabase
      .from('subscriptions')
      .select('id, user_id, plan_type, status, created_at, stripe_subscription_id, stripe_customer_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      console.error('Error fetching pending subscriptions:', subscriptionsError);
      
      // Check if error is due to constraint (migration not run)
      if (subscriptionsError.message?.includes('pending') || subscriptionsError.code === '23514') {
        return NextResponse.json(
          { 
            error: 'Database migration required', 
            details: 'The "pending" status is not yet enabled. Please run the migration: add_pending_status_to_subscriptions.sql',
            subscriptions: []
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch pending subscriptions', details: subscriptionsError.message, subscriptions: [] },
        { status: 500 }
      );
    }

    console.log(`Found ${pendingSubscriptions?.length || 0} pending subscriptions`);

    // Get admin details for each subscription
    const subscriptionsWithAdminDetails = await Promise.all(
      (pendingSubscriptions || []).map(async (sub) => {
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', sub.user_id)
          .single();

        return {
          ...sub,
          admin_name: profile?.full_name || null,
          admin_email: profile?.email || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      subscriptions: subscriptionsWithAdminDetails,
    });
  } catch (error) {
    console.error('Error fetching pending subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending subscriptions', details: (error as Error).message },
      { status: 500 }
    );
  }
}

