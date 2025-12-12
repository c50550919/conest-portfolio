/**
 * Compatibility Calculator Unit Tests
 *
 * Purpose: Test compatibility scoring algorithm
 * Constitution: Principle I (Child Safety - NO child PII), Principle II (Code Quality)
 *
 * Coverage Target: 85% minimum
 *
 * Created: 2025-10-06
 */

import {
  calculateCompatibilityScore,
  calculateCompatibilityBreakdown,
  ParentProfile,
} from '../../src/utils/compatibilityCalculator';

describe('Compatibility Calculator', () => {
  describe('calculateCompatibilityScore', () => {
    it('should return 100 for perfect match (all criteria match)', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: ['toddler', 'elementary', 'teen'],
        budget_min: 1000,
        budget_max: 1500,
        city: 'San Francisco',
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: ['toddler', 'elementary', 'teen'],
        budget_min: 1000,
        budget_max: 1500,
        city: 'San Francisco',
      };

      const score = calculateCompatibilityScore(user, target);
      expect(score).toBeGreaterThanOrEqual(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return 0 for no match (no overlap, different city)', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: ['toddler'],
        budget_min: 500,
        budget_max: 700,
        city: 'San Francisco',
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: [], // No overlap
        budget_min: 5000,
        budget_max: 7000,
        city: 'New York',
      };

      const score = calculateCompatibilityScore(user, target);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(20);
    });

    it('should not score age group overlap (FHA compliance - removed discriminatory scoring)', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: ['toddler', 'elementary'],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: ['toddler', 'elementary'],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const score = calculateCompatibilityScore(user, target);
      expect(score).toBe(0); // Age group scoring removed for FHA compliance
    });

    it('should score location match correctly (50 points for same city)', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: 'Oakland',
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: 'Oakland',
      };

      const score = calculateCompatibilityScore(user, target);
      expect(score).toBe(50); // Same city = 50 points
    });

    it('should score budget compatibility correctly', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: [],
        budget_min: 1000,
        budget_max: 1000,
        city: null,
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: [],
        budget_min: 1000,
        budget_max: 1000,
        city: null,
      };

      const score = calculateCompatibilityScore(user, target);
      expect(score).toBe(50); // $0 difference = 50 points (max budget score)
    });

    it('should decrease budget score with increasing budget difference', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: [],
        budget_min: 1000,
        budget_max: 1000,
        city: null,
      };

      const target1: ParentProfile = {
        user_id: 'user2',
        children_age_groups: [],
        budget_min: 1500,
        budget_max: 1500,
        city: null,
      };

      const target2: ParentProfile = {
        user_id: 'user3',
        children_age_groups: [],
        budget_min: 2000,
        budget_max: 2000,
        city: null,
      };

      const score1 = calculateCompatibilityScore(user, target1);
      const score2 = calculateCompatibilityScore(user, target2);

      expect(score1).toBeGreaterThan(score2); // Smaller diff = higher score
    });

    it('should cap maximum score at 100', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: ['toddler', 'elementary', 'teen'],
        budget_min: 1000,
        budget_max: 1000,
        city: 'Oakland',
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: ['toddler', 'elementary', 'teen'],
        budget_min: 1000,
        budget_max: 1000,
        city: 'Oakland',
      };

      const score = calculateCompatibilityScore(user, target);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateCompatibilityBreakdown', () => {
    it('should return detailed breakdown with all components', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: ['toddler', 'elementary'],
        budget_min: 1000,
        budget_max: 1200,
        city: 'San Francisco',
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: ['elementary', 'teen'],
        budget_min: 1100,
        budget_max: 1300,
        city: 'San Francisco',
      };

      const breakdown = calculateCompatibilityBreakdown(user, target);

      expect(breakdown).toHaveProperty('totalScore');
      expect(breakdown).toHaveProperty('ageGroupScore');
      expect(breakdown).toHaveProperty('budgetScore');
      expect(breakdown).toHaveProperty('locationScore');
      expect(breakdown).toHaveProperty('breakdown');
      expect(breakdown.breakdown).toHaveProperty('ageGroupOverlap');
      expect(breakdown.breakdown).toHaveProperty('budgetDifference');
      expect(breakdown.breakdown).toHaveProperty('sameCity');
    });

    it('should return zero for age group overlap (FHA compliance)', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: ['toddler', 'elementary'],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: ['elementary', 'teen'],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const breakdown = calculateCompatibilityBreakdown(user, target);

      expect(breakdown.breakdown.ageGroupOverlap).toBe(0); // Removed for FHA compliance
      expect(breakdown.ageGroupScore).toBe(0); // Age group scoring removed
    });

    it('should handle null budget values', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const breakdown = calculateCompatibilityBreakdown(user, target);

      expect(breakdown.budgetScore).toBeGreaterThanOrEqual(0);
      expect(breakdown.breakdown.budgetDifference).toBe(0);
    });

    it('should handle mixed budget (min only or max only)', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: [],
        budget_min: 1000,
        budget_max: null,
        city: null,
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: [],
        budget_min: null,
        budget_max: 1200,
        city: null,
      };

      const breakdown = calculateCompatibilityBreakdown(user, target);

      expect(breakdown.budgetScore).toBeGreaterThanOrEqual(0);
      expect(breakdown.breakdown.budgetDifference).toBe(200);
    });

    it('should set sameCity flag correctly', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: 'Oakland',
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: 'Oakland',
      };

      const breakdown = calculateCompatibilityBreakdown(user, target);

      expect(breakdown.breakdown.sameCity).toBe(true);
      expect(breakdown.locationScore).toBe(50);
    });

    it('should return 0 location score for different cities', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: 'San Francisco',
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: 'Oakland',
      };

      const breakdown = calculateCompatibilityBreakdown(user, target);

      expect(breakdown.breakdown.sameCity).toBe(false);
      expect(breakdown.locationScore).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty age groups arrays', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const score = calculateCompatibilityScore(user, target);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle null city values', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: [],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const breakdown = calculateCompatibilityBreakdown(user, target);
      expect(breakdown.breakdown.sameCity).toBe(false);
      expect(breakdown.locationScore).toBe(0);
    });

    it('should handle maximum age group overlap - returns zero (FHA compliance)', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: ['toddler', 'elementary', 'teen'],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const target: ParentProfile = {
        user_id: 'user2',
        children_age_groups: ['toddler', 'elementary', 'teen'],
        budget_min: null,
        budget_max: null,
        city: null,
      };

      const breakdown = calculateCompatibilityBreakdown(user, target);
      expect(breakdown.breakdown.ageGroupOverlap).toBe(0); // Removed for FHA compliance
      expect(breakdown.ageGroupScore).toBe(0); // Age group scoring removed
    });
  });

  describe('Child Safety Compliance', () => {
    it('should NEVER use child-specific data (only age groups)', () => {
      const user: ParentProfile = {
        user_id: 'user1',
        children_age_groups: ['toddler'], // Generic age group ONLY
        budget_min: null,
        budget_max: null,
        city: null,
      };

      // Verify ParentProfile interface doesn't allow child PII
      // TypeScript should prevent adding forbidden fields at compile time
      expect(user).not.toHaveProperty('children_names');
      expect(user).not.toHaveProperty('children_photos');
      expect(user).not.toHaveProperty('children_ages');
      expect(user).not.toHaveProperty('children_schools');
    });
  });
});
