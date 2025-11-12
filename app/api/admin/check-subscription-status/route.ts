import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET - Check subscription status and database constraints
 * This helps debug why subscriptions might not be showing as pending
 */
export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    
    // Get all subscriptions
    const { data: subscriptions, error: subsError } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Try to check constraint (this might not work via Supabase client, but we can try)
    // Check if we can insert/query with pending status
    const { data: pendingTest, error: pendingError } = await adminSupabase
      .from('subscriptions')
      .select('id')
      .eq('status', 'pending')
      .limit(1);
    
    // Count by status
    const statusCounts: Record<string, number> = {};
    subscriptions?.forEach(sub => {
      statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
    });
    
    return NextResponse.json({
      success: true,
      canQueryPending: !pendingError,
      pendingError: pendingError?.message || null,
      pendingErrorCode: pendingError?.code || null,
      totalSubscriptions: subscriptions?.length || 0,
      statusCounts,
      subscriptions: subscriptions?.map(sub => ({
        id: sub.id,
        user_id: sub.user_id,
        plan_type: sub.plan_type,
        status: sub.status,
        stripe_subscription_id: sub.stripe_subscription_id,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
      })) || [],
      message: pendingError 
        ? '⚠️ Pending status is NOT enabled. Please run the migration: add_pending_status_to_subscriptions.sql'
        : '✅ Pending status is enabled and working correctly',
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check subscription status', 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}



