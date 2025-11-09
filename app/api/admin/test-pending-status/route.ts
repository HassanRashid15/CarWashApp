import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET - Test endpoint to check if pending status is enabled in database
 * This helps debug if the migration has been run
 */
export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    
    // Try to query for pending status
    const { data, error } = await adminSupabase
      .from('subscriptions')
      .select('status')
      .limit(1);
    
    // Check constraint by trying to insert a test record (we'll rollback)
    const testResult = await adminSupabase.rpc('check_pending_status_support');
    
    // Alternative: Check all subscriptions to see status values
    const { data: allSubs, error: allError } = await adminSupabase
      .from('subscriptions')
      .select('id, status')
      .limit(10);
    
    // Check if we can filter by pending
    const { data: pendingTest, error: pendingError } = await adminSupabase
      .from('subscriptions')
      .select('id')
      .eq('status', 'pending')
      .limit(1);
    
    return NextResponse.json({
      success: true,
      canQueryPending: !pendingError,
      pendingError: pendingError?.message || null,
      pendingErrorCode: pendingError?.code || null,
      totalSubscriptions: allSubs?.length || 0,
      statusValues: allSubs?.map(s => s.status) || [],
      message: pendingError 
        ? 'Pending status is NOT enabled. Please run the migration: add_pending_status_to_subscriptions.sql'
        : 'Pending status is enabled and working correctly',
    });
  } catch (error) {
    console.error('Error testing pending status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test pending status', 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}


