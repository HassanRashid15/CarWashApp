import { createAdminClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// API endpoint to create and store admin codes
export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Admin code is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const trimmedCode = code.trim().toUpperCase();

    // Check if code already exists in profiles table
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, admin_code')
      .eq('admin_code', trimmedCode)
      .single();

    if (existingProfile && !checkError) {
      return NextResponse.json(
        { error: 'Admin code already exists' },
        { status: 409 }
      );
    }

    // Update profile with admin code
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ admin_code: trimmedCode })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile with admin code:', updateError);
      return NextResponse.json(
        { error: 'Failed to store admin code: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      adminCode: updatedProfile?.admin_code,
      message: 'Admin code stored successfully',
    });
  } catch (error) {
    console.error('Store admin code error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

