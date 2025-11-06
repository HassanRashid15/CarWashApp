import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import speakeasy from 'speakeasy';

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
    const { token, secret } = await request.json();

    if (!token || !secret) {
      return NextResponse.json(
        { error: 'Token and secret are required' },
        { status: 400 }
      );
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps (60 seconds) of tolerance
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Generate backup codes (8 codes, 8 characters each)
    const backupCodes = Array.from({ length: 8 }, () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    });

    // Save 2FA secret and enable 2FA
    const { data, error } = await adminSupabase
      .from('profiles')
      .update({
        two_factor_enabled: true,
        two_factor_secret: secret,
        backup_codes: backupCodes,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error enabling 2FA:', error);
      return NextResponse.json(
        { error: 'Failed to enable 2FA' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      backupCodes,
      message: 'Two-factor authentication enabled successfully',
    });
  } catch (error) {
    console.error('2FA Verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}

