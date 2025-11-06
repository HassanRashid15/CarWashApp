import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const adminSupabase = createAdminClient();

    // Disable 2FA and clear secret
    const { data, error } = await adminSupabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: null,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error disabling 2FA:', error);
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication disabled successfully',
    });
  } catch (error) {
    console.error('2FA Disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}

