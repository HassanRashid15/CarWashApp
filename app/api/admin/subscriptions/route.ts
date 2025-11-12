import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET - Get all subscriptions with admin details (super admin only)
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

    // Get all subscriptions
    const { data: subscriptions, error: subscriptionsError } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: subscriptionsError.message, subscriptions: [] },
        { status: 500 }
      );
    }

    // Get admin details for each subscription
    const subscriptionsWithAdminDetails = await Promise.all(
      (subscriptions || []).map(async (sub) => {
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('full_name, email, first_name, last_name')
          .eq('id', sub.user_id)
          .single();

        return {
          ...sub,
          admin_name: profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || null,
          admin_email: profile?.email || null,
        };
      })
    );

    // Calculate stats
    const stats = {
      total: subscriptionsWithAdminDetails.length,
      active: subscriptionsWithAdminDetails.filter(s => s.status === 'active').length,
      trial: subscriptionsWithAdminDetails.filter(s => s.status === 'trial').length,
      pending: subscriptionsWithAdminDetails.filter(s => s.status === 'pending').length,
      canceled: subscriptionsWithAdminDetails.filter(s => s.status === 'canceled').length,
      expired: subscriptionsWithAdminDetails.filter(s => s.status === 'expired').length,
    };

    return NextResponse.json({
      success: true,
      subscriptions: subscriptionsWithAdminDetails,
      stats,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions', details: (error as Error).message },
      { status: 500 }
    );
  }
}


