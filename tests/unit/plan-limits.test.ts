/**
 * Unit tests for plan limits
 * 
 * Run with: npm test -- plan-limits.test.ts
 * Or: npx vitest plan-limits
 */

import { describe, it, expect } from 'vitest';
import {
  getPlanLimits,
  hasFeature,
  isWithinLimit,
  getLimit,
  PLAN_LIMITS,
} from '@/lib/utils/plan-limits';
import type { PlanType } from '@/lib/utils/plan-limits';

describe('Plan Limits', () => {
  describe('getPlanLimits', () => {
    it('should return correct limits for trial plan', () => {
      const limits = getPlanLimits('trial');
      expect(limits.maxCustomers).toBe(2);
      expect(limits.maxLocations).toBe(1);
      expect(limits.maxWorkers).toBeNull();
    });

    it('should return correct limits for starter plan', () => {
      const limits = getPlanLimits('starter');
      expect(limits.maxCustomers).toBe(15);
      expect(limits.maxLocations).toBe(1);
    });

    it('should return correct limits for professional plan', () => {
      const limits = getPlanLimits('professional');
      expect(limits.maxCustomers).toBe(50);
      expect(limits.maxLocations).toBeNull(); // Unlimited
    });

    it('should return correct limits for enterprise plan', () => {
      const limits = getPlanLimits('enterprise');
      expect(limits.maxCustomers).toBeNull(); // Unlimited
      expect(limits.maxLocations).toBeNull(); // Unlimited
    });

    it('should default to starter for invalid plan type', () => {
      const limits = getPlanLimits('invalid' as PlanType);
      expect(limits.maxCustomers).toBe(15); // Starter default
    });
  });

  describe('hasFeature', () => {
    it('should return true for available features in professional plan', () => {
      expect(hasFeature('professional', 'advancedQueueSystem')).toBe(true);
      expect(hasFeature('professional', 'paymentProcessing')).toBe(true);
      expect(hasFeature('professional', 'monitoring')).toBe(true);
    });

    it('should return false for unavailable features in starter plan', () => {
      expect(hasFeature('starter', 'advancedQueueSystem')).toBe(false);
      expect(hasFeature('starter', 'paymentProcessing')).toBe(false);
      expect(hasFeature('starter', 'monitoring')).toBe(false);
    });

    it('should return true for basic features in all plans', () => {
      const plans: PlanType[] = ['trial', 'starter', 'professional', 'enterprise'];
      plans.forEach((plan) => {
        expect(hasFeature(plan, 'basicQueueManagement')).toBe(true);
        expect(hasFeature(plan, 'workerManagement')).toBe(true);
      });
    });

    it('should return true for all features in enterprise plan', () => {
      expect(hasFeature('enterprise', 'customIntegrations')).toBe(true);
      expect(hasFeature('enterprise', 'apiAccess')).toBe(true);
      expect(hasFeature('enterprise', 'whiteLabelOptions')).toBe(true);
    });
  });

  describe('isWithinLimit', () => {
    it('should return true when count is below limit', () => {
      expect(isWithinLimit('starter', 'maxCustomers', 10)).toBe(true);
      expect(isWithinLimit('professional', 'maxCustomers', 40)).toBe(true);
    });

    it('should return false when count is at or above limit', () => {
      expect(isWithinLimit('starter', 'maxCustomers', 15)).toBe(false);
      expect(isWithinLimit('starter', 'maxCustomers', 20)).toBe(false);
      expect(isWithinLimit('professional', 'maxCustomers', 50)).toBe(false);
    });

    it('should return true for unlimited limits (null)', () => {
      expect(isWithinLimit('enterprise', 'maxCustomers', 1000)).toBe(true);
      expect(isWithinLimit('enterprise', 'maxWorkers', 500)).toBe(true);
    });

    it('should handle trial plan limits correctly', () => {
      expect(isWithinLimit('trial', 'maxCustomers', 1)).toBe(true);
      expect(isWithinLimit('trial', 'maxCustomers', 2)).toBe(false);
      expect(isWithinLimit('trial', 'maxCustomers', 3)).toBe(false);
    });
  });

  describe('getLimit', () => {
    it('should return correct limit value', () => {
      expect(getLimit('starter', 'maxCustomers')).toBe(15);
      expect(getLimit('professional', 'maxCustomers')).toBe(50);
      expect(getLimit('trial', 'maxCustomers')).toBe(2);
    });

    it('should return null for unlimited limits', () => {
      expect(getLimit('enterprise', 'maxCustomers')).toBeNull();
      expect(getLimit('enterprise', 'maxWorkers')).toBeNull();
    });
  });

  describe('PLAN_LIMITS configuration', () => {
    it('should have all required plan types', () => {
      expect(PLAN_LIMITS).toHaveProperty('trial');
      expect(PLAN_LIMITS).toHaveProperty('starter');
      expect(PLAN_LIMITS).toHaveProperty('professional');
      expect(PLAN_LIMITS).toHaveProperty('enterprise');
    });

    it('should have monitoring feature defined', () => {
      expect(PLAN_LIMITS.professional.features.monitoring).toBe(true);
      expect(PLAN_LIMITS.enterprise.features.monitoring).toBe(true);
      expect(PLAN_LIMITS.starter.features.monitoring).toBe(false);
      expect(PLAN_LIMITS.trial.features.monitoring).toBe(false);
    });
  });
});

