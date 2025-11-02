import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      length: url.length,
      startsWith: url.startsWith('https://'),
      endsWith: url.endsWith('.supabase.co'),
      preview: url.substring(0, 30) + '...',
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      length: anonKey.length,
      startsWith: anonKey.startsWith('eyJ'),
      endsWith: anonKey.endsWith('==') || anonKey.endsWith('=') || anonKey.length > 100,
      preview: anonKey.substring(0, 20) + '...',
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      length: serviceKey.length,
      startsWith: serviceKey.startsWith('eyJ'),
      endsWith: serviceKey.endsWith('==') || serviceKey.endsWith('=') || serviceKey.length > 100,
      preview: serviceKey.substring(0, 20) + '...',
    },
    RESEND_API_KEY: {
      exists: !!process.env.RESEND_API_KEY,
      startsWith: process.env.RESEND_API_KEY?.startsWith('re_'),
    },
    RESEND_FROM_EMAIL: {
      exists: !!process.env.RESEND_FROM_EMAIL,
      value: process.env.RESEND_FROM_EMAIL || '(not set - will use default)',
    },
    BREVO_API_KEY: {
      exists: !!process.env.BREVO_API_KEY,
      startsWith: process.env.BREVO_API_KEY?.startsWith('xkeysib-'),
      note: 'Brevo API key found - will use Brevo for sending to any email address',
    },
  });
}


