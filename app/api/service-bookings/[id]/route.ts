import { createClient } from '@/lib/supabase/server';
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

    const { id } = await params;
    const body = await request.json();
    const { status, admin_notes } = body;

    // Validate status if provided
    const validStatuses = ['pending', 'contacted', 'confirmed', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: pending, contacted, confirmed, completed, or cancelled' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes || null;
    }

    const { data: booking, error } = await supabase
      .from('service_bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service booking:', error);
      throw error;
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error updating service booking:', error);
    return NextResponse.json(
      { error: 'Failed to update service booking', details: (error as Error).message },
      { status: 500 }
    );
  }
}

