'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TestTube } from 'lucide-react';
import { useEffect, useState } from 'react';

export function TestModeBanner() {
  const [testModeStatus, setTestModeStatus] = useState<{
    isTestMode: boolean;
    stripeMode: 'test' | 'live' | 'unknown';
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    // Check test mode status
    const checkTestMode = async () => {
      try {
        const response = await fetch('/api/test-mode-status');
        if (response.ok) {
          const data = await response.json();
          setTestModeStatus(data);
        }
      } catch (error) {
        console.error('Error checking test mode:', error);
      }
    };

    checkTestMode();
  }, []);

  if (!testModeStatus) {
    return null;
  }

  // Show warning if live keys detected
  if (testModeStatus.stripeMode === 'live') {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>⚠️ LIVE MODE DETECTED!</strong> You are using live Stripe keys. 
          This application is in testing phase. Please switch to test keys (sk_test_... and pk_test_...).
        </AlertDescription>
      </Alert>
    );
  }

  // Show test mode indicator
  if (testModeStatus.isTestMode) {
    return (
      <Alert className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
        <TestTube className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>🧪 TEST MODE ACTIVE</strong> - You are using Stripe test keys. 
          All payments are simulated and no real charges will be made.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}


