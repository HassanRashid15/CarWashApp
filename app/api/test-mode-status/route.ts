import { NextRequest, NextResponse } from 'next/server';
import { getTestModeStatus } from '@/lib/utils/test-mode';

/**
 * GET - Get test mode status
 * This endpoint allows the frontend to check if we're in test mode
 */
export async function GET(request: NextRequest) {
  try {
    const status = getTestModeStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting test mode status:', error);
    return NextResponse.json(
      { 
        isTestMode: false,
        stripeMode: 'unknown' as const,
        warnings: ['Unable to determine test mode status']
      },
      { status: 500 }
    );
  }
}



