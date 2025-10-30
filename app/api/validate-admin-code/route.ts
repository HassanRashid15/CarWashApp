import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Admin code is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
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
      return NextResponse.json(
        { valid: false, error: 'Database error validating code' },
        { status: 500 }
      );
    }

    if (screenRow) {
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
      return NextResponse.json(
        { valid: false, error: 'Database error validating code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ valid: Boolean(data) });
  } catch (err) {
    return NextResponse.json(
      { valid: false, error: 'Server error' },
      { status: 500 }
    );
  }
}


