/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Pricing Configuration
 *
 * Feature: 003-complete-3-critical (Payment-First Architecture)
 * Last Updated: 2025-01-11
 *
 * Central source of truth for all platform pricing.
 * Based on actual provider costs:
 * - Veriff Plus (ID verification): $1.39
 * - Certn Single County (background check): $28.50
 * - Total cost per user: $29.89
 *
 * Constitution Principle III: Transparent pricing with sustainable margins
 */

/**
 * Verification Pricing
 * One-time payment required to unlock messaging after match
 */
export const VERIFICATION_PRICING = {
  /**
   * Standard verification fee
   * Includes: ID verification (Veriff Plus) + background check (Certn Single County)
   * Cost basis: $29.89 (provider costs) + margin for refunds/support/fraud reserves
   */
  AMOUNT_CENTS: 3900, // $39.00
  AMOUNT_DOLLARS: 39.0,

  /**
   * Provider costs (for reference, not charged separately)
   */
  COST_BREAKDOWN: {
    id_verification: 139, // $1.39 (Veriff Plus)
    background_check: 2850, // $28.50 (Certn Single County)
    total: 2989, // $29.89
  },

  /**
   * Revenue Sharing Scenarios (Partner Program Commissions)
   * Updated: 2025-01-11 after Certn/Veriff partner applications
   *
   * Note: These are projected scenarios based on typical partner program rates.
   * Actual rates will be negotiated during partner onboarding.
   */
  REVENUE_SHARE_SCENARIOS: {
    NONE: {
      commission_rate: 0,
      certn_commission: 0,
      veriff_commission: 0,
      total_commission: 0,
      effective_cost: 2989, // $29.89
      net_profit_at_39: 768, // $7.68 (after $1.43 Stripe fee)
      margin_percentage: 19.7,
    },
    CONSERVATIVE: {
      // 12% Certn, 10% Veriff
      commission_rate: 11, // Blended average
      certn_commission: 342, // 12% of $28.50
      veriff_commission: 14, // 10% of $1.39
      total_commission: 356, // $3.56
      effective_cost: 2633, // $26.33 ($29.89 - $3.56)
      net_profit_at_39: 1124, // $11.24 (after $1.43 Stripe fee)
      margin_percentage: 28.8,
    },
    TARGET: {
      // 15% Certn, 12% Veriff
      commission_rate: 14, // Blended average
      certn_commission: 428, // 15% of $28.50
      veriff_commission: 17, // 12% of $1.39
      total_commission: 445, // $4.45
      effective_cost: 2544, // $25.44 ($29.89 - $4.45)
      net_profit_at_39: 1213, // $12.13 (after $1.43 Stripe fee)
      margin_percentage: 31.1,
    },
    OPTIMISTIC: {
      // 18% Certn, 15% Veriff
      commission_rate: 17, // Blended average
      certn_commission: 513, // 18% of $28.50
      veriff_commission: 21, // 15% of $1.39
      total_commission: 534, // $5.34
      effective_cost: 2455, // $24.55 ($29.89 - $5.34)
      net_profit_at_39: 1302, // $13.02 (after $1.43 Stripe fee)
      margin_percentage: 33.4,
    },
    BEST_CASE: {
      // 20% Certn, 18% Veriff + 15% volume discount
      commission_rate: 20, // Commission rate
      certn_commission: 570, // 20% of $28.50
      veriff_commission: 25, // 18% of $1.39
      volume_discount: 448, // 15% off base rates
      total_commission: 1043, // $10.43 (commission + discount)
      effective_cost: 1946, // $19.46 ($29.89 - $10.43)
      net_profit_at_39: 1711, // $17.11 (after $1.43 Stripe fee)
      margin_percentage: 43.9,
    },
  },

  /**
   * Refund policy amounts
   */
  REFUNDS: {
    AUTOMATED_FAIL: {
      percentage: 100,
      amount_cents: 3900, // 100% of $39.00
      reason: 'automated_fail' as const,
      description: 'Background check failed',
    },
    COURTESY_30DAY: {
      percentage: 40,
      amount_cents: 1560, // 40% of $39.00 = $15.60
      reason: 'courtesy_30day' as const,
      description: 'User requested refund within 30 days',
    },
  },
} as const;

/**
 * Premium Subscription Pricing
 * Monthly recurring subscription for enhanced features
 */
export const PREMIUM_PRICING = {
  /**
   * Monthly subscription fee
   * Includes: Unlimited swipes, advanced filters, read receipts, priority matching
   * Cost basis: ~$1.50/mo (infrastructure) with 85% gross margin
   */
  MONTHLY_AMOUNT_CENTS: 1499, // $14.99/month
  MONTHLY_AMOUNT_DOLLARS: 14.99,

  /**
   * Features included in premium
   */
  FEATURES: [
    'unlimited_swipes',
    'advanced_filters',
    'read_receipts',
    'priority_matching',
    'see_who_liked_you',
  ] as const,

  /**
   * Infrastructure cost (for margin calculation)
   */
  COST_PER_MONTH_CENTS: 150, // $1.50/month (Redis, storage, support)
} as const;

/**
 * Bundle Pricing
 * Best value: Verification + 6 months premium
 */
export const BUNDLE_PRICING = {
  /**
   * Bundle price
   * Includes: Verification ($39) + 6 months premium (6 × $14.99 = $89.94)
   * Total value: $128.94
   * Bundle price: $99.00
   * Savings: $29.94 (23% discount)
   */
  AMOUNT_CENTS: 9900, // $99.00
  AMOUNT_DOLLARS: 99.0,

  /**
   * Bundle components
   */
  INCLUDES: {
    verification: VERIFICATION_PRICING.AMOUNT_CENTS,
    premium_months: 6,
    premium_value_cents: 1499 * 6, // $89.94
  },

  /**
   * Value proposition
   */
  VALUE: {
    total_value_cents: 3900 + 1499 * 6, // $128.94
    savings_cents: 2994, // $29.94
    savings_percentage: 23, // 23% discount
  },

  /**
   * Cost breakdown (for margin calculation)
   */
  COST_BREAKDOWN: {
    verification: VERIFICATION_PRICING.COST_BREAKDOWN.total, // $29.89
    premium_6mo_overhead: 900, // 6 × $1.50 = $9.00
    total: 3889, // $38.89
  },
} as const;

/**
 * Pricing tiers summary
 * For display in UI and documentation
 */
export const PRICING_TIERS = {
  FREE: {
    name: 'Browse',
    price_cents: 0,
    features: ['view_profiles', 'see_compatibility'],
    restrictions: ['no_swiping', 'no_messaging'],
  },
  VERIFIED: {
    name: 'Verified',
    price_cents: VERIFICATION_PRICING.AMOUNT_CENTS,
    features: ['swipe_matching', 'messaging', 'verification_badge', 'limited_swipes_10_per_day'],
    restrictions: [],
  },
  PREMIUM: {
    name: 'Premium',
    price_cents: PREMIUM_PRICING.MONTHLY_AMOUNT_CENTS,
    billing: 'monthly' as const,
    features: PREMIUM_PRICING.FEATURES,
    requirements: ['must_be_verified'],
  },
  BUNDLE: {
    name: 'Bundle - Best Value',
    price_cents: BUNDLE_PRICING.AMOUNT_CENTS,
    features: ['all_premium_features', '6_months_included'],
    savings_cents: BUNDLE_PRICING.VALUE.savings_cents,
    recommended: true,
  },
} as const;

/**
 * Helper functions for pricing calculations
 */
export const PricingHelpers = {
  /**
   * Calculate refund amount based on reason
   */
  calculateRefundAmount(reason: 'automated_fail' | 'courtesy_30day'): number {
    if (reason === 'automated_fail') {
      return VERIFICATION_PRICING.REFUNDS.AUTOMATED_FAIL.amount_cents;
    }
    return VERIFICATION_PRICING.REFUNDS.COURTESY_30DAY.amount_cents;
  },

  /**
   * Format cents to dollars for display
   */
  formatCentsToDollars(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  },

  /**
   * Calculate Stripe fee (2.9% + $0.30)
   */
  calculateStripeFee(amountCents: number): number {
    return Math.round(amountCents * 0.029 + 30);
  },

  /**
   * Calculate net profit after Stripe fees
   */
  calculateNetProfit(revenueCents: number, costCents: number): number {
    const stripeFee = this.calculateStripeFee(revenueCents);
    return revenueCents - costCents - stripeFee;
  },

  /**
   * Calculate revenue share commission earnings
   * @param certnRate - Commission rate for Certn (e.g., 0.15 for 15%)
   * @param veriffRate - Commission rate for Veriff (e.g., 0.12 for 12%)
   * @returns Commission earnings in cents
   */
  calculateRevenueShareCommission(certnRate: number, veriffRate: number): number {
    const certnCommission = Math.round(
      VERIFICATION_PRICING.COST_BREAKDOWN.background_check * certnRate,
    );
    const veriffCommission = Math.round(
      VERIFICATION_PRICING.COST_BREAKDOWN.id_verification * veriffRate,
    );
    return certnCommission + veriffCommission;
  },

  /**
   * Calculate effective cost after revenue share
   * @param certnRate - Commission rate for Certn (e.g., 0.15 for 15%)
   * @param veriffRate - Commission rate for Veriff (e.g., 0.12 for 12%)
   * @returns Effective cost in cents after revenue share
   */
  calculateEffectiveCost(certnRate: number, veriffRate: number): number {
    const commission = this.calculateRevenueShareCommission(certnRate, veriffRate);
    return VERIFICATION_PRICING.COST_BREAKDOWN.total - commission;
  },

  /**
   * Calculate net profit with revenue share
   * @param certnRate - Commission rate for Certn (e.g., 0.15 for 15%)
   * @param veriffRate - Commission rate for Veriff (e.g., 0.12 for 12%)
   * @returns Net profit in cents after revenue share and Stripe fees
   */
  calculateNetProfitWithRevenueShare(certnRate: number, veriffRate: number): number {
    const effectiveCost = this.calculateEffectiveCost(certnRate, veriffRate);
    return this.calculateNetProfit(VERIFICATION_PRICING.AMOUNT_CENTS, effectiveCost);
  },

  /**
   * Get revenue share scenario by name
   * @param scenario - Scenario name (NONE, CONSERVATIVE, TARGET, OPTIMISTIC, BEST_CASE)
   * @returns Revenue share scenario data
   */
  getRevenueShareScenario(scenario: keyof typeof VERIFICATION_PRICING.REVENUE_SHARE_SCENARIOS) {
    return VERIFICATION_PRICING.REVENUE_SHARE_SCENARIOS[scenario];
  },
};

/**
 * Type exports for type safety
 */
export type PricingTier = keyof typeof PRICING_TIERS;
export type RefundReason = 'automated_fail' | 'courtesy_30day';
export type PremiumFeature = (typeof PREMIUM_PRICING.FEATURES)[number];
export type RevenueShareScenario = keyof typeof VERIFICATION_PRICING.REVENUE_SHARE_SCENARIOS;
