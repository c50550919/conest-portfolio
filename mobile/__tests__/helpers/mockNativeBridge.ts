/**
 * Mock Native Bridge for In-App Purchase Testing
 *
 * Purpose: Simulate native IAP events (iOS StoreKit / Google Play Billing)
 * for integration testing without real app store connections.
 *
 * Features:
 * - Programmatically emit purchaseUpdated events
 * - Simulate purchase success/failure scenarios
 * - Mock subscription validation responses
 * - Test Redux store integration with billing
 *
 * Usage:
 *   import { MockIAPBridge, createMockPurchase } from '../helpers/mockNativeBridge';
 *
 *   // In test
 *   const bridge = new MockIAPBridge();
 *   bridge.emitPurchaseSuccess('verification_payment');
 *
 * Constitution Compliance:
 * - No child data in any mock fixtures
 * - Tests payment security flows
 */

import { EventEmitter } from 'events';

// Types for mock purchases
export interface MockPurchase {
  productId: string;
  transactionId: string;
  transactionReceipt: string;
  purchaseToken: string;
  dataAndroid?: string;
  signatureAndroid?: string;
  transactionDate: number;
  isAcknowledgedAndroid?: boolean;
  purchaseStateAndroid?: number;
  autoRenewingAndroid?: boolean;
  originalTransactionIdentifierIOS?: string;
}

export interface MockSubscription extends MockPurchase {
  subscriptionPeriodAndroid?: string;
  subscriptionPeriodUnitIOS?: string;
  originalTransactionDateIOS?: number;
}

export interface MockProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
  priceAmountMicros?: string;
  subscriptionPeriodAndroid?: string;
  subscriptionPeriodUnitIOS?: string;
}

export interface MockPurchaseError {
  code: string;
  message: string;
  debugMessage?: string;
  productId?: string;
}

// Product SKUs matching BillingService
export const MOCK_PRODUCT_SKUS = {
  VERIFICATION_PAYMENT: 'verification_payment',
  PREMIUM_MONTHLY: 'premium_monthly',
  VERIFICATION_PREMIUM_BUNDLE: 'verification_premium_bundle',
  SUCCESS_FEE: 'success_fee',
} as const;

/**
 * Create a mock purchase object
 */
export function createMockPurchase(
  productId: string,
  options: Partial<MockPurchase> = {}
): MockPurchase {
  const timestamp = Date.now();
  return {
    productId,
    transactionId: options.transactionId || `txn_test_${timestamp}_${Math.random().toString(36).slice(2)}`,
    transactionReceipt: options.transactionReceipt || `receipt_mock_${timestamp}`,
    purchaseToken: options.purchaseToken || `token_mock_${timestamp}`,
    dataAndroid: options.dataAndroid || JSON.stringify({
      orderId: `order_${timestamp}`,
      packageName: 'com.conest.app',
      productId,
      purchaseTime: timestamp,
      purchaseState: 0,
      purchaseToken: options.purchaseToken || `token_mock_${timestamp}`,
    }),
    signatureAndroid: options.signatureAndroid || 'mock_signature_base64',
    transactionDate: options.transactionDate || timestamp,
    isAcknowledgedAndroid: options.isAcknowledgedAndroid ?? false,
    purchaseStateAndroid: options.purchaseStateAndroid ?? 0,
    ...options,
  };
}

/**
 * Create a mock subscription object
 */
export function createMockSubscription(
  productId: string = MOCK_PRODUCT_SKUS.PREMIUM_MONTHLY,
  options: Partial<MockSubscription> = {}
): MockSubscription {
  return {
    ...createMockPurchase(productId, options),
    subscriptionPeriodAndroid: options.subscriptionPeriodAndroid || 'P1M',
    subscriptionPeriodUnitIOS: options.subscriptionPeriodUnitIOS || 'MONTH',
    autoRenewingAndroid: options.autoRenewingAndroid ?? true,
    ...options,
  };
}

/**
 * Create mock product definitions
 */
export function createMockProducts(): MockProduct[] {
  return [
    {
      productId: MOCK_PRODUCT_SKUS.VERIFICATION_PAYMENT,
      title: 'Verification Payment',
      description: 'One-time verification fee',
      price: '$39.00',
      localizedPrice: '$39.00',
      currency: 'USD',
      priceAmountMicros: '39000000',
    },
    {
      productId: MOCK_PRODUCT_SKUS.SUCCESS_FEE,
      title: 'Success Fee',
      description: 'Fee when lease signed',
      price: '$29.00',
      localizedPrice: '$29.00',
      currency: 'USD',
      priceAmountMicros: '29000000',
    },
    {
      productId: MOCK_PRODUCT_SKUS.VERIFICATION_PREMIUM_BUNDLE,
      title: 'Verification + Premium Bundle',
      description: 'Verification plus 6 months premium',
      price: '$99.00',
      localizedPrice: '$99.00',
      currency: 'USD',
      priceAmountMicros: '99000000',
    },
  ];
}

/**
 * Create mock subscription products
 */
export function createMockSubscriptions(): MockProduct[] {
  return [
    {
      productId: MOCK_PRODUCT_SKUS.PREMIUM_MONTHLY,
      title: 'Premium Monthly',
      description: 'Monthly premium subscription',
      price: '$14.99',
      localizedPrice: '$14.99',
      currency: 'USD',
      priceAmountMicros: '14990000',
      subscriptionPeriodAndroid: 'P1M',
      subscriptionPeriodUnitIOS: 'MONTH',
    },
  ];
}

/**
 * Mock IAP Bridge - Simulates react-native-iap behavior
 *
 * Use this class to programmatically trigger purchase events
 * for testing billing flows.
 */
export class MockIAPBridge extends EventEmitter {
  private isConnected: boolean = false;
  private purchaseListener: ((purchase: MockPurchase) => void) | null = null;
  private errorListener: ((error: MockPurchaseError) => void) | null = null;
  private purchases: MockPurchase[] = [];
  private pendingPurchases: Map<string, MockPurchase> = new Map();

  constructor() {
    super();
  }

  /**
   * Initialize the mock IAP connection
   */
  async initConnection(): Promise<boolean> {
    this.isConnected = true;
    return true;
  }

  /**
   * End the mock IAP connection
   */
  async endConnection(): Promise<void> {
    this.isConnected = false;
    this.purchaseListener = null;
    this.errorListener = null;
    this.removeAllListeners();
  }

  /**
   * Register purchase updated listener
   */
  setPurchaseUpdatedListener(
    callback: (purchase: MockPurchase) => void
  ): { remove: () => void } {
    this.purchaseListener = callback;
    return {
      remove: () => {
        this.purchaseListener = null;
      },
    };
  }

  /**
   * Register purchase error listener
   */
  setPurchaseErrorListener(
    callback: (error: MockPurchaseError) => void
  ): { remove: () => void } {
    this.errorListener = callback;
    return {
      remove: () => {
        this.errorListener = null;
      },
    };
  }

  /**
   * Get mock products
   */
  async getProducts(_skus: string[]): Promise<MockProduct[]> {
    return createMockProducts();
  }

  /**
   * Get mock subscriptions
   */
  async getSubscriptions(_skus: string[]): Promise<MockProduct[]> {
    return createMockSubscriptions();
  }

  /**
   * Simulate requesting a purchase
   * The purchase will be pending until emitPurchaseSuccess/emitPurchaseFailure is called
   */
  async requestPurchase(options: { sku: string }): Promise<MockPurchase> {
    const purchase = createMockPurchase(options.sku);
    this.pendingPurchases.set(options.sku, purchase);
    return purchase;
  }

  /**
   * Simulate requesting a subscription
   */
  async requestSubscription(options: { sku: string }): Promise<MockSubscription> {
    const subscription = createMockSubscription(options.sku);
    this.pendingPurchases.set(options.sku, subscription);
    return subscription;
  }

  /**
   * Get available purchases (for restore)
   */
  async getAvailablePurchases(): Promise<MockPurchase[]> {
    return [...this.purchases];
  }

  /**
   * Finish transaction acknowledgment
   */
  async finishTransaction(_options: {
    purchase: MockPurchase;
    isConsumable: boolean;
  }): Promise<void> {
    // Mark as acknowledged
    return;
  }

  // =========================================
  // TEST HELPER METHODS
  // =========================================

  /**
   * Emit a successful purchase event
   *
   * Call this in tests to simulate a purchase completing successfully.
   * This triggers the purchaseUpdatedListener.
   *
   * @param productId - The product ID that was purchased
   * @param options - Optional overrides for the purchase object
   */
  emitPurchaseSuccess(
    productId: string,
    options: Partial<MockPurchase> = {}
  ): MockPurchase {
    const purchase = this.pendingPurchases.get(productId) ||
      createMockPurchase(productId, options);

    this.pendingPurchases.delete(productId);
    this.purchases.push(purchase);

    // Trigger the listener
    if (this.purchaseListener) {
      this.purchaseListener(purchase);
    }

    // Also emit event for alternative listening
    this.emit('purchaseUpdated', purchase);

    return purchase;
  }

  /**
   * Emit a purchase failure event
   *
   * @param productId - The product ID that failed
   * @param errorCode - Error code (e.g., 'E_USER_CANCELLED')
   * @param message - Error message
   */
  emitPurchaseFailure(
    productId: string,
    errorCode: string = 'E_UNKNOWN',
    message: string = 'Purchase failed'
  ): MockPurchaseError {
    this.pendingPurchases.delete(productId);

    const error: MockPurchaseError = {
      code: errorCode,
      message,
      productId,
    };

    // Trigger the listener
    if (this.errorListener) {
      this.errorListener(error);
    }

    // Also emit event
    this.emit('purchaseError', error);

    return error;
  }

  /**
   * Emit user cancelled event
   */
  emitUserCancelled(productId: string): MockPurchaseError {
    return this.emitPurchaseFailure(
      productId,
      'E_USER_CANCELLED',
      'User cancelled the purchase'
    );
  }

  /**
   * Emit billing unavailable error
   */
  emitBillingUnavailable(): MockPurchaseError {
    return this.emitPurchaseFailure(
      '',
      'E_BILLING_UNAVAILABLE',
      'Billing is not available on this device'
    );
  }

  /**
   * Emit network error
   */
  emitNetworkError(productId: string): MockPurchaseError {
    return this.emitPurchaseFailure(
      productId,
      'E_NETWORK_ERROR',
      'Network connection failed'
    );
  }

  /**
   * Clear all stored purchases (useful for test cleanup)
   */
  clearPurchases(): void {
    this.purchases = [];
    this.pendingPurchases.clear();
  }

  /**
   * Add a purchase to the restore list
   * Useful for testing restore purchases flow
   */
  addRestoredPurchase(purchase: MockPurchase): void {
    this.purchases.push(purchase);
  }

  /**
   * Check if connected
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }
}

// =========================================
// JEST MOCK FACTORY
// =========================================

/**
 * Create Jest mock implementations for react-native-iap
 *
 * Usage in test file:
 *   const { mocks, bridge } = createIAPMocks();
 *   jest.mock('react-native-iap', () => mocks);
 */
export function createIAPMocks() {
  const bridge = new MockIAPBridge();

  const mocks = {
    __esModule: true,
    initConnection: jest.fn(() => bridge.initConnection()),
    endConnection: jest.fn(() => bridge.endConnection()),
    getProducts: jest.fn((options: { skus: string[] }) => bridge.getProducts(options.skus)),
    getSubscriptions: jest.fn((options: { skus: string[] }) => bridge.getSubscriptions(options.skus)),
    requestPurchase: jest.fn((options: { sku: string }) => bridge.requestPurchase(options)),
    requestSubscription: jest.fn((options: { sku: string }) => bridge.requestSubscription(options)),
    finishTransaction: jest.fn((options: { purchase: MockPurchase; isConsumable: boolean }) =>
      bridge.finishTransaction(options)
    ),
    getAvailablePurchases: jest.fn(() => bridge.getAvailablePurchases()),
    purchaseUpdatedListener: jest.fn((callback: (purchase: MockPurchase) => void) =>
      bridge.setPurchaseUpdatedListener(callback)
    ),
    purchaseErrorListener: jest.fn((callback: (error: MockPurchaseError) => void) =>
      bridge.setPurchaseErrorListener(callback)
    ),
  };

  return { mocks, bridge };
}

// =========================================
// REDUX STORE TEST HELPERS
// =========================================

/**
 * Create mock validation response for backend receipt validation
 */
export function createMockValidationResponse(
  valid: boolean = true,
  options: {
    verificationPaymentId?: string;
    subscriptionStatus?: 'active' | 'expired' | 'cancelled';
    expiresAt?: string;
  } = {}
) {
  return {
    valid,
    verificationPaymentId: options.verificationPaymentId || `vp_${Date.now()}`,
    subscriptionStatus: options.subscriptionStatus,
    expiresAt: options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create mock API response for verification payment status
 */
export function createMockVerificationPaymentStatus(
  status: 'none' | 'pending' | 'succeeded' | 'failed' | 'refunded' = 'none'
) {
  if (status === 'none') {
    return {
      hasPaid: false,
      status: 'none',
    };
  }

  return {
    hasPaid: status === 'succeeded',
    status,
    payment: {
      id: `vp_${Date.now()}`,
      amount: 3900,
      paidAt: status === 'succeeded' ? new Date().toISOString() : null,
      refundAmount: status === 'refunded' ? 3900 : 0,
      refundReason: status === 'refunded' ? 'Customer request' : null,
    },
  };
}

// Export default bridge instance for simple usage
export const defaultBridge = new MockIAPBridge();
export default MockIAPBridge;
