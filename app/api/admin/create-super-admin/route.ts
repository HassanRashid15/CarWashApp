import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createTrialSubscription } from '@/lib/utils/subscription-helpers';

/**
 * POST - Create super admin account
 * This is a one-time setup endpoint to create the super admin user
 * 
 * Security: In production, protect this endpoint or remove it after use
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization check here
    // For now, we'll allow it but you should protect this in production
    
    const supabase = createAdminClient();
    
    const email = 'hassanrashid001@icloud.com';
    const password = '1234567890Hr';
    const firstName = 'Super';
    const lastName = 'Admin';
    
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      user => user.email?.toLowerCase() === email.toLowerCase()
    );
    
    if (existingUser) {
      // User exists, update profile to super_admin if needed
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', existingUser.id)
        .single();
      
      if (existingProfile) {
        // Update role to super_admin
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'super_admin',
            email: email,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
          })
          .eq('id', existingUser.id);
        
        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to update profile', details: updateError.message },
            { status: 500 }
          );
        }
        
        // Verify email if not already verified
        if (!existingUser.email_confirmed_at) {
          await supabase.auth.admin.updateUserById(existingUser.id, {
            email_confirm: true,
          });
        }
        
        return NextResponse.json({
          success: true,
          message: 'Super admin account already exists and has been updated',
          userId: existingUser.id,
          email: email,
          role: 'super_admin',
        });
      }
    }
    
    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-verify email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });
    
    if (createError || !newUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user', details: createError?.message },
        { status: 500 }
      );
    }
    
    const userId = newUser.user.id;
    
    // Create profile with super_admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        role: 'super_admin',
        admin_code: 'SUPER_ADMIN', // Special admin code for super admin
      })
      .select()
      .single();
    
    if (profileError) {
      // If profile creation fails, try to clean up the user
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create profile', details: profileError.message },
        { status: 500 }
      );
    }
    
    // Create trial subscription for super admin (optional, but keeps consistency)
    try {
      await createTrialSubscription(userId);
    } catch (subError) {
      // Non-fatal error, log but continue
      console.warn('Failed to create trial subscription for super admin:', subError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Super admin account created successfully',
      user: {
        id: userId,
        email: email,
        role: 'super_admin',
        verified: true,
      },
      profile: profile,
    });
  } catch (error) {
    console.error('Error creating super admin:', error);
    return NextResponse.json(
      { error: 'Failed to create super admin', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET - Check if super admin exists
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const email = 'hassanrashid001@icloud.com';
    
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );
    
    if (!user) {
      return NextResponse.json({
        exists: false,
        message: 'Super admin account does not exist',
      });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return NextResponse.json({
      exists: true,
      user: {
        id: user.id,
        email: user.email,
        verified: !!user.email_confirmed_at,
      },
      profile: profile,
      isSuperAdmin: profile?.role === 'super_admin',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check super admin', details: (error as Error).message },
      { status: 500 }
    );
  }
}


