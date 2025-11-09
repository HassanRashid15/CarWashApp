'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView, analytics } from '@/lib/analytics/tracker';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to automatically track page views and set user ID
 */
export function useAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Track page view on route change
    if (pathname) {
      trackPageView(pathname, document.title);
    }
  }, [pathname]);

  useEffect(() => {
    // Set user ID from session
    const setUserId = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          analytics.setUserId(user.id);
        }
      } catch (error) {
        // Silently fail - don't break the app
        console.warn('Failed to set analytics user ID:', error);
      }
    };

    setUserId();
  }, []);
}

