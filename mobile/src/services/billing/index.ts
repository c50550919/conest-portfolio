/**
 * Billing Services Index
 *
 * Exports unified billing service and platform-specific services
 * Use BillingService for cross-platform compatibility
 */

// Unified billing service (recommended for all use cases)
export { default as BillingService } from './BillingService';
export {
  BILLING_PRODUCTS,
  PRODUCT_METADATA,
  type BillingProductId,
  type ProductMetadata,
  type BillingPlatform,
  type BillingProduct,
  type BillingSubscription,
  type PurchaseResult,
  type SubscriptionStatus,
} from './BillingService';

// Platform-specific services (use only when needed)
export { default as GooglePlayBillingService, PRODUCT_SKUS } from './GooglePlayBillingService';
export { default as AppleStoreKitService, IOS_PRODUCT_IDS } from './AppleStoreKitService';
