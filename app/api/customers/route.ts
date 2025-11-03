import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    const { data: customers, error } = await supabase
      .from('Customers')
      .select('*')
      .order('entry_time', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ customers: customers || [] });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: (error as Error).message },
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

    // Generate unique_id (format: CUST-YYYYMMDD-XXXX)
    const datePrefix = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const uniqueId = `CUST-${datePrefix}-${randomSuffix}`;

    // Build insert data
    const insertData: any = {
      name: name.trim(),
      unique_id: uniqueId,
      vehicle_type: vehicle_type || 'car',
      status: status || 'waiting',
      entry_time: new Date().toISOString(),
    };

    // Add optional fields only if they have values
    if (phone?.trim()) {
      insertData.phone = phone.trim();
    }
    
    if (vehicle_number?.trim()) {
      insertData.vehicle_number = vehicle_number.trim();
    }
    
    // Add car-specific fields if vehicle type is car
    if (vehicle_type === 'car') {
      if (car_type?.trim()) {
        insertData.car_type = car_type.trim();
      }
      if (car_name?.trim()) {
        insertData.car_name = car_name.trim();
      }
      if (car_year && !isNaN(parseInt(car_year.toString()))) {
        insertData.car_year = parseInt(car_year.toString());
      }
      if (car_color?.trim()) {
        insertData.car_color = car_color.trim();
      }
    }
    
    // Add bike-specific fields if vehicle type is bike
    if (vehicle_type === 'bike') {
      if (bike_type?.trim()) {
        insertData.bike_type = bike_type.trim();
      }
      if (bike_name?.trim()) {
        insertData.bike_name = bike_name.trim();
      }
      if (bike_year && !isNaN(parseInt(bike_year.toString()))) {
        insertData.bike_year = parseInt(bike_year.toString());
      }
      if (bike_color?.trim()) {
        insertData.bike_color = bike_color.trim();
      }
    }
    
    // Add other_details if vehicle type is other
    if (vehicle_type === 'other' && other_details?.trim()) {
      insertData.other_details = other_details.trim();
    }
    
    if (remarks?.trim()) {
      insertData.remarks = remarks.trim();
    }

    // If status is completed or cancelled, set exit_time
    if (status === 'completed' || status === 'cancelled') {
      insertData.exit_time = new Date().toISOString();
    }

    console.log('Inserting customer data:', JSON.stringify(insertData, null, 2));

    const { data: customer, error } = await supabase
      .from('Customers')
      .insert([insertData])
      .select()
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
            error: 'Customers table does not exist. Please create it in Supabase.',
            details: 'See the SQL schema in supabase-customers-table.sql to create the table.',
            supabaseError: error.message
          },
          { status: 500 }
        );
      }

      // Handle column not found errors (like missing car_type, bike_type, etc.)
      if (error.code === '42703' || error.message.includes('column') || error.message.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Database schema mismatch. Missing vehicle-specific columns.',
            details: 'Please run the updated supabase-customers-table.sql migration to add the new columns (car_type, car_name, car_year, car_color, bike_type, bike_name, bike_year, bike_color, other_details).',
            supabaseError: error.message,
            hint: 'Run the SQL migration file in your Supabase SQL Editor to add the missing columns.'
          },
          { status: 500 }
        );
      }

      throw error;
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to create customer',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

