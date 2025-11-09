/**
 * Utility functions for plan selection and authentication flow
 */

import { createClient } from '@/lib/supabase/client';
import type { PlanType } from './plan-limits';

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.user;
  } catch (error) {
    console.error('Error checking auth:', error);
    return false;
  }
}

/**
 * Store selected plan in sessionStorage for redirect after login
 */
export function storeSelectedPlan(planType: PlanType): void {
  sessionStorage.setItem('selectedPlan', planType);
}

/**
 * Get stored selected plan from sessionStorage
 */
export function getStoredPlan(): PlanType | null {
  if (typeof window === 'undefined') return null;
  const plan = sessionStorage.getItem('selectedPlan');
  return plan as PlanType | null;
}

/**
 * Clear stored selected plan
 */
export function clearStoredPlan(): void {
  sessionStorage.removeItem('selectedPlan');
}

/**
 * Handle plan selection - checks auth and redirects accordingly
 */
export async function handlePlanSelection(
  planType: PlanType,
  onAuthenticated: (planType: PlanType) => Promise<void>
): Promise<void> {
  const isAuthenticated = await checkAuth();
  
  if (!isAuthenticated) {
    // Store the selected plan
    storeSelectedPlan(planType);
    // Redirect to login with plan info
    window.location.href = `/auth/login?role=admin&plan=${planType}&redirect=checkout`;
    return;
  }
  
  // User is authenticated, proceed with checkout
  await onAuthenticated(planType);
}


