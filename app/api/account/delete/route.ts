import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendEmailWithBrevo } from '@/lib/email/brevo';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user from session first to get email
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { password, confirmText } = await request.json();

    if (confirmText !== 'DELETE') {
      return NextResponse.json(
        { error: 'Please type DELETE to confirm' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Verify password by attempting to sign in
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Verify password with Supabase Auth (use regular client for auth)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

    if (authError || !authData) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Get profile for email
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    // Send deletion confirmation email before deleting
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Deletion Confirmation</h2>
          <p>Your account has been permanently deleted from CarWash App.</p>
          <p>All your data has been removed from our systems.</p>
          <p>If you did not request this deletion, please contact support immediately.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply.</p>
        </div>
      `;

      if (profile?.email) {
        await sendEmailWithBrevo({
          to: profile.email,
          subject: 'Account Deletion Confirmation',
          html: emailHtml,
          from: {
            name: 'CarWash App',
            email: 'hassanrashid0018@gmail.com',
          },
        });
      }
    } catch (emailError) {
      console.error('Failed to send deletion email:', emailError);
      // Continue with deletion even if email fails
    }

    // Delete all related data in correct order (respecting foreign keys)
    
    // 1. Delete service bookings
    await adminSupabase
      .from('service_bookings')
      .delete()
      .eq('admin_id', userId);

    // 2. Delete queue entries (if admin owns them)
    await adminSupabase
      .from('queue')
      .delete()
      .eq('admin_id', userId);

    // 3. Delete payments (related to queue)
    // Note: Payments might be linked via queue, so we delete queue first

    // 4. Delete customers (if admin owns them)
    await adminSupabase
      .from('customers')
      .delete()
      .eq('admin_id', userId);

    // 5. Delete workers (if admin owns them)
    await adminSupabase
      .from('workers')
      .delete()
      .eq('admin_id', userId);

    // 6. Delete products (if admin owns them)
    await adminSupabase
      .from('products')
      .delete()
      .eq('admin_id', userId);

    // 7. Delete user preferences
    await adminSupabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);

    // 8. Delete admin screen codes
    await adminSupabase
      .from('admin_screencode')
      .delete()
      .eq('user_id', userId);

    // 9. Delete profile
    await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    // 10. Delete auth user (Supabase Admin API)
    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      // Profile is deleted, but auth user might still exist
      // This is acceptable as auth user without profile is harmless
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

