import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// PUT - Update a worker
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
    const { id } = await params;

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

    const updateData: any = {
      name: name.trim(),
      phone: phone?.trim() || null,
      emergency_contact: emergency_contact?.trim() || null,
      address: address?.trim() || null,
      cnic_no: cnic_no?.trim() || null,
      city: city?.trim() || null,
      status: status || 'available',
      profile_image: profile_image?.trim() || null,
      education_level: education_level?.trim() || null,
      province: province?.trim() || null,
      blood_group: blood_group?.trim() || null,
    };

    // Only update age if provided and valid
    if (age && !isNaN(parseInt(age.toString()))) {
      updateData.age = parseInt(age.toString());
    } else if (age === '' || age === null) {
      updateData.age = null;
    }

    // Only update previous_experience if provided and valid
    if (previous_experience && !isNaN(parseInt(previous_experience.toString()))) {
      updateData.previous_experience = parseInt(previous_experience.toString());
    } else if (previous_experience === '' || previous_experience === null) {
      updateData.previous_experience = null;
    }

    // Only update salary if provided and valid
    if (salary && !isNaN(parseFloat(salary.toString()))) {
      updateData.salary = parseFloat(salary.toString());
    } else if (salary === '' || salary === null) {
      updateData.salary = null;
    }

    // Only update joined_date if provided
    if (joined_date) {
      updateData.joined_date = joined_date.split('T')[0];
    }

    // Only update date_of_birth if provided
    if (date_of_birth) {
      updateData.date_of_birth = date_of_birth.split('T')[0];
    } else if (date_of_birth === '' || date_of_birth === null) {
      updateData.date_of_birth = null;
    }

    const { data: worker, error } = await supabase
      .from('Workers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Worker not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ worker });
  } catch (error) {
    console.error('Error updating worker:', error);
    return NextResponse.json(
      { error: 'Failed to update worker', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a worker
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
      .from('Workers')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Worker not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting worker:', error);
    return NextResponse.json(
      { error: 'Failed to delete worker', details: (error as Error).message },
      { status: 500 }
    );
  }
}

