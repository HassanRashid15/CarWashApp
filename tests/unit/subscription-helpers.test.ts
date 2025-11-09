import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlanLimits, hasFeature, isWithinLimit, type PlanType } from '@/lib/utils/plan-limits';

describe('Subscription Logic', () => {
  describe('getPlanLimits', () => {
    it('should return correct limits for trial plan', () => {
      const limits = getPlanLimits('trial');
      expect(limits.maxCustomers).toBe(2);
      expect(limits.maxWorkers).toBeNull();
      expect(limits.features.advancedQueueSystem).toBe(false);
      expect(limits.features.paymentProcessing).toBe(false);
    });

    it('should return correct limits for starter plan', () => {
      const limits = getPlanLimits('starter');
      expect(limits.maxCustomers).toBe(15);
      expect(limits.maxWorkers).toBeNull();
      expect(limits.features.advancedQueueSystem).toBe(false);
      expect(limits.features.paymentProcessing).toBe(false);
    });

    it('should return correct limits for professional plan', () => {
      const limits = getPlanLimits('professional');
      expect(limits.maxCustomers).toBe(50);
      expect(limits.maxWorkers).toBeNull();
      expect(limits.features.advancedQueueSystem).toBe(true);
      expect(limits.features.paymentProcessing).toBe(true);
      expect(limits.features.monitoring).toBe(true);
      expect(limits.features.feedback).toBe(true);
    });

    it('should return correct limits for enterprise plan', () => {
      const limits = getPlanLimits('enterprise');
      expect(limits.maxCustomers).toBeNull(); // Unlimited
      expect(limits.maxWorkers).toBeNull();
      expect(limits.features.advancedQueueSystem).toBe(true);
      expect(limits.features.paymentProcessing).toBe(true);
      expect(limits.features.multiLocationSupport).toBe(true);
      expect(limits.features.apiAccess).toBe(true);
    });
  });

  describe('hasFeature', () => {
    it('should return false for trial plan accessing advanced features', () => {
      expect(hasFeature('trial', 'advancedQueueSystem')).toBe(false);
      expect(hasFeature('trial', 'paymentProcessing')).toBe(false);
      expect(hasFeature('trial', 'monitoring')).toBe(false);
    });

    it('should return true for professional plan accessing advanced features', () => {
      expect(hasFeature('professional', 'advancedQueueSystem')).toBe(true);
      expect(hasFeature('professional', 'paymentProcessing')).toBe(true);
      expect(hasFeature('professional', 'monitoring')).toBe(true);
      expect(hasFeature('professional', 'feedback')).toBe(true);
    });

    it('should return true for enterprise plan accessing all features', () => {
      expect(hasFeature('enterprise', 'multiLocationSupport')).toBe(true);
      expect(hasFeature('enterprise', 'apiAccess')).toBe(true);
      expect(hasFeature('enterprise', 'whiteLabelOptions')).toBe(true);
    });
  });

  describe('isWithinLimit', () => {
    it('should return true when within customer limit', () => {
      expect(isWithinLimit('starter', 'customers', 10)).toBe(true);
      expect(isWithinLimit('starter', 'customers', 15)).toBe(true);
    });

    it('should return false when exceeding customer limit', () => {
      expect(isWithinLimit('starter', 'customers', 16)).toBe(false);
      expect(isWithinLimit('trial', 'customers', 3)).toBe(false);
    });

    it('should return true for unlimited plans', () => {
      expect(isWithinLimit('enterprise', 'customers', 1000)).toBe(true);
      expect(isWithinLimit('enterprise', 'customers', 10000)).toBe(true);
    });

    it('should handle null limits as unlimited', () => {
      expect(isWithinLimit('professional', 'workers', 100)).toBe(true);
      expect(isWithinLimit('enterprise', 'products', 1000)).toBe(true);
    });
  });
});

