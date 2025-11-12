import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkSubscriptionAccess } from '@/lib/utils/subscription-helpers';
import { sendFeedbackNotification } from '@/lib/emails/feedback-emails';
import { hasFeature, getPlanLimits } from '@/lib/utils/plan-limits';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      queue_entry_id,
      customer_id,
      customer_name,
      customer_id_display,
      car_name,
      car_model,
      vehicle_type,
      vehicle_number,
      service_rating,
      service_quality,
      worker_rating,
      worker_feedback,
      overall_experience,
      would_recommend,
      additional_comments,
    } = body;

    // Validate required fields
    if (!queue_entry_id || !customer_id || !customer_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check subscription and feature access
    const subscriptionCheck = await checkSubscriptionAccess(session.user.id);
    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        { error: subscriptionCheck.error || 'Subscription required' },
        { status: 403 }
      );
    }

    // Check if customerFeedback feature is available
    const planType = subscriptionCheck.subscription?.planType || 'starter';
    const hasFeedbackFeature = hasFeature(planType, 'customerFeedback');
    
    if (!hasFeedbackFeature) {
      // Check customer count limit (same pattern as other features)
      const { getUsageCounts } = await import('@/lib/utils/subscription-helpers');
      const usage = await getUsageCounts(session.user.id);
      const limits = getPlanLimits(planType);
      const maxCustomers = limits.maxCustomers;

      // If unlimited, allow
      if (maxCustomers !== null && usage.customers >= maxCustomers) {
        return NextResponse.json(
          {
            error: 'Feature not available',
            details: 'Customer Feedback is only available in Professional or Enterprise plans. You\'ve reached your customer limit. Upgrade your plan to continue using this feature.',
            showUpgradeModal: true,
            requiredFeature: 'customerFeedback',
          },
          { status: 403 }
        );
      }
    }

    // Insert feedback
    const adminSupabase = createAdminClient();
    const { data: feedback, error } = await adminSupabase
      .from('feedbacks')
      .insert({
        admin_id: session.user.id,
        queue_entry_id,
        customer_id,
        customer_name,
        customer_id_display,
        car_name,
        car_model,
        vehicle_type,
        vehicle_number,
        service_rating: service_rating || null,
        service_quality: service_quality || null,
        worker_rating: worker_rating || null,
        worker_feedback: worker_feedback || null,
        overall_experience: overall_experience || null,
        would_recommend: would_recommend === undefined ? null : would_recommend,
        additional_comments: additional_comments?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating feedback:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback', details: error.message },
        { status: 500 }
      );
    }

    // Send email notification to admin
    try {
      await sendFeedbackNotification(session.user.id, {
        customerName: customer_name,
        customerId: customer_id_display || customer_id,
        serviceRating: service_rating || 0,
        serviceQuality: service_quality || '',
        workerRating: worker_rating || undefined,
        workerFeedback: worker_feedback || undefined,
        overallExperience: overall_experience || '',
        wouldRecommend: would_recommend === undefined ? undefined : would_recommend,
        additionalComments: additional_comments || undefined,
        vehicleType: vehicle_type || undefined,
        vehicleNumber: vehicle_number || undefined,
      });
      console.log(`📧 Feedback notification email sent to admin ${session.user.id}`);
    } catch (emailError) {
      console.error('Error sending feedback notification email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check subscription and feature access
    const subscriptionCheck = await checkSubscriptionAccess(session.user.id);
    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        { error: subscriptionCheck.error || 'Subscription required' },
        { status: 403 }
      );
    }

    // Check if customerFeedback feature is available
    const planType = subscriptionCheck.subscription?.planType || 'starter';
    const hasFeedbackFeature = hasFeature(planType, 'customerFeedback');
    
    if (!hasFeedbackFeature) {
      const { getUsageCounts } = await import('@/lib/utils/subscription-helpers');
      const usage = await getUsageCounts(session.user.id);
      const limits = getPlanLimits(planType);
      const maxCustomers = limits.maxCustomers;

      if (maxCustomers !== null && usage.customers >= maxCustomers) {
        return NextResponse.json(
          {
            error: 'Feature not available',
            details: 'Customer Feedback is only available in Professional or Enterprise plans. You\'ve reached your customer limit.',
            showUpgradeModal: true,
            requiredFeature: 'customerFeedback',
          },
          { status: 403 }
        );
      }
    }

    // Get user profile to check if super admin
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    // Fetch feedbacks - all admins see all feedbacks
    // This allows admins to see feedback from all customers, including public feedback
    const { data: feedbacks, error } = await adminSupabase
      .from('feedbacks')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedbacks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedbacks', details: error.message },
        { status: 500 }
      );
    }

    console.log(`📊 Fetched ${feedbacks?.length || 0} feedbacks for user ${session.user.id}`);
    return NextResponse.json({ feedbacks: feedbacks || [] });
  } catch (error) {
    console.error('Error in feedback GET API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedbacks', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get feedback ID from URL
    const url = new URL(request.url);
    const feedbackId = url.searchParams.get('id');

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'Feedback ID is required' },
        { status: 400 }
      );
    }

    // Check subscription and feature access
    const subscriptionCheck = await checkSubscriptionAccess(session.user.id);
    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        { error: subscriptionCheck.error || 'Subscription required' },
        { status: 403 }
      );
    }

    // Get user profile to check if super admin
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    // Check if user owns the feedback or is super admin
    const { data: feedback } = await adminSupabase
      .from('feedbacks')
      .select('admin_id')
      .eq('id', feedbackId)
      .single();

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Only allow deletion if user is super admin or owns the feedback
    if (profile?.role !== 'super_admin' && feedback.admin_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this feedback' },
        { status: 403 }
      );
    }

    // Delete feedback
    const { error } = await adminSupabase
      .from('feedbacks')
      .delete()
      .eq('id', feedbackId);

    if (error) {
      console.error('Error deleting feedback:', error);
      return NextResponse.json(
        { error: 'Failed to delete feedback', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error in feedback DELETE API:', error);
    return NextResponse.json(
      { error: 'Failed to delete feedback', details: (error as Error).message },
      { status: 500 }
    );
  }
}

