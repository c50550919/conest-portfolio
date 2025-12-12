/**
 * Google Play Billing Service
 *
 * Purpose: Handle Google Play in-app purchases and subscriptions
 * Constitution: Principle III (Security - receipt validation, fraud prevention)
 *              Principle IV (Performance - optimized purchase flows)
 *
 * Features:
 * - Premium subscription ($4.99/month)
 * - Success fee one-time purchase ($29)
 * - Purchase restoration
 * - Receipt validation with backend
 * - Subscription status checking
 *
 * Products:
 * - premium_monthly: $4.99/month subscription (Premium features)
 * - success_fee: $29 one-time purchase (When lease signed)
 *
 * Security:
 * - Server-side receipt validation
 * - Purchase verification before granting access
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
} from 'react-native-iap';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Product SKUs (must match Google Play Console configuration)
export const PRODUCT_SKUS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  SUCCESS_FEE: 'success_fee',
};

// API endpoints
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const VALIDATE_RECEIPT_URL = `${API_BASE_URL}/api/billing/validate`;
const SUBSCRIPTION_STATUS_URL = `${API_BASE_URL}/api/billing/subscription/status`;

// Cache keys
const CACHE_KEYS = {
  SUBSCRIPTION_STATUS: '@billing:subscription_status',
  LAST_VALIDATION: '@billing:last_validation',
};

export interface BillingProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
}

export interface BillingSubscription extends BillingProduct {
  subscriptionPeriodAndroid?: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId: string;
  purchaseToken?: string;
  error?: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  expiresAt?: Date;
  productId?: string;
  autoRenewing?: boolean;
}

export interface ValidationResponse {
  valid: boolean;
  subscription?: {
    productId: string;
    expiresAt: string;
    autoRenewing: boolean;
  };
}

class GooglePlayBillingService {
  private isInitialized: boolean = false;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  /**
   * Initialize Google Play Billing connection
   * Must be called before any billing operations
   */
  async initConnection(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        console.log('Billing already initialized');
        return true;
      }

      const result = await initConnection();
      console.log('Google Play Billing initialized:', result);

      // Set up purchase listeners
      this.setupPurchaseListeners();

      this.isInitialized = true;
      return true;
    } catch (error: any) {
      console.error('Failed to initialize Google Play Billing:', error);
      throw new Error(`Billing initialization failed: ${error.message}`);
    }
  }

  /**
   * End Google Play Billing connection
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
      console.log('Google Play Billing connection ended');
    } catch (error: any) {
      console.error('Error ending billing connection:', error);
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
        console.log('Purchase updated:', purchase);

        try {
          // Validate purchase with backend
          const isValid = await this.validatePurchase(purchase);

          if (isValid) {
            // Finish transaction (acknowledge purchase)
            await finishTransaction({ purchase, isConsumable: false });
            console.log('Purchase acknowledged:', purchase.productId);

            // Update local cache
            await this.updateSubscriptionCache(purchase);
          } else {
            console.error('Purchase validation failed:', purchase.productId);
          }
        } catch (error: any) {
          console.error('Error processing purchase:', error);
        }
      }
    );

    // Purchase error listener
    this.purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
      console.error('Purchase error:', error);
    });
  }

  /**
   * Get available products (one-time purchases)
   * Returns success fee product
   */
  async getProducts(): Promise<BillingProduct[]> {
    try {
      if (!this.isInitialized) {
        await this.initConnection();
      }

      const products = await getProducts({ skus: [PRODUCT_SKUS.SUCCESS_FEE] });
      console.log('Available products:', products);

      return products.map((product) => ({
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        localizedPrice: product.localizedPrice,
        currency: product.currency,
      }));
    } catch (error: any) {
      console.error('Error fetching products:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
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

      const subscriptions = await getSubscriptions({ skus: [PRODUCT_SKUS.PREMIUM_MONTHLY] });
      console.log('Available subscriptions:', subscriptions);

      return subscriptions.map((subscription) => ({
        productId: subscription.productId,
        title: subscription.title,
        description: subscription.description,
        price: subscription.price,
        localizedPrice: subscription.localizedPrice,
        currency: subscription.currency,
        subscriptionPeriodAndroid: subscription.subscriptionPeriodAndroid,
      }));
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }
  }

  /**
   * Purchase premium subscription
   * Initiates subscription purchase flow
   */
  async purchaseSubscription(sku: string = PRODUCT_SKUS.PREMIUM_MONTHLY): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initConnection();
      }

      console.log('Requesting subscription purchase:', sku);
      const purchase = await requestSubscription({ sku });

      return {
        success: true,
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        purchaseToken: purchase.purchaseToken,
      };
    } catch (error: any) {
      console.error('Subscription purchase failed:', error);
      return {
        success: false,
        productId: sku,
        error: error.message || 'Subscription purchase failed',
      };
    }
  }

  /**
   * Purchase one-time product (success fee)
   * Initiates one-time purchase flow
   */
  async purchaseProduct(sku: string = PRODUCT_SKUS.SUCCESS_FEE): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initConnection();
      }

      console.log('Requesting product purchase:', sku);
      const purchase = await requestPurchase({ sku });

      return {
        success: true,
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        purchaseToken: purchase.purchaseToken,
      };
    } catch (error: any) {
      console.error('Product purchase failed:', error);
      return {
        success: false,
        productId: sku,
        error: error.message || 'Product purchase failed',
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
      console.log('Available purchases:', purchases);

      // Validate each purchase with backend
      for (const purchase of purchases) {
        const isValid = await this.validatePurchase(purchase);
        if (isValid) {
          await this.updateSubscriptionCache(purchase);
        }
      }

      return purchases;
    } catch (error: any) {
      console.error('Error restoring purchases:', error);
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
      console.error('Error checking subscription status:', error);
      return {
        isActive: false,
      };
    }
  }

  /**
   * Validate purchase with backend
   * Sends receipt to server for verification
   */
  private async validatePurchase(purchase: Purchase | SubscriptionPurchase): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('@auth:token');
      if (!token) {
        console.error('User not authenticated');
        return false;
      }

      const response = await axios.post<ValidationResponse>(
        VALIDATE_RECEIPT_URL,
        {
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          transactionId: purchase.transactionId,
          transactionReceipt: purchase.transactionReceipt,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Receipt validation result:', response.data);
      return response.data.valid;
    } catch (error: any) {
      console.error('Receipt validation failed:', error);
      return false;
    }
  }

  /**
   * Update subscription cache after purchase
   */
  private async updateSubscriptionCache(purchase: Purchase | SubscriptionPurchase): Promise<void> {
    try {
      if (purchase.productId === PRODUCT_SKUS.PREMIUM_MONTHLY) {
        const status: SubscriptionStatus = {
          isActive: true,
          productId: purchase.productId,
          autoRenewing: true,
        };
        await AsyncStorage.setItem(CACHE_KEYS.SUBSCRIPTION_STATUS, JSON.stringify(status));
        console.log('Subscription cache updated');
      }
    } catch (error: any) {
      console.error('Error updating subscription cache:', error);
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
      console.log('Subscription cache cleared');
    } catch (error: any) {
      console.error('Error clearing subscription cache:', error);
    }
  }
}

// Export singleton instance
export default new GooglePlayBillingService();
