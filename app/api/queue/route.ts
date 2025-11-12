import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendQueueNotificationEmail } from '@/lib/emails/notification-emails';
import { checkSubscriptionAccess } from '@/lib/utils/subscription-helpers';
import { hasFeature } from '@/lib/utils/plan-limits';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch queue entries with related customer and worker data
    const { data: queueEntries, error } = await supabase
      .from('Queue')
      .select(`
        *,
        customer:Customers(id, name, phone, vehicle_number, vehicle_type, unique_id, car_name, car_year, bike_name, bike_year),
        worker:Workers(id, name, employee_id)
      `)
      .order('queue_number', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return NextResponse.json({ queue: [] });
      }
      throw error;
    }

    return NextResponse.json({ queue: queueEntries || [] });
  } catch (error) {
    console.error('Error fetching queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check subscription for advanced queue system
    const subscriptionCheck = await checkSubscriptionAccess(session.user.id);
    if (!subscriptionCheck.allowed || !subscriptionCheck.subscription) {
      return NextResponse.json(
        { 
          error: 'Subscription required',
          details: 'Advanced Queue System requires a subscription plan.'
        },
        { status: 403 }
      );
    }

    const hasAdvancedQueue = hasFeature(subscriptionCheck.subscription.planType, 'advancedQueueSystem');
    if (!hasAdvancedQueue) {
      return NextResponse.json(
        { 
          error: 'Feature not available',
          details: 'Advanced Queue System is only available in Professional or Enterprise plans. Please upgrade to access this feature.',
          showUpgradeModal: true,
          requiredFeature: 'advancedQueueSystem'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      customer_id,
      service_type,
      price,
      assigned_worker,
      remarks,
      status,
      start_time,
      end_time
    } = body;

    if (!customer_id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    if (!service_type) {
      return NextResponse.json(
        { error: 'Service type is required' },
        { status: 400 }
      );
    }

    // Validate service_type
    const validServiceTypes = ['wash', 'detailing', 'wax', 'interior', 'full_service'];
    if (!validServiceTypes.includes(service_type)) {
      return NextResponse.json(
        { error: 'Invalid service type. Must be: wash, detailing, wax, interior, or full_service' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['waiting', 'washing', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: waiting, washing, completed, or cancelled' },
        { status: 400 }
      );
    }

    // Validate payment_status if provided
    const validPaymentStatuses = ['pending', 'paid', 'unpaid'];
    if (body.payment_status && !validPaymentStatuses.includes(body.payment_status)) {
      return NextResponse.json(
        { error: 'Invalid payment status. Must be: pending, paid, or unpaid' },
        { status: 400 }
      );
    }

    // Validate payment_method if provided
    const validPaymentMethods = ['cash', 'easypaisa', 'jazzcash', 'bank_transfer'];
    if (body.payment_method && !validPaymentMethods.includes(body.payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Must be: cash, easypaisa, jazzcash, or bank_transfer' },
        { status: 400 }
      );
    }

    // Get the next queue number based on today's date (resets daily at midnight)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const { data: todayQueues } = await supabase
      .from('Queue')
      .select('queue_number')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('queue_number', { ascending: false })
      .limit(1);

    const nextQueueNumber = todayQueues && todayQueues.length > 0 && todayQueues[0]?.queue_number
      ? todayQueues[0].queue_number + 1
      : 1;

    // Build insert data
    const insertData: any = {
      customer_id,
      queue_number: nextQueueNumber,
      service_type,
      price: price ? parseFloat(price.toString()) : 0,
      status: status || 'waiting',
      payment_status: body.payment_status || 'pending',
    };

    if (assigned_worker) {
      insertData.assigned_worker = assigned_worker;
    }

    if (start_time) {
      insertData.start_time = start_time;
    }

    if (end_time) {
      insertData.end_time = end_time;
    }

    if (remarks?.trim()) {
      insertData.remarks = remarks.trim();
    }

    if (body.payment_method) {
      insertData.payment_method = body.payment_method;
    }

    if (body.payment_method === 'bank_transfer' && body.bank_name) {
      insertData.bank_name = body.bank_name;
    }

    // If status is washing and no start_time is provided, set it
    if ((status === 'washing' || status === 'completed') && !start_time) {
      insertData.start_time = new Date().toISOString();
    }

    // If status is completed or cancelled, set end_time
    if ((status === 'completed' || status === 'cancelled') && !end_time) {
      insertData.end_time = new Date().toISOString();
    }

    const { data: queueEntry, error } = await supabase
      .from('Queue')
      .insert([insertData])
      .select(`
        *,
        customer:Customers(id, name, phone, vehicle_number, vehicle_type, unique_id, car_name, car_year, bike_name, bike_year),
        worker:Workers(id, name, employee_id)
      `)
      .single();

    if (error) {
      console.error('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Queue table does not exist. Please create it in Supabase.',
            details: 'See the SQL schema in supabase-queue-table.sql to create the table.',
            supabaseError: error.message
          },
          { status: 500 }
        );
      }

      if (error.code === '23503') {
        return NextResponse.json(
          { 
            error: 'Invalid customer or worker ID. Please select a valid customer or worker.',
            details: error.message
          },
          { status: 400 }
        );
      }

      throw error;
    }

    // Send email notification for new queue entry
    if (queueEntry && session.user) {
      try {
        const adminSupabase = createAdminClient();
        const { data: adminProfile } = await adminSupabase
          .from('profiles')
          .select('id, email')
          .eq('id', session.user.id)
          .single();

        if (adminProfile?.email && adminProfile?.id) {
          const customerName = (queueEntry.customer as any)?.name || 'Unknown Customer';
          await sendQueueNotificationEmail(
            adminProfile.id,
            adminProfile.email,
            'new_entry',
            {
              queueNumber: queueEntry.queue_number,
              customerName,
              serviceType: queueEntry.service_type,
              price: queueEntry.price,
              status: queueEntry.status,
            }
          );

          // If worker is assigned, send worker assignment notification
          if (queueEntry.assigned_worker && (queueEntry.worker as any)?.name) {
            await sendQueueNotificationEmail(
              adminProfile.id,
              adminProfile.email,
              'worker_assigned',
              {
                queueNumber: queueEntry.queue_number,
                customerName,
                serviceType: queueEntry.service_type,
                price: queueEntry.price,
                workerName: (queueEntry.worker as any).name,
              }
            );
          }
        }
      } catch (emailError) {
        console.error('Error sending queue notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ queueEntry }, { status: 201 });
  } catch (error) {
    console.error('Error creating queue entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to create queue entry',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}


