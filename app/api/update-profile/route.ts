import { createAdminClient } from '@/utils/supabase/server';
import { generateScreenCode } from '@/lib/utils/admin-helpers';
import { NextRequest, NextResponse } from 'next/server';

// Helper: generate next sequential admin code like ACW_001, ACW_002, ...
async function generateSequentialAdminCodeACW(supabase: any): Promise<string> {
  // Fetch max numeric part from existing admin_code values
  const { data, error } = await supabase
    .from('profiles')
    .select('admin_code')
    .not('admin_code', 'is', null);

  if (error) {
    // Fallback to ACW_001 if query fails
    return 'ACW_' + '001';
  }

  let maxNum = 0;
  for (const row of data as Array<{ admin_code: string | null }>) {
    const code = row.admin_code || '';
    const match = code.match(/^ACW_(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num)) maxNum = Math.max(maxNum, num);
    }
  }
  const next = maxNum + 1;
  return `ACW_${String(next).padStart(3, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, firstName, lastName, contactNo, profileImageUrl, isAdmin, adminCode } =
      await request.json();

    console.log('Update profile request:', { userId, firstName, lastName, contactNo, profileImageUrl, isAdmin, adminCode });
    console.log('isAdmin type:', typeof isAdmin, 'value:', isAdmin);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // First, ensure profile exists (create if it doesn't)
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    console.log('Existing profile check:', { existingProfile, checkError });

    if (!existingProfile) {
      // Get user email to create profile
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      console.log('User data fetch:', { userData, userError });
      
      if (userData?.user?.email) {
        // Generate new admin code for admin signup (if not provided, generate new one)
        let finalAdminCode = null as string | null;
        
        if (isAdmin) {
          if (adminCode) {
            // If code was provided (validated existing code), use it
            finalAdminCode = adminCode;
            console.log('Using provided admin code:', finalAdminCode);
          } else {
            // Generate sequential admin code: ACW_001, ACW_002, ...
            finalAdminCode = await generateSequentialAdminCodeACW(supabase);
            console.log('========================================');
            console.log('✅ GENERATED NEW ADMIN CODE:', finalAdminCode);
            console.log('========================================');
          }
        }

        // Create profile if it doesn't exist
        // Store admin_code in profiles table only (no admin_codes table)
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userData.user.email,
            first_name: firstName || null,
            last_name: lastName || null,
            full_name: firstName && lastName ? `${firstName} ${lastName}` : null,
            contact_no: contactNo || null,
            avatar_url: profileImageUrl || null,
            admin_code: finalAdminCode, // Sequential admin code: AKC_0001, AKC_0002, etc.
            role: isAdmin ? 'admin' : 'user',
          })
          .select()
          .single();

        if (createError) {
          console.error('Profile creation error:', createError);
          return NextResponse.json(
            { error: 'Failed to create profile: ' + createError.message },
            { status: 500 }
          );
        }

        console.log('========================================');
        console.log('✅ PROFILE CREATED SUCCESSFULLY!');
        console.log('Admin Code:', finalAdminCode);
        console.log('Profile:', newProfile);
        console.log('========================================');

        // If admin, also generate and store a screen code record
        if (isAdmin && newProfile) {
          const screenCode = generateScreenCode();
          const { error: screenInsertError } = await supabase
            .from('admin_screencode')
            .insert({ user_id: userId, code: screenCode, is_active: true });
          if (screenInsertError) {
            console.error('Failed to insert admin screen code:', screenInsertError);
          } else {
            console.log('✅ Screen code created for admin:', screenCode);
          }
        }

        return NextResponse.json({
          success: true,
          profile: newProfile,
          message: 'Profile created and data saved',
          adminCode: isAdmin ? finalAdminCode : undefined,
        });
      } else {
        return NextResponse.json(
          { error: 'Could not find user email to create profile' },
          { status: 500 }
        );
      }
    }

    // Update profiles table
    // Convert isAdmin to boolean to handle string "true"/"false" from JSON
    const isAdminBool = isAdmin === true || isAdmin === 'true' || isAdmin === 1;
    
    // PRIORITY CHECK: Always check current profile state FIRST
    // If profile is admin but missing admin_code, generate it immediately
    const { data: currentProfileState } = await supabase
      .from('profiles')
      .select('admin_code, role, full_name, first_name, last_name, contact_no, avatar_url')
      .eq('id', userId)
      .single();
    
    console.log('========================================');
    console.log('UPDATE PROFILE - ADMIN CHECK:');
    console.log('isAdmin:', isAdmin, '| isAdminBool:', isAdminBool);
    console.log('existingProfile:', !!existingProfile);
    console.log('adminCode:', adminCode);
    console.log('Current Profile State:', {
      role: currentProfileState?.role,
      admin_code: currentProfileState?.admin_code,
    });
    console.log('========================================');
    
    // PRIMARY CHECK: If profile is admin but missing admin_code, generate it NOW
    if (currentProfileState && currentProfileState.role === 'admin' && !currentProfileState.admin_code) {
      console.log('⚠️ PRIORITY: Admin profile missing admin_code - generating immediately...');
      
      let finalAdminCode: string | null = null;

      if (adminCode) {
        finalAdminCode = adminCode;
        console.log('Using provided admin code:', finalAdminCode);
      } else {
        // Generate sequential admin code: ACW_001, ACW_002, ...
        finalAdminCode = await generateSequentialAdminCodeACW(supabase);
        console.log('========================================');
        console.log('✅ GENERATED NEW ADMIN CODE:', finalAdminCode);
        console.log('========================================');
      }

      // Update profile with ALL fields including admin codes
    const updateData = {
        full_name: firstName && lastName ? `${firstName} ${lastName}` : currentProfileState.full_name || null,
        first_name: firstName || currentProfileState.first_name || null,
        last_name: lastName || currentProfileState.last_name || null,
        contact_no: contactNo || currentProfileState.contact_no || null,
        avatar_url: profileImageUrl || currentProfileState.avatar_url || null,
        admin_code: finalAdminCode,
        role: 'admin',
        updated_at: new Date().toISOString(),
      };

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (profileError) {
        console.error('Profile update error:', profileError);
        return NextResponse.json(
          { error: 'Failed to update profile: ' + profileError.message },
          { status: 500 }
        );
      }

      console.log('========================================');
      console.log('✅ PROFILE UPDATED WITH ADMIN CODE (PRIORITY PATH)!');
      console.log('Admin Code:', finalAdminCode);
      console.log('Profile:', profileData);
      console.log('========================================');

      // Ensure an admin screen code exists for this user (idempotent insert if not exists)
      const screenCode = generateScreenCode();
      const { data: existingScreen, error: screenCheckError } = await supabase
        .from('admin_screencode')
        .select('id, code')
        .eq('user_id', userId)
        .single();

      if (!existingScreen || screenCheckError) {
        const { error: screenInsertError } = await supabase
          .from('admin_screencode')
          .insert({ user_id: userId, code: screenCode, is_active: true });
        if (screenInsertError) {
          console.error('Failed to insert admin screen code:', screenInsertError);
        } else {
          console.log('✅ Screen code created for admin:', screenCode);
        }
      }

      return NextResponse.json({
        success: true,
        profile: profileData,
        message: 'Profile updated successfully with admin code',
        adminCode: finalAdminCode,
      });
    }
    
    // SECONDARY CHECK: If isAdmin flag is true and admin code needs to be generated for new admin
    if (isAdminBool && existingProfile && currentProfileState?.role !== 'admin') {
      // This handles new admin signups where role isn't set yet
      // But we already handled the case above where role='admin' but no code
      console.log('ℹ️ New admin signup detected but role not set yet');
    }

    // Prepare regular update data (for non-admin or admin profiles that already have codes)
    const updateData: any = {
      full_name: firstName && lastName ? `${firstName} ${lastName}` : null,
      first_name: firstName || null,
      last_name: lastName || null,
      contact_no: contactNo || null,
      avatar_url: profileImageUrl || null,
      updated_at: new Date().toISOString(),
    };

    console.log('Updating profile with data:', updateData);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: 'Failed to update profile: ' + profileError.message },
        { status: 500 }
      );
    }

    console.log('========================================');
    console.log('✅ PROFILE UPDATED!');
    console.log('Admin Code:', profileData?.admin_code || 'NOT GENERATED');
    console.log('Recovery Code:', profileData?.recovery_code || 'NOT GENERATED');
    console.log('Profile:', profileData);
    console.log('========================================');

    // Update auth.users metadata if needed
    const { error: userError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          first_name: firstName || null,
          last_name: lastName || null,
          contact_no: contactNo || null,
          avatar_url: profileImageUrl || null,
        },
      }
    );

    if (userError) {
      console.error('User metadata update error:', userError);
      // Don't fail if metadata update fails, profile update is more important
    }

    return NextResponse.json({
      success: true,
      profile: profileData,
      message: 'Profile updated successfully in database',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
