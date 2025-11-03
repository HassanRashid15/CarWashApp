import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Validate admin screen code (format ACW_XXXXXX) against admin_screencode table
export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Screen code is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const trimmed = code.trim().toUpperCase();

    // Basic format check
    if (!/^ACW_\d{6}$/.test(trimmed)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid code format. Use ACW_XXXXXX' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('admin_screencode')
      .select('id, user_id, code, is_active')
      .eq('code', trimmed)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { valid: false, error: 'Code not found or inactive' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      userId: data.user_id,
      code: data.code,
    });
  } catch (error) {
    console.error('Validate screen code error:', error);
    return NextResponse.json(
      { valid: false, error: 'Server error occurred' },
      { status: 500 }
    );
  }
}


