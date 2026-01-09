/**
 * Apple StoreKit 2 Billing Service
 *
 * Purpose: Handle App Store in-app purchases and subscriptions
 * Constitution: Principle III (Security - receipt validation, fraud prevention)
 *              Principle IV (Performance - optimized purchase flows)
 *
 * Features:
 * - Premium subscription ($14.99/month)
 * - Verification payment one-time purchase ($39)
 * - Bundle purchase ($99 - verification + 6 months premium)
 * - Purchase restoration
 * - Server-side receipt validation with App Store Server API
 * - Subscription status checking
 *
 * Products (App Store Connect configuration):
 * - premium_monthly: $14.99/month auto-renewable subscription
 * - verification_payment: $39 non-consumable (verification fee)
 * - verification_premium_bundle: $99 non-consumable (bundle)
 *
 * Security:
 * - Server-side receipt validation via App Store Server API
 * - JWS transaction verification
 * - Anti-fraud measures
 */

import {
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  requestPurchase,
  requestSubscription,
  finishTransaction,
  getAvailablePurchases,
  purchaseErrorListener,
  purchaseUpdatedListener,
  Product,
  Subscription,
  Purchase,
  PurchaseError,
  SubscriptionPurchase,
  clearTransactionIOS,
  getReceiptIOS,
} from 'react-native-iap';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BillingProduct,
  BillingSubscription,
  PurchaseResult,
  SubscriptionStatus,
  ValidationResponse,
} from './GooglePlayBillingService';

// Product IDs (must match App Store Connect configuration)
export const IOS_PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  VERIFICATION_PAYMENT: 'verification_payment',
  VERIFICATION_PREMIUM_BUNDLE: 'verification_premium_bundle',
};

// API endpoints
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const VALIDATE_IOS_RECEIPT_URL = `${API_BASE_URL}/api/billing/validate-ios`;
const SUBSCRIPTION_STATUS_URL = `${API_BASE_URL}/api/billing/subscription/status`;

// Cache keys
const CACHE_KEYS = {
  SUBSCRIPTION_STATUS: '@billing:ios_subscription_status',
  LAST_VALIDATION: '@billing:ios_last_validation',
  RECEIPT: '@billing:ios_receipt',
};

class AppleStoreKitService {
  private isInitialized: boolean = false;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  /**
   * Initialize StoreKit connection
   * Must be called before any billing operations
   */
  async initConnection(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        console.log('StoreKit already initialized');
        return true;
      }

      const result = await initConnection();
      console.log('StoreKit initialized:', result);

      // Clear any pending transactions from previous sessions
      await this.clearPendingTransactions();

      // Set up purchase listeners
      this.setupPurchaseListeners();

      this.isInitialized = true;
      return true;
    } catch (error: any) {
      console.error('Failed to initialize StoreKit:', error);
      throw new Error(`StoreKit initialization failed: ${error.message}`);
    }
  }

  /**
   * End StoreKit connection
   * Call when app is closing or billing is no longer needed
   */
  async endConnection(): Promise<void> {
    try {
      // Remove purchase listeners
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }
      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      await endConnection();
      this.isInitialized = false;
      console.log('StoreKit connection ended');
    } catch (error: any) {
      console.error('Error ending StoreKit connection:', error);
    }
  }

  /**
   * Clear pending iOS transactions
   * Prevents "You have an incomplete purchase" errors
   */
  private async clearPendingTransactions(): Promise<void> {
    try {
      await clearTransactionIOS();
      console.log('Cleared pending iOS transactions');
    } catch (error: any) {
      // Not critical - may fail if no pending transactions
      console.log('No pending transactions to clear');
    }
  }

  /**
   * Setup purchase event listeners
   * Automatically processes purchases and validates receipts
   */
  private setupPurchaseListeners(): void {
    // Purchase success listener
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase | SubscriptionPurchase) => {
        console.log('iOS Purchase updated:', purchase);

        try {
          // Get the iOS receipt for validation
          const receipt = await this.getReceipt();

          // Validate purchase with backend using App Store Server API
          const isValid = await this.validatePurchase(purchase, receipt);

          if (isValid) {
            // Finish transaction (acknowledge purchase)
            await finishTransaction({ purchase, isConsumable: false });
            console.log('iOS Purchase acknowledged:', purchase.productId);

            // Update local cache
            await this.updateSubscriptionCache(purchase);
          } else {
            console.error('iOS Purchase validation failed:', purchase.productId);
          }
        } catch (error: any) {
          console.error('Error processing iOS purchase:', error);
        }
      }
    );

    // Purchase error listener
    this.purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
      console.error('iOS Purchase error:', error);
    });
  }

  /**
   * Get iOS receipt data
   * Returns base64-encoded receipt for server validation
   */
  private async getReceipt(): Promise<string> {
    try {
      const receipt = await getReceiptIOS({ forceRefresh: false });

      // Cache receipt for future use
      if (receipt) {
        await AsyncStorage.setItem(CACHE_KEYS.RECEIPT, receipt);
      }

      return receipt || '';
    } catch (error: any) {
      console.error('Error getting iOS receipt:', error);

      // Try cached receipt
      const cachedReceipt = await AsyncStorage.getItem(CACHE_KEYS.RECEIPT);
      return cachedReceipt || '';
    }
  }

  /**
   * Get available products (one-time purchases)
   * Returns verification payment and bundle products
   */
  async getProducts(): Promise<BillingProduct[]> {
    try {
      if (!this.isInitialized) {
        await this.initConnection();
      }

      const productIds = [
        IOS_PRODUCT_IDS.VERIFICATION_PAYMENT,
        IOS_PRODUCT_IDS.VERIFICATION_PREMIUM_BUNDLE,
      ];

      const products = await getProducts({ skus: productIds });
      console.log('Available iOS products:', products);

      return products.map((product) => ({
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        localizedPrice: product.localizedPrice,
        currency: product.currency,
      }));
    } catch (error: any) {
      console.error('Error fetching iOS products:', error);
      throw new Error(`Failed to fetch iOS products: ${error.message}`);
    }
  }

  /**
   * Get available subscriptions
   * Returns premium monthly subscription
   */
  async getSubscriptions(): Promise<BillingSubscription[]> {
    try {
      if (!this.isInitialized) {
        await this.initConnection();
      }

      const subscriptions = await getSubscriptions({ skus: [IOS_PRODUCT_IDS.PREMIUM_MONTHLY] });
      console.log('Available iOS subscriptions:', subscriptions);

      return subscriptions.map((subscription) => ({
        productId: subscription.productId,
        title: subscription.title,
        description: subscription.description,
        price: subscription.price,
        localizedPrice: subscription.localizedPrice,
        currency: subscription.currency,
        subscriptionPeriodIOS: subscription.subscriptionPeriodUnitIOS,
      }));
    } catch (error: any) {
      console.error('Error fetching iOS subscriptions:', error);
      throw new Error(`Failed to fetch iOS subscriptions: ${error.message}`);
    }
  }

  /**
   * Purchase premium subscription
   * Initiates subscription purchase flow
   */
  async purchaseSubscription(
    productId: string = IOS_PRODUCT_IDS.PREMIUM_MONTHLY
  ): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initConnection();
      }

      console.log('Requesting iOS subscription purchase:', productId);

      // For iOS, we use requestSubscription for auto-renewable subscriptions
      const purchase = await requestSubscription({
        sku: productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });

      return {
        success: true,
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        purchaseToken: purchase.transactionReceipt,
      };
    } catch (error: any) {
      console.error('iOS Subscription purchase failed:', error);
      return {
        success: false,
        productId,
        error: this.getReadableErrorMessage(error),
      };
    }
  }

  /**
   * Purchase one-time product (verification payment or bundle)
   * Initiates one-time purchase flow
   */
  async purchaseProduct(
    productId: string = IOS_PRODUCT_IDS.VERIFICATION_PAYMENT
  ): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initConnection();
      }

      console.log('Requesting iOS product purchase:', productId);

      const purchase = await requestPurchase({
        sku: productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });

      return {
        success: true,
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        purchaseToken: purchase.transactionReceipt,
      };
    } catch (error: any) {
      console.error('iOS Product purchase failed:', error);
      return {
        success: false,
        productId,
        error: this.getReadableErrorMessage(error),
      };
    }
  }

  /**
   * Restore previous purchases
   * Used when user reinstalls app or switches devices
   */
  async restorePurchases(): Promise<Purchase[]> {
    try {
      if (!this.isInitialized) {
        await this.initConnection();
      }

      const purchases = await getAvailablePurchases();
      console.log('Available iOS purchases:', purchases);

      // Get fresh receipt
      const receipt = await this.getReceipt();

      // Validate each purchase with backend
      for (const purchase of purchases) {
        const isValid = await this.validatePurchase(purchase, receipt);
        if (isValid) {
          await this.updateSubscriptionCache(purchase);
        }
      }

      return purchases;
    } catch (error: any) {
      console.error('Error restoring iOS purchases:', error);
      throw new Error(`Failed to restore purchases: ${error.message}`);
    }
  }

  /**
   * Check subscription status
   * Returns current subscription status from cache or server
   */
  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      // Check cache first
      const cachedStatus = await AsyncStorage.getItem(CACHE_KEYS.SUBSCRIPTION_STATUS);
      if (cachedStatus) {
        const status: SubscriptionStatus = JSON.parse(cachedStatus);

        // Check if cache is still valid
        if (status.expiresAt && new Date(status.expiresAt) > new Date()) {
          return status;
        }
      }

      // Fetch from server
      const token = await AsyncStorage.getItem('@auth:token');
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await axios.get(SUBSCRIPTION_STATUS_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const status: SubscriptionStatus = {
        isActive: response.data.isActive,
        expiresAt: response.data.expiresAt ? new Date(response.data.expiresAt) : undefined,
        productId: response.data.productId,
        autoRenewing: response.data.autoRenewing,
      };

      // Update cache
      await AsyncStorage.setItem(CACHE_KEYS.SUBSCRIPTION_STATUS, JSON.stringify(status));

      return status;
    } catch (error: any) {
      console.error('Error checking iOS subscription status:', error);
      return {
        isActive: false,
      };
    }
  }

  /**
   * Validate purchase with backend using App Store Server API
   * Sends receipt to server for verification
   */
  private async validatePurchase(
    purchase: Purchase | SubscriptionPurchase,
    receipt: string
  ): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('@auth:token');
      if (!token) {
        console.error('User not authenticated');
        return false;
      }

      const response = await axios.post<ValidationResponse>(
        VALIDATE_IOS_RECEIPT_URL,
        {
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          originalTransactionId: (purchase as any).originalTransactionIdIOS,
          receipt: receipt,
          // Include JWS for StoreKit 2 transactions
          signedTransaction: (purchase as any).transactionReceipt,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('iOS Receipt validation result:', response.data);
      return response.data.valid;
    } catch (error: any) {
      console.error('iOS Receipt validation failed:', error);
      return false;
    }
  }

  /**
   * Update subscription cache after purchase
   */
  private async updateSubscriptionCache(purchase: Purchase | SubscriptionPurchase): Promise<void> {
    try {
      const productId = purchase.productId;

      if (
        productId === IOS_PRODUCT_IDS.PREMIUM_MONTHLY ||
        productId === IOS_PRODUCT_IDS.VERIFICATION_PREMIUM_BUNDLE
      ) {
        const status: SubscriptionStatus = {
          isActive: true,
          productId: productId,
          autoRenewing: productId === IOS_PRODUCT_IDS.PREMIUM_MONTHLY,
        };
        await AsyncStorage.setItem(CACHE_KEYS.SUBSCRIPTION_STATUS, JSON.stringify(status));
        console.log('iOS Subscription cache updated');
      }
    } catch (error: any) {
      console.error('Error updating iOS subscription cache:', error);
    }
  }

  /**
   * Get human-readable error message
   */
  private getReadableErrorMessage(error: any): string {
    const code = error.code || error.responseCode;

    switch (code) {
      case 'E_USER_CANCELLED':
        return 'Purchase was cancelled';
      case 'E_ALREADY_OWNED':
        return 'You already own this item';
      case 'E_ITEM_UNAVAILABLE':
        return 'This item is not available for purchase';
      case 'E_NETWORK_ERROR':
        return 'Network error. Please check your connection';
      case 'E_SERVICE_ERROR':
        return 'App Store service error. Please try again later';
      case 'E_DEFERRED_PAYMENT':
        return 'Payment is pending approval';
      default:
        return error.message || 'Purchase failed. Please try again';
    }
  }

  /**
   * Clear subscription cache
   * Used for testing or when subscription is cancelled
   */
  async clearSubscriptionCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.SUBSCRIPTION_STATUS);
      await AsyncStorage.removeItem(CACHE_KEYS.LAST_VALIDATION);
      await AsyncStorage.removeItem(CACHE_KEYS.RECEIPT);
      console.log('iOS Subscription cache cleared');
    } catch (error: any) {
      console.error('Error clearing iOS subscription cache:', error);
    }
  }
}

// Export singleton instance
export default new AppleStoreKitService();
