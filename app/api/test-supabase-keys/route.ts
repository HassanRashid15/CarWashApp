import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET() {
  const results: any = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
    anonKey: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...' || 'MISSING',
      testResult: null as any,
    },
    serviceKey: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      preview: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30) + '...' || 'MISSING',
      testResult: null as any,
    },
  };

  // Test anon key
  if (results.url !== 'MISSING' && results.anonKey.exists) {
    try {
      const anonClient = createSupabaseClient(
        results.url,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // Simple test query - try to get auth info
      const { data, error } = await anonClient.auth.getSession();
      
      results.anonKey.testResult = {
        success: true,
        error: null,
        message: 'Anon key is valid',
      };
    } catch (error: any) {
      results.anonKey.testResult = {
        success: false,
        error: error.message,
        code: error.code,
        hint: error.hint,
      };
    }
  }

  // Test service role key
  if (results.url !== 'MISSING' && results.serviceKey.exists) {
    try {
      const serviceClient = createSupabaseClient(
        results.url,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Test with admin auth call
      const { data, error } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      
      results.serviceKey.testResult = {
        success: true,
        error: null,
        message: 'Service role key is valid',
      };
    } catch (error: any) {
      results.serviceKey.testResult = {
        success: false,
        error: error.message,
        code: error.code,
        hint: error.hint,
      };
    }
  }

  return NextResponse.json(results, { status: 200 });
}

