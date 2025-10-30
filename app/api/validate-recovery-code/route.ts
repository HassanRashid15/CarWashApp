import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// API endpoint to validate recovery code
export async function POST(request: Request) {
  try {
    const { recoveryCode } = await request.json();

    if (!recoveryCode || typeof recoveryCode !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Recovery code is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const trimmedCode = recoveryCode.trim().toUpperCase();

    // Validate code format
    if (!trimmedCode.startsWith('RCW_') && !trimmedCode.startsWith('UCW_')) {
      return NextResponse.json(
        { valid: false, error: 'Invalid recovery code format. Must start with RCW_ or UCW_' },
        { status: 400 }
      );
    }

    // Check in profiles table (for admin recovery codes)
    if (trimmedCode.startsWith('RCW_')) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, admin_code, recovery_code')
        .eq('recovery_code', trimmedCode)
        .eq('role', 'admin')
        .single();

      if (!profileError && profileData) {
        return NextResponse.json({
          valid: true,
          message: 'Recovery code is valid',
          isAdmin: true,
          adminCode: profileData.admin_code || null,
          email: profileData.email,
          userId: profileData.id,
        });
      } else {
        console.error('Recovery code validation error:', profileError);
      }
    }

    // Recovery code not found
    return NextResponse.json(
      { valid: false, error: 'Invalid recovery code' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Recovery code validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Server error occurred' },
      { status: 500 }
    );
  }
}

