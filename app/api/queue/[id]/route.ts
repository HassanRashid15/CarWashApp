import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendQueueNotificationEmail, sendPaymentNotificationEmail } from '@/lib/emails/notification-emails';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const body = await request.json();
    const { 
      customer_id,
      queue_number,
      service_type,
      price,
      assigned_worker,
      status,
      payment_status,
      payment_method,
      bank_name,
      start_time,
      end_time,
      remarks
    } = body;
    const { id } = await params;

    // Validate service_type if provided
    if (service_type) {
      const validServiceTypes = ['wash', 'detailing', 'wax', 'interior', 'full_service'];
      if (!validServiceTypes.includes(service_type)) {
        return NextResponse.json(
          { error: 'Invalid service type. Must be: wash, detailing, wax, interior, or full_service' },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['waiting', 'washing', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be: waiting, washing, completed, or cancelled' },
          { status: 400 }
        );
      }
    }

    // Validate payment_status if provided
    if (payment_status) {
      const validPaymentStatuses = ['pending', 'paid', 'unpaid'];
      if (!validPaymentStatuses.includes(payment_status)) {
        return NextResponse.json(
          { error: 'Invalid payment status. Must be: pending, paid, or unpaid' },
          { status: 400 }
        );
      }
    }

    // Validate payment_method if provided
    const validPaymentMethods = ['cash', 'easypaisa', 'jazzcash', 'bank_transfer'];
    if (body.payment_method && !validPaymentMethods.includes(body.payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Must be: cash, easypaisa, jazzcash, or bank_transfer' },
        { status: 400 }
      );
    }

    // Get existing queue entry to preserve certain fields
    const { data: existingEntry } = await supabase
      .from('Queue')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Queue entry not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (customer_id !== undefined) updateData.customer_id = customer_id;
    if (queue_number !== undefined) updateData.queue_number = queue_number;
    if (service_type !== undefined) updateData.service_type = service_type;
    if (price !== undefined) updateData.price = parseFloat(price.toString());
    if (assigned_worker !== undefined) updateData.assigned_worker = assigned_worker;
    if (status !== undefined) updateData.status = status;
    if (payment_status !== undefined) updateData.payment_status = payment_status;
    if (payment_method !== undefined) {
      updateData.payment_method = payment_method || null;
      // Clear bank_name if payment method is not bank_transfer
      if (payment_method !== 'bank_transfer') {
        updateData.bank_name = null;
      } else if (payment_method === 'bank_transfer' && bank_name !== undefined && bank_name) {
        // Set bank_name when switching to bank_transfer
        updateData.bank_name = bank_name;
      }
    }
    if (bank_name !== undefined && payment_method === undefined) {
      // Only update bank_name if payment_method wasn't changed and it's already bank_transfer
      if (existingEntry.payment_method === 'bank_transfer') {
        updateData.bank_name = bank_name || null;
      }
    }
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (remarks !== undefined) updateData.remarks = remarks?.trim() || null;

    // Auto-set start_time if status changes to washing
    if (status === 'washing' && !existingEntry.start_time && !start_time) {
      updateData.start_time = new Date().toISOString();
    }

    // Auto-set end_time if status changes to completed or cancelled
    if ((status === 'completed' || status === 'cancelled') && !existingEntry.end_time && !end_time) {
      updateData.end_time = new Date().toISOString();
    }

    // Don't try to update if updateData is empty
    if (Object.keys(updateData).length === 0) {
      // Return existing entry if no updates
      const { data: existing } = await supabase
        .from('Queue')
        .select(`
          *,
          customer:Customers(id, name, phone, vehicle_number, vehicle_type),
          worker:Workers(id, name, employee_id)
        `)
        .eq('id', id)
        .single();
      return NextResponse.json({ queueEntry: existing });
    }

    const { data: queueEntry, error } = await supabase
      .from('Queue')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        customer:Customers(id, name, phone, vehicle_number, vehicle_type),
        worker:Workers(id, name, employee_id)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Queue entry not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Send email notifications for status changes, worker assignments, and payments
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

          // Check for status change
          if (status && status !== existingEntry.status) {
            await sendQueueNotificationEmail(
              adminProfile.id,
              adminProfile.email,
              'status_change',
              {
                queueNumber: queueEntry.queue_number,
                customerName,
                serviceType: queueEntry.service_type,
                price: queueEntry.price,
                status: queueEntry.status,
                oldStatus: existingEntry.status,
              }
            );
          }

          // Check for worker assignment
          if (assigned_worker !== undefined && assigned_worker !== existingEntry.assigned_worker && assigned_worker) {
            const workerName = (queueEntry.worker as any)?.name || 'Unknown Worker';
            await sendQueueNotificationEmail(
              adminProfile.id,
              adminProfile.email,
              'worker_assigned',
              {
                queueNumber: queueEntry.queue_number,
                customerName,
                serviceType: queueEntry.service_type,
                price: queueEntry.price,
                workerName,
              }
            );
          }

          // Check for payment status change
          if (payment_status && payment_status !== existingEntry.payment_status) {
            if (payment_status === 'paid') {
              await sendPaymentNotificationEmail(
                adminProfile.id,
                adminProfile.email,
                'payment_received',
                {
                  queueNumber: queueEntry.queue_number,
                  customerName,
                  amount: queueEntry.price,
                  paymentMethod: queueEntry.payment_method || 'cash',
                  bankName: queueEntry.bank_name || undefined,
                }
              );
            } else if (payment_status === 'pending' || payment_status === 'unpaid') {
              await sendPaymentNotificationEmail(
                adminProfile.id,
                adminProfile.email,
                'payment_pending',
                {
                  queueNumber: queueEntry.queue_number,
                  customerName,
                  amount: queueEntry.price,
                  paymentMethod: queueEntry.payment_method || 'cash',
                  bankName: queueEntry.bank_name || undefined,
                }
              );
            }
          }
        }
      } catch (emailError) {
        console.error('Error sending notification emails:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ queueEntry });
  } catch (error) {
    console.error('Error updating queue entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && 'details' in error ? (error as any).details : null;
    
    return NextResponse.json(
      { 
        error: 'Failed to update queue entry', 
        details: errorMessage,
        ...(errorDetails && { supabaseDetails: errorDetails })
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const { error } = await supabase
      .from('Queue')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Queue entry not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ message: 'Queue entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting queue entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete queue entry', details: (error as Error).message },
      { status: 500 }
    );
  }
}


