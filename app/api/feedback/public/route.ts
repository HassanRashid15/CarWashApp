import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendFeedbackNotification } from '@/lib/emails/feedback-emails';

// Public feedback endpoint - no authentication required
// Used for customers to submit feedback from public queue page
export async function POST(request: NextRequest) {
  console.log('📝 Public feedback API called');
  try {
    const body = await request.json();
    console.log('📝 Feedback request body:', { 
      queue_entry_id: body.queue_entry_id, 
      customer_id: body.customer_id,
      customer_name: body.customer_name 
    });
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

    // Get admin_id from customer or queue entry
    const adminSupabase = createAdminClient();
    
    // First, try to get admin_id from customer
    const { data: customer } = await adminSupabase
      .from('Customers')
      .select('admin_id')
      .eq('id', customer_id)
      .maybeSingle();

    let adminId: string | null = customer?.admin_id || null;
    
    // If not found in customer, try to get from queue entry's customer relationship
    if (!adminId) {
      const { data: queueEntry } = await adminSupabase
        .from('Queue')
        .select(`
          customer_id,
          customer:Customers(admin_id)
        `)
        .eq('id', queue_entry_id)
        .maybeSingle();

      if (queueEntry && (queueEntry as any).customer?.admin_id) {
        adminId = (queueEntry as any).customer.admin_id;
      }
    }
    
    // If still no admin_id, find any super admin or first admin as fallback
    if (!adminId) {
      const { data: adminProfile } = await adminSupabase
        .from('profiles')
        .select('id')
        .or('role.eq.super_admin,role.eq.admin')
        .limit(1)
        .maybeSingle();
      
      if (adminProfile?.id) {
        adminId = adminProfile.id;
        console.log('⚠️ Using fallback admin_id:', adminId);
      }
    }
    
    if (adminId) {
      console.log('✅ Found admin_id:', adminId);
    } else {
      console.error('❌ Could not find any admin_id - this should not happen');
      return NextResponse.json(
        { 
          error: 'System configuration error',
          details: 'Unable to link feedback to an admin. Please contact support.'
        },
        { status: 500 }
      );
    }

    // Insert feedback
    const { data: feedback, error } = await adminSupabase
      .from('feedbacks')
      .insert({
        admin_id: adminId,
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

    // Send email notification to admin (only if admin_id exists)
    if (adminId) {
      try {
        await sendFeedbackNotification(adminId, {
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
        console.log(`📧 Feedback notification email sent to admin ${adminId}`);
      } catch (emailError) {
        console.error('Error sending feedback notification email:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.log('ℹ️ No admin_id - skipping email notification');
    }

    return NextResponse.json({ feedback, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in public feedback API:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback', details: (error as Error).message },
      { status: 500 }
    );
  }
}

