import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, contactNo } = await request.json();

    if (!email && !contactNo) {
      return NextResponse.json(
        { error: 'Email or contact number is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const results: { emailExists?: boolean; contactNoExists?: boolean } = {};

    // Check email if provided
    if (email) {
      try {
        // Try to get user by email - more efficient than listing all users
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const emailExists = existingUsers?.users?.some(
          (user) => user.email?.toLowerCase() === email.toLowerCase()
        );
        results.emailExists = !!emailExists;
      } catch (error) {
        // If admin API fails, fallback to checking profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', email.toLowerCase())
          .maybeSingle();
        results.emailExists = !!profileData;
      }
    }

    // Check contact number if provided
    if (contactNo) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, contact_no, email')
        .eq('contact_no', contactNo)
        .maybeSingle();

      results.contactNoExists = !!existingProfile;
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Check duplicates error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

