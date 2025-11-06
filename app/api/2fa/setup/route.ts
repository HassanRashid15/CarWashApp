import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const adminSupabase = createAdminClient();

    // Check if 2FA is already enabled
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('two_factor_enabled, two_factor_secret')
      .eq('id', userId)
      .single();

    if (profile?.two_factor_enabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is already enabled' },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `CarWash App (${userId.slice(0, 8)})`,
      issuer: 'CarWash App',
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Store secret temporarily (will be saved after verification)
    // For now, we'll return it and save it after verification

    return NextResponse.json({
      secret: secret.base32,
      qrCodeUrl,
      manualEntryKey: secret.base32,
    });
  } catch (error) {
    console.error('2FA Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}

