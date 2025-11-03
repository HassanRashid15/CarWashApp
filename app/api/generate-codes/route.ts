import { createAdminClient } from '@/lib/supabase/server';
import { generateRecoveryCode, generateUserCode } from '@/lib/utils/admin-helpers';
import { NextRequest, NextResponse } from 'next/server';

// API endpoint to generate and assign codes to existing users
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, admin_code, recovery_code')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    let recoveryCode = null;
    let adminCode = null;

    if (profile.role === 'admin') {
      // Generate recovery code for admin
      recoveryCode = generateRecoveryCode();
      
      // If admin doesn't have admin_code, generate one
      if (!profile.admin_code) {
        const { generateSequentialAdminCode } = await import('@/lib/utils/admin-helpers');
        adminCode = await generateSequentialAdminCode(supabase);
        
        // Update profile with admin code and recovery code
        await supabase
          .from('profiles')
          .update({ admin_code: adminCode, recovery_code: recoveryCode })
          .eq('id', userId);
      } else {
        // Just update recovery code
        await supabase
          .from('profiles')
          .update({ recovery_code: recoveryCode })
          .eq('id', userId);
      }
    } else {
      // Generate user code for regular user
      recoveryCode = generateUserCode();
      
      await supabase
        .from('profiles')
        .update({ recovery_code: recoveryCode })
        .eq('id', userId);
    }

    return NextResponse.json({
      success: true,
      recoveryCode: recoveryCode,
      adminCode: adminCode || profile.admin_code || null,
      message: 'Codes generated and stored successfully',
    });
  } catch (error) {
    console.error('Generate codes error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

