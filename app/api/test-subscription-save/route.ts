import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { updateSubscription } from '@/lib/utils/subscription-helpers';

/**
 * POST - Test endpoint to manually test subscription saving
 * This helps debug why subscriptions aren't being saved
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
    const body = await request.json();
    const { planType = 'starter' } = body;

    console.log('🧪 Testing subscription save for user:', userId);

    // Test 1: Check if we can connect to database
    const adminSupabase = createAdminClient();
    const { data: testQuery, error: testError } = await adminSupabase
      .from('subscriptions')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection test failed:', testError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: {
          code: testError.code,
          message: testError.message,
          details: testError.details,
          hint: testError.hint,
        },
      }, { status: 500 });
    }

    console.log('✅ Database connection test passed');

    // Test 2: Try to save a subscription
    const testResult = await updateSubscription(userId, {
      plan_type: planType as any,
      status: 'pending',
      stripe_subscription_id: `test_${Date.now()}`,
      stripe_customer_id: `test_customer_${Date.now()}`,
      stripe_price_id: null,
      current_period_start: null,
      current_period_end: null,
      trial_ends_at: null,
      canceled_at: null,
    });

    if (testResult) {
      console.log('✅ Test subscription saved successfully:', testResult);
      
      // Verify it was actually saved
      const { data: verifyData, error: verifyError } = await adminSupabase
        .from('subscriptions')
        .select('*')
        .eq('id', testResult.id)
        .single();

      if (verifyError || !verifyData) {
        return NextResponse.json({
          success: false,
          error: 'Subscription saved but verification failed',
          savedData: testResult,
          verificationError: verifyError,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription saved and verified successfully',
        subscription: verifyData,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to save subscription',
        userId,
        planType,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Test subscription save error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

