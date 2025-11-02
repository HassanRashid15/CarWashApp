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
      name, 
      phone, 
      vehicle_type,
      vehicle_number,
      car_type,
      car_name,
      car_year,
      car_color,
      bike_type,
      bike_name,
      bike_year,
      bike_color,
      other_details,
      status,
      remarks
    } = body;
    const { id } = await params;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }

    // Validate vehicle_type if provided
    const validVehicleTypes = ['car', 'bike', 'other'];
    if (vehicle_type && !validVehicleTypes.includes(vehicle_type)) {
      return NextResponse.json(
        { error: 'Invalid vehicle type. Must be: car, bike, or other' },
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

    const updateData: any = {
      name: name.trim(),
      phone: phone?.trim() || null,
      vehicle_type: vehicle_type || 'car',
      vehicle_number: vehicle_number?.trim() || null,
      status: status || 'waiting',
      remarks: remarks?.trim() || null,
      updated_at: new Date().toISOString(),
      // Clear vehicle-specific fields when vehicle type changes
      car_type: null,
      car_name: null,
      car_year: null,
      car_color: null,
      bike_type: null,
      bike_name: null,
      bike_year: null,
      bike_color: null,
      other_details: null,
    };
    
    // Add car-specific fields if vehicle type is car
    if (vehicle_type === 'car') {
      if (car_type?.trim()) {
        updateData.car_type = car_type.trim();
      }
      if (car_name?.trim()) {
        updateData.car_name = car_name.trim();
      }
      if (car_year && !isNaN(parseInt(car_year.toString()))) {
        updateData.car_year = parseInt(car_year.toString());
      }
      if (car_color?.trim()) {
        updateData.car_color = car_color.trim();
      }
    }
    
    // Add bike-specific fields if vehicle type is bike
    if (vehicle_type === 'bike') {
      if (bike_type?.trim()) {
        updateData.bike_type = bike_type.trim();
      }
      if (bike_name?.trim()) {
        updateData.bike_name = bike_name.trim();
      }
      if (bike_year && !isNaN(parseInt(bike_year.toString()))) {
        updateData.bike_year = parseInt(bike_year.toString());
      }
      if (bike_color?.trim()) {
        updateData.bike_color = bike_color.trim();
      }
    }
    
    // Add other_details if vehicle type is other
    if (vehicle_type === 'other' && other_details?.trim()) {
      updateData.other_details = other_details.trim();
    }

    // If status is changed to completed or cancelled, set exit_time
    if (status === 'completed' || status === 'cancelled') {
      // Only set exit_time if it hasn't been set yet
      const { data: existingCustomer } = await supabase
        .from('Customers')
        .select('exit_time')
        .eq('id', id)
        .single();

      if (!existingCustomer?.exit_time) {
        updateData.exit_time = new Date().toISOString();
      }
    } else {
      // If status is changed from completed/cancelled back to waiting/washing, clear exit_time
      updateData.exit_time = null;
    }

    const { data: customer, error } = await supabase
      .from('Customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer', details: (error as Error).message },
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
      .from('Customers')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer', details: (error as Error).message },
      { status: 500 }
    );
  }
}

