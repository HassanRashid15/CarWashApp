import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// GET - Fetch all workers
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

    const { data: workers, error } = await supabase
      .from('Workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return NextResponse.json({ workers: [] });
      }
      throw error;
    }

    return NextResponse.json({ workers: workers || [] });
  } catch (error) {
    console.error('Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workers', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Create a new worker
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
      emergency_contact,
      address,
      cnic_no,
      city,
      age,
      status, 
      joined_date, 
      profile_image,
      education_level,
      previous_experience,
      province,
      date_of_birth,
      blood_group,
      salary
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Worker name is required' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['available', 'busy', 'off-duty'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: available, busy, or off-duty' },
        { status: 400 }
      );
    }

    // Generate Employee ID automatically (format: EMP-YYYYMMDD-XXXX)
    const datePrefix = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const employeeId = `EMP-${datePrefix}-${randomSuffix}`;

    // Build insert data, only including fields that should exist
    const insertData: any = {
      name: name.trim(),
      employee_id: employeeId,
    };

    // Add optional fields only if they have values
    if (phone?.trim()) {
      insertData.phone = phone.trim();
    }
    
    if (emergency_contact?.trim()) {
      insertData.emergency_contact = emergency_contact.trim();
    }
    
    if (address?.trim()) {
      insertData.address = address.trim();
    }
    
    if (cnic_no?.trim()) {
      insertData.cnic_no = cnic_no.trim();
    }
    
    if (city?.trim()) {
      insertData.city = city.trim();
    }
    
    if (age && !isNaN(parseInt(age.toString()))) {
      insertData.age = parseInt(age.toString());
    }
    
    if (status && ['available', 'busy', 'off-duty'].includes(status)) {
      insertData.status = status;
    } else {
      insertData.status = 'available';
    }
    
    if (joined_date) {
      // Ensure date is in YYYY-MM-DD format
      insertData.joined_date = joined_date.split('T')[0];
    } else {
      // Default to today's date
      insertData.joined_date = new Date().toISOString().split('T')[0];
    }
    
    if (profile_image?.trim()) {
      insertData.profile_image = profile_image.trim();
    }
    
    if (education_level?.trim()) {
      insertData.education_level = education_level.trim();
    }
    
    if (previous_experience && !isNaN(parseInt(previous_experience.toString()))) {
      insertData.previous_experience = parseInt(previous_experience.toString());
    }
    
    if (province?.trim()) {
      insertData.province = province.trim();
    }
    
    if (date_of_birth) {
      // Ensure date is in YYYY-MM-DD format
      insertData.date_of_birth = date_of_birth.split('T')[0];
    }
    
    if (blood_group?.trim()) {
      insertData.blood_group = blood_group.trim();
    }
    
    if (salary && !isNaN(parseFloat(salary.toString()))) {
      insertData.salary = parseFloat(salary.toString());
    }

    console.log('Inserting worker data:', JSON.stringify(insertData, null, 2));

    const { data: worker, error } = await supabase
      .from('Workers')
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

      // If table doesn't exist, provide helpful error message
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Workers table does not exist. Please create it in Supabase.',
            details: 'See the SQL schema in the documentation to create the table with all required columns.',
            supabaseError: error.message
          },
          { status: 500 }
        );
      }

      // Handle constraint violations
      if (error.code === '23505') {
        return NextResponse.json(
          { 
            error: 'Duplicate entry. A worker with this information already exists.',
            details: error.message
          },
          { status: 400 }
        );
      }

      // Handle foreign key or check constraint violations
      if (error.code === '23514' || error.message.includes('violates check constraint')) {
        return NextResponse.json(
          { 
            error: 'Invalid data. Please check your input values.',
            details: error.message,
            hint: error.hint
          },
          { status: 400 }
        );
      }

      // Handle column type mismatches
      if (error.code === '42804' || error.message.includes('column') || error.message.includes('type')) {
        return NextResponse.json(
          { 
            error: 'Data type mismatch. The Workers table structure may not match expected format.',
            details: error.message,
            hint: 'Please verify the table schema matches the required structure.'
          },
          { status: 500 }
        );
      }

      throw error;
    }

    return NextResponse.json({ worker }, { status: 201 });
  } catch (error) {
    console.error('Error creating worker:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'Failed to create worker',
        details: errorMessage,
        ...(errorStack && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

