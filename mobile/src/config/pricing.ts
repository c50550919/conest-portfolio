/**
 * Pricing Configuration (Mobile)
 *
 * Feature: 003-complete-3-critical (Payment-First Architecture)
 * Last Updated: 2025-01-11
 *
 * Client-side pricing configuration for display in the mobile app.
 * Must match backend pricing configuration exactly.
 *
 * Constitution Principle III: Transparent pricing display
 * Constitution Principle IV: Sub-100ms UI rendering for pricing screens
 */

/**
 * Verification Pricing
 * One-time payment required to unlock messaging after match
 */
export const VERIFICATION_PRICING = {
  /**
   * Display values for UI
   */
  amount: 39.0,
  displayPrice: '$39',
  description: 'ID Verification + Background Check',

  /**
   * Features included
   */
  features: [
    'Verified badge on your profile',
    'Background check (Certn)',
    'ID verification (Veriff)',
    'Unlock messaging with matches',
    'Limited swipes (10/day)',
  ],

  /**
   * What\'s included breakdown for UI
   */
  breakdown: [
    {
      icon: 'shield-check',
      title: 'Background Check',
      description: 'Comprehensive criminal record check',
    },
    {
      icon: 'id-card',
      title: 'ID Verification',
      description: 'Government-issued ID verification',
    },
    {
      icon: 'badge-check',
      title: 'Verified Badge',
      description: 'Stand out with verified status',
    },
  ],

  /**
   * Refund policy text for display
   */
  refundPolicy: {
    automated_fail: '100% refund if background check fails',
    courtesy_30day: '40% refund within 30 days of purchase',
  },
} as const;

/**
 * Premium Subscription Pricing
 * Monthly recurring subscription for enhanced features
 */
export const PREMIUM_PRICING = {
  /**
   * Display values for UI
   */
  monthlyAmount: 14.99,
  displayPrice: '$14.99/month',
  description: 'Unlimited swipes + advanced features',

  /**
   * Features included
   */
  features: [
    'Unlimited swipes',
    'Advanced filters (schedule, parenting style, income)',
    'See who liked you before swiping',
    'Read receipts on messages',
    'Priority matching (shown first)',
  ],

  /**
   * Feature details for UI cards
   */
  featureDetails: [
    {
      icon: 'infinite',
      title: 'Unlimited Swipes',
      description: 'Swipe as much as you want, no daily limit',
    },
    {
      icon: 'filter',
      title: 'Advanced Filters',
      description: 'Filter by schedule, parenting style, and more',
    },
    {
      icon: 'eye',
      title: 'See Who Likes You',
      description: 'Know who\'s interested before you swipe',
    },
    {
      icon: 'check-double',
      title: 'Read Receipts',
      description: 'See when messages are read',
    },
    {
      icon: 'star',
      title: 'Priority Matching',
      description: 'Your profile shown first in discovery',
    },
  ],

  /**
   * Requirements
   */
  requirements: 'Must be verified to purchase premium',
} as const;

/**
 * Bundle Pricing - BEST VALUE
 * Verification + 6 months premium
 */
export const BUNDLE_PRICING = {
  /**
   * Display values for UI
   */
  amount: 99.0,
  displayPrice: '$99',
  description: 'Get verified + 6 months premium',

  /**
   * Savings calculation for display
   */
  savings: {
    regularPrice: 128.94, // $39 + (6 × $14.99)
    bundlePrice: 99.0,
    savingsAmount: 29.94,
    savingsPercent: 23,
    displaySavings: 'Save $29.94 (23%)',
  },

  /**
   * What's included
   */
  includes: [
    'Everything in Verification',
    'Everything in Premium',
    '6 months of premium features',
    'Best value for serious users',
  ],

  /**
   * Recommended badge
   */
  recommended: true,
  recommendedText: 'BEST VALUE',

  /**
   * Feature summary for bundle card
   */
  features: [
    'Verified badge + background check',
    'Unlimited swipes for 6 months',
    'All premium features for 6 months',
    'Priority matching',
    'Advanced filters',
  ],
} as const;

/**
 * Pricing Tiers for Pricing Screen
 */
export const PRICING_TIERS = [
  {
    id: 'browse',
    name: 'Browse',
    price: 0,
    displayPrice: 'Free',
    description: 'Explore profiles in your area',
    features: [
      'View profiles',
      'See compatibility scores',
    ],
    restrictions: [
      'No swiping',
      'No messaging',
    ],
    buttonText: 'Continue Browsing',
    buttonStyle: 'outline' as const,
  },
  {
    id: 'verified',
    name: 'Verified',
    price: 39.0,
    displayPrice: '$39',
    billingCycle: 'one-time',
    description: 'Get verified to start matching',
    features: VERIFICATION_PRICING.features,
    buttonText: 'Get Verified',
    buttonStyle: 'primary' as const,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 14.99,
    displayPrice: '$14.99/mo',
    billingCycle: 'monthly',
    description: 'Unlock all premium features',
    features: PREMIUM_PRICING.features,
    requirements: PREMIUM_PRICING.requirements,
    buttonText: 'Go Premium',
    buttonStyle: 'secondary' as const,
  },
  {
    id: 'bundle',
    name: 'Bundle',
    price: 99.0,
    displayPrice: '$99',
    billingCycle: 'one-time',
    description: 'Best value: Verification + 6 months premium',
    badge: 'BEST VALUE',
    badgeColor: '#4CAF50' as const,
    features: BUNDLE_PRICING.features,
    savings: BUNDLE_PRICING.savings.displaySavings,
    recommended: true,
    buttonText: 'Get Bundle',
    buttonStyle: 'accent' as const,
  },
] as const;

/**
 * Helper functions for pricing display
 */
export const PricingHelpers = {
  /**
   * Format price for display
   */
  formatPrice(amount: number): string {
    return `$${amount.toFixed(2)}`;
  },

  /**
   * Calculate bundle savings
   */
  calculateBundleSavings(): {
    amount: number;
    percentage: number;
    display: string;
  } {
    const regular = VERIFICATION_PRICING.amount + (PREMIUM_PRICING.monthlyAmount * 6);
    const bundle = BUNDLE_PRICING.amount;
    const savings = regular - bundle;
    const percentage = Math.round((savings / regular) * 100);

    return {
      amount: savings,
      percentage,
      display: `Save ${this.formatPrice(savings)} (${percentage}%)`,
    };
  },

  /**
   * Get pricing tier by ID
   */
  getTier(tierId: 'browse' | 'verified' | 'premium' | 'bundle') {
    return PRICING_TIERS.find(tier => tier.id === tierId);
  },

  /**
   * Check if user should see bundle recommendation
   */
  shouldRecommendBundle(userStatus: 'new' | 'browsing' | 'verified' | 'premium'): boolean {
    // Recommend bundle to new users and browsers
    return userStatus === 'new' || userStatus === 'browsing';
  },
};

/**
 * Type exports for type safety
 */
export type PricingTierId = 'browse' | 'verified' | 'premium' | 'bundle';
export type ButtonStyle = 'outline' | 'primary' | 'secondary' | 'accent';

/**
 * Pricing screen configuration
 */
export const PRICING_SCREEN_CONFIG = {
  title: 'Choose Your Plan',
  subtitle: 'Find your perfect roommate with verified safety',
  headerImage: require('../../assets/images/pricing-header.png'), // TODO: Add image
  showComparison: true,
  defaultSelectedTier: 'bundle' as PricingTierId,
  animationDuration: 300, // ms
  cardElevation: 4,
} as const;

/**
 * API integration types
 */
export interface CreateVerificationPaymentRequest {
  amount: number; // In cents (3900)
  connectionRequestId?: string;
}

export interface CreatePremiumSubscriptionRequest {
  priceId: string; // Stripe price ID for $14.99/mo
}

export interface CreateBundlePaymentRequest {
  amount: number; // In cents (9900)
}
