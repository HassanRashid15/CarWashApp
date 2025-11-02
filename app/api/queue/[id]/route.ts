import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    return NextResponse.json({ queueEntry });
  } catch (error) {
    console.error('Error updating queue entry:', error);
    return NextResponse.json(
      { error: 'Failed to update queue entry', details: (error as Error).message },
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

