/**
 * Unified Billing Service
 *
 * Purpose: Platform-agnostic billing wrapper for iOS and Android
 * Constitution: Principle III (Security - unified receipt validation)
 *              Principle IV (Performance - optimized cross-platform flows)
 *
 * Features:
 * - Automatic platform detection (iOS/Android)
 * - Unified API for all billing operations
 * - Cross-platform product mapping
 * - Consistent error handling
 * - Receipt validation routing
 *
 * Usage:
 * import BillingService from './BillingService';
 *
 * await BillingService.initConnection();
 * const products = await BillingService.getProducts();
 * const result = await BillingService.purchaseProduct('verification_payment');
 */

import { Platform } from 'react-native';
import GooglePlayBillingService, {
  PRODUCT_SKUS,
  BillingProduct,
  BillingSubscription,
  PurchaseResult,
  SubscriptionStatus,
} from './GooglePlayBillingService';
import AppleStoreKitService, { IOS_PRODUCT_IDS } from './AppleStoreKitService';
import { Purchase } from 'react-native-iap';

// Unified product identifiers
export const BILLING_PRODUCTS = {
  VERIFICATION_PAYMENT: 'verification_payment',
  PREMIUM_MONTHLY: 'premium_monthly',
  VERIFICATION_PREMIUM_BUNDLE: 'verification_premium_bundle',
  SUCCESS_FEE: 'success_fee',
} as const;

export type BillingProductId = (typeof BILLING_PRODUCTS)[keyof typeof BILLING_PRODUCTS];

// Product metadata for display
export interface ProductMetadata {
  id: BillingProductId;
  name: string;
  description: string;
  basePrice: number; // in cents
  type: 'subscription' | 'one_time';
}

export const PRODUCT_METADATA: Record<string, ProductMetadata> = {
  [BILLING_PRODUCTS.VERIFICATION_PAYMENT]: {
    id: BILLING_PRODUCTS.VERIFICATION_PAYMENT,
    name: 'Verification Payment',
    description: 'One-time verification fee for ID check and background screening',
    basePrice: 3900, // $39.00
    type: 'one_time',
  },
  [BILLING_PRODUCTS.PREMIUM_MONTHLY]: {
    id: BILLING_PRODUCTS.PREMIUM_MONTHLY,
    name: 'Premium Monthly',
    description: 'Monthly premium subscription with unlimited matches',
    basePrice: 1499, // $14.99
    type: 'subscription',
  },
  [BILLING_PRODUCTS.VERIFICATION_PREMIUM_BUNDLE]: {
    id: BILLING_PRODUCTS.VERIFICATION_PREMIUM_BUNDLE,
    name: 'Verification + Premium Bundle',
    description: 'Verification fee plus 6 months of premium - save $29.94!',
    basePrice: 9900, // $99.00
    type: 'one_time',
  },
  [BILLING_PRODUCTS.SUCCESS_FEE]: {
    id: BILLING_PRODUCTS.SUCCESS_FEE,
    name: 'Success Fee',
    description: 'One-time fee when you successfully sign a lease',
    basePrice: 2900, // $29.00
    type: 'one_time',
  },
};

// Platform type
export type BillingPlatform = 'ios' | 'android';

/**
 * Get the current platform
 */
function getPlatform(): BillingPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

/**
 * Get the platform-specific billing service
 */
function getBillingService() {
  const platform = getPlatform();
  return platform === 'ios' ? AppleStoreKitService : GooglePlayBillingService;
}

/**
 * Map unified product ID to platform-specific SKU
 */
function getPlatformProductId(productId: BillingProductId): string {
  const platform = getPlatform();

  if (platform === 'ios') {
    switch (productId) {
      case BILLING_PRODUCTS.VERIFICATION_PAYMENT:
        return IOS_PRODUCT_IDS.VERIFICATION_PAYMENT;
      case BILLING_PRODUCTS.PREMIUM_MONTHLY:
        return IOS_PRODUCT_IDS.PREMIUM_MONTHLY;
      case BILLING_PRODUCTS.VERIFICATION_PREMIUM_BUNDLE:
        return IOS_PRODUCT_IDS.VERIFICATION_PREMIUM_BUNDLE;
      default:
        return productId;
    }
  } else {
    switch (productId) {
      case BILLING_PRODUCTS.VERIFICATION_PAYMENT:
        return PRODUCT_SKUS.VERIFICATION_PAYMENT;
      case BILLING_PRODUCTS.PREMIUM_MONTHLY:
        return PRODUCT_SKUS.PREMIUM_MONTHLY;
      case BILLING_PRODUCTS.VERIFICATION_PREMIUM_BUNDLE:
        return PRODUCT_SKUS.VERIFICATION_PREMIUM_BUNDLE;
      case BILLING_PRODUCTS.SUCCESS_FEE:
        return PRODUCT_SKUS.SUCCESS_FEE;
      default:
        return productId;
    }
  }
}

class BillingService {
  private platform: BillingPlatform;

  constructor() {
    this.platform = getPlatform();
  }

  /**
   * Get current platform
   */
  getPlatform(): BillingPlatform {
    return this.platform;
  }

  /**
   * Check if running on iOS
   */
  isIOS(): boolean {
    return this.platform === 'ios';
  }

  /**
   * Check if running on Android
   */
  isAndroid(): boolean {
    return this.platform === 'android';
  }

  /**
   * Initialize billing connection
   * Automatically selects the correct platform service
   */
  async initConnection(): Promise<boolean> {
    const service = getBillingService();
    return service.initConnection();
  }

  /**
   * End billing connection
   */
  async endConnection(): Promise<void> {
    const service = getBillingService();
    return service.endConnection();
  }

  /**
   * Get available products (one-time purchases)
   */
  async getProducts(): Promise<BillingProduct[]> {
    const service = getBillingService();
    return service.getProducts();
  }

  /**
   * Get available subscriptions
   */
  async getSubscriptions(): Promise<BillingSubscription[]> {
    const service = getBillingService();
    return service.getSubscriptions();
  }

  /**
   * Purchase a subscription
   * @param productId - Unified product ID (e.g., BILLING_PRODUCTS.PREMIUM_MONTHLY)
   */
  async purchaseSubscription(productId: BillingProductId = BILLING_PRODUCTS.PREMIUM_MONTHLY): Promise<PurchaseResult> {
    const service = getBillingService();
    const platformProductId = getPlatformProductId(productId);
    return service.purchaseSubscription(platformProductId);
  }

  /**
   * Purchase a one-time product
   * @param productId - Unified product ID (e.g., BILLING_PRODUCTS.VERIFICATION_PAYMENT)
   */
  async purchaseProduct(productId: BillingProductId): Promise<PurchaseResult> {
    const service = getBillingService();
    const platformProductId = getPlatformProductId(productId);
    return service.purchaseProduct(platformProductId);
  }

  /**
   * Purchase verification payment ($39)
   */
  async purchaseVerification(): Promise<PurchaseResult> {
    return this.purchaseProduct(BILLING_PRODUCTS.VERIFICATION_PAYMENT);
  }

  /**
   * Purchase verification + premium bundle ($99)
   */
  async purchaseBundle(): Promise<PurchaseResult> {
    return this.purchaseProduct(BILLING_PRODUCTS.VERIFICATION_PREMIUM_BUNDLE);
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<Purchase[]> {
    const service = getBillingService();
    return service.restorePurchases();
  }

  /**
   * Check subscription status
   */
  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    const service = getBillingService();
    return service.checkSubscriptionStatus();
  }

  /**
   * Clear subscription cache
   */
  async clearSubscriptionCache(): Promise<void> {
    const service = getBillingService();
    return service.clearSubscriptionCache();
  }

  /**
   * Get product metadata for display
   */
  getProductMetadata(productId: BillingProductId): ProductMetadata | undefined {
    return PRODUCT_METADATA[productId];
  }

  /**
   * Get all product metadata
   */
  getAllProductMetadata(): ProductMetadata[] {
    return Object.values(PRODUCT_METADATA);
  }

  /**
   * Format price for display
   * @param cents - Price in cents
   * @returns Formatted price string
   */
  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Calculate bundle savings
   * Returns savings amount and percentage
   */
  calculateBundleSavings(): { amount: number; percentage: number; formatted: string } {
    const verificationPrice = PRODUCT_METADATA[BILLING_PRODUCTS.VERIFICATION_PAYMENT].basePrice;
    const monthlyPrice = PRODUCT_METADATA[BILLING_PRODUCTS.PREMIUM_MONTHLY].basePrice;
    const bundlePrice = PRODUCT_METADATA[BILLING_PRODUCTS.VERIFICATION_PREMIUM_BUNDLE].basePrice;

    // Individual cost: $39 verification + 6 months * $14.99 = $128.94
    const individualTotal = verificationPrice + monthlyPrice * 6;
    const savings = individualTotal - bundlePrice;
    const percentage = Math.round((savings / individualTotal) * 100);

    return {
      amount: savings,
      percentage,
      formatted: this.formatPrice(savings),
    };
  }
}

// Export singleton instance
export default new BillingService();

// Re-export types for convenience
export type { BillingProduct, BillingSubscription, PurchaseResult, SubscriptionStatus };
