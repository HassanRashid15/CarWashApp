import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Admin code is required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for validation
    const supabase = createAdminClient();
    const normalized = code.trim().toUpperCase();

    if (!/^ACW_\d{3,}$/.test(normalized)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid admin code format' },
        { status: 400 }
      );
    }

    // 1) Check admin_screencode table (active codes)
    const { data: screenRow, error: screenErr } = await supabase
      .from('admin_screencode')
      .select('user_id')
      .eq('code', normalized)
      .eq('is_active', true)
      .maybeSingle();

    if (screenErr) {
      // If table doesn't exist, that's okay - fall through to profiles check
      if (screenErr.code === '42P01' || screenErr.message?.includes('does not exist')) {
        console.log('admin_screencode table does not exist, checking profiles...');
      } else {
        console.error('Error checking admin_screencode:', screenErr);
        return NextResponse.json(
          { valid: false, error: 'Database error validating code', details: screenErr.message },
          { status: 500 }
        );
      }
    } else if (screenRow) {
      return NextResponse.json({ valid: true });
    }

    // 2) Fallback: check profiles.admin_code (for sequential profile-linked codes)
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('admin_code', normalized)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('Error checking profiles:', error);
      return NextResponse.json(
        { valid: false, error: 'Database error validating code', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ valid: Boolean(data) });
  } catch (err) {
    console.error('Validate admin code error:', err);
    return NextResponse.json(
      { valid: false, error: 'Server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


