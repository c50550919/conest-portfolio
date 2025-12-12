/**
 * Google Play Billing Service Tests
 * Tests in-app purchases and subscriptions
 */

// Mock functions need to be defined before jest.mock
const mockInitConnection = jest.fn();
const mockEndConnection = jest.fn();
const mockGetProducts = jest.fn();
const mockGetSubscriptions = jest.fn();
const mockRequestPurchase = jest.fn();
const mockRequestSubscription = jest.fn();
const mockFinishTransaction = jest.fn();
const mockGetAvailablePurchases = jest.fn();
const mockPurchaseErrorListener = jest.fn();
const mockPurchaseUpdatedListener = jest.fn();

// Mock react-native-iap
jest.mock('react-native-iap', () => ({
  __esModule: true,
  initConnection: (...args: any[]) => mockInitConnection(...args),
  endConnection: (...args: any[]) => mockEndConnection(...args),
  getProducts: (...args: any[]) => mockGetProducts(...args),
  getSubscriptions: (...args: any[]) => mockGetSubscriptions(...args),
  requestPurchase: (...args: any[]) => mockRequestPurchase(...args),
  requestSubscription: (...args: any[]) => mockRequestSubscription(...args),
  finishTransaction: (...args: any[]) => mockFinishTransaction(...args),
  getAvailablePurchases: (...args: any[]) => mockGetAvailablePurchases(...args),
  purchaseErrorListener: (...args: any[]) => mockPurchaseErrorListener(...args),
  purchaseUpdatedListener: (...args: any[]) => mockPurchaseUpdatedListener(...args),
}));

// Mock axios
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockAxiosGet(...args),
    post: (...args: any[]) => mockAxiosPost(...args),
  },
}));

// Mock AsyncStorage
const mockAsyncStorageGetItem = jest.fn();
const mockAsyncStorageSetItem = jest.fn();
const mockAsyncStorageRemoveItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockAsyncStorageGetItem(...args),
    setItem: (...args: any[]) => mockAsyncStorageSetItem(...args),
    removeItem: (...args: any[]) => mockAsyncStorageRemoveItem(...args),
  },
}));

import billingService, {
  PRODUCT_SKUS,
  SubscriptionStatus,
} from '../../../src/services/billing/GooglePlayBillingService';

describe('GooglePlayBillingService', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset billing service state
    (billingService as any).isInitialized = false;
    (billingService as any).purchaseUpdateSubscription = null;
    (billingService as any).purchaseErrorSubscription = null;
    // Suppress console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Product SKUs', () => {
    it('should have correct SKU values', () => {
      expect(PRODUCT_SKUS.PREMIUM_MONTHLY).toBe('premium_monthly');
      expect(PRODUCT_SKUS.SUCCESS_FEE).toBe('success_fee');
    });
  });

  describe('initConnection', () => {
    it('should initialize connection successfully', async () => {
      mockInitConnection.mockResolvedValue(true);
      mockPurchaseUpdatedListener.mockReturnValue({ remove: jest.fn() });
      mockPurchaseErrorListener.mockReturnValue({ remove: jest.fn() });

      const result = await billingService.initConnection();

      expect(result).toBe(true);
      expect(mockInitConnection).toHaveBeenCalled();
      expect(mockPurchaseUpdatedListener).toHaveBeenCalled();
      expect(mockPurchaseErrorListener).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      (billingService as any).isInitialized = true;

      const result = await billingService.initConnection();

      expect(result).toBe(true);
      expect(mockInitConnection).not.toHaveBeenCalled();
    });

    it('should throw error on initialization failure', async () => {
      mockInitConnection.mockRejectedValue(new Error('Play Store unavailable'));

      await expect(billingService.initConnection()).rejects.toThrow(
        'Billing initialization failed: Play Store unavailable'
      );
    });
  });

  describe('endConnection', () => {
    it('should end connection and cleanup', async () => {
      const removeUpdate = jest.fn();
      const removeError = jest.fn();
      (billingService as any).purchaseUpdateSubscription = { remove: removeUpdate };
      (billingService as any).purchaseErrorSubscription = { remove: removeError };
      (billingService as any).isInitialized = true;

      mockEndConnection.mockResolvedValue(undefined);

      await billingService.endConnection();

      expect(removeUpdate).toHaveBeenCalled();
      expect(removeError).toHaveBeenCalled();
      expect(mockEndConnection).toHaveBeenCalled();
      expect((billingService as any).isInitialized).toBe(false);
    });

    it('should handle endConnection errors gracefully', async () => {
      mockEndConnection.mockRejectedValue(new Error('End error'));

      await billingService.endConnection();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error ending billing connection:',
        expect.any(Error)
      );
    });
  });

  describe('getProducts', () => {
    beforeEach(() => {
      mockInitConnection.mockResolvedValue(true);
      mockPurchaseUpdatedListener.mockReturnValue({ remove: jest.fn() });
      mockPurchaseErrorListener.mockReturnValue({ remove: jest.fn() });
    });

    it('should fetch products successfully', async () => {
      const mockProducts = [
        {
          productId: 'success_fee',
          title: 'Success Fee',
          description: 'One-time fee when lease signed',
          price: '$29.00',
          localizedPrice: '$29.00',
          currency: 'USD',
        },
      ];
      mockGetProducts.mockResolvedValue(mockProducts);

      const result = await billingService.getProducts();

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('success_fee');
      expect(mockGetProducts).toHaveBeenCalledWith({
        skus: [PRODUCT_SKUS.SUCCESS_FEE],
      });
    });

    it('should initialize connection if not already initialized', async () => {
      mockGetProducts.mockResolvedValue([]);

      await billingService.getProducts();

      expect(mockInitConnection).toHaveBeenCalled();
    });

    it('should throw error on fetch failure', async () => {
      mockGetProducts.mockRejectedValue(new Error('Network error'));

      await expect(billingService.getProducts()).rejects.toThrow(
        'Failed to fetch products: Network error'
      );
    });
  });

  describe('getSubscriptions', () => {
    beforeEach(() => {
      mockInitConnection.mockResolvedValue(true);
      mockPurchaseUpdatedListener.mockReturnValue({ remove: jest.fn() });
      mockPurchaseErrorListener.mockReturnValue({ remove: jest.fn() });
    });

    it('should fetch subscriptions successfully', async () => {
      const mockSubscriptions = [
        {
          productId: 'premium_monthly',
          title: 'Premium Monthly',
          description: 'Premium features',
          price: '$4.99',
          localizedPrice: '$4.99',
          currency: 'USD',
          subscriptionPeriodAndroid: 'P1M',
        },
      ];
      mockGetSubscriptions.mockResolvedValue(mockSubscriptions);

      const result = await billingService.getSubscriptions();

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('premium_monthly');
      expect(result[0].subscriptionPeriodAndroid).toBe('P1M');
    });

    it('should throw error on subscription fetch failure', async () => {
      mockGetSubscriptions.mockRejectedValue(new Error('Subscription error'));

      await expect(billingService.getSubscriptions()).rejects.toThrow(
        'Failed to fetch subscriptions: Subscription error'
      );
    });
  });

  describe('purchaseSubscription', () => {
    beforeEach(() => {
      mockInitConnection.mockResolvedValue(true);
      mockPurchaseUpdatedListener.mockReturnValue({ remove: jest.fn() });
      mockPurchaseErrorListener.mockReturnValue({ remove: jest.fn() });
    });

    it('should purchase subscription successfully', async () => {
      const mockPurchase = {
        transactionId: 'txn-123',
        productId: 'premium_monthly',
        purchaseToken: 'token-abc',
      };
      mockRequestSubscription.mockResolvedValue(mockPurchase);

      const result = await billingService.purchaseSubscription();

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn-123');
      expect(result.productId).toBe('premium_monthly');
      expect(result.purchaseToken).toBe('token-abc');
    });

    it('should handle subscription purchase failure', async () => {
      mockRequestSubscription.mockRejectedValue(new Error('User cancelled'));

      const result = await billingService.purchaseSubscription();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled');
      expect(result.productId).toBe('premium_monthly');
    });

    it('should use custom SKU when provided', async () => {
      const mockPurchase = {
        transactionId: 'txn-456',
        productId: 'custom_sku',
        purchaseToken: 'token-xyz',
      };
      mockRequestSubscription.mockResolvedValue(mockPurchase);

      await billingService.purchaseSubscription('custom_sku');

      expect(mockRequestSubscription).toHaveBeenCalledWith({ sku: 'custom_sku' });
    });
  });

  describe('purchaseProduct', () => {
    beforeEach(() => {
      mockInitConnection.mockResolvedValue(true);
      mockPurchaseUpdatedListener.mockReturnValue({ remove: jest.fn() });
      mockPurchaseErrorListener.mockReturnValue({ remove: jest.fn() });
    });

    it('should purchase product successfully', async () => {
      const mockPurchase = {
        transactionId: 'txn-789',
        productId: 'success_fee',
        purchaseToken: 'token-def',
      };
      mockRequestPurchase.mockResolvedValue(mockPurchase);

      const result = await billingService.purchaseProduct();

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn-789');
      expect(result.productId).toBe('success_fee');
    });

    it('should handle product purchase failure', async () => {
      mockRequestPurchase.mockRejectedValue(new Error('Payment failed'));

      const result = await billingService.purchaseProduct();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment failed');
    });
  });

  describe('restorePurchases', () => {
    beforeEach(() => {
      mockInitConnection.mockResolvedValue(true);
      mockPurchaseUpdatedListener.mockReturnValue({ remove: jest.fn() });
      mockPurchaseErrorListener.mockReturnValue({ remove: jest.fn() });
    });

    it('should restore purchases successfully', async () => {
      const mockPurchases = [
        {
          productId: 'premium_monthly',
          transactionId: 'txn-restore',
          purchaseToken: 'token-restore',
        },
      ];
      mockGetAvailablePurchases.mockResolvedValue(mockPurchases);
      mockAsyncStorageGetItem.mockResolvedValue('mock-token');
      mockAxiosPost.mockResolvedValue({ data: { valid: true } });

      const result = await billingService.restorePurchases();

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('premium_monthly');
    });

    it('should throw error on restore failure', async () => {
      mockGetAvailablePurchases.mockRejectedValue(new Error('Restore failed'));

      await expect(billingService.restorePurchases()).rejects.toThrow(
        'Failed to restore purchases: Restore failed'
      );
    });
  });

  describe('checkSubscriptionStatus', () => {
    it('should return cached status if valid', async () => {
      const cachedStatus: SubscriptionStatus = {
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        productId: 'premium_monthly',
        autoRenewing: true,
      };
      mockAsyncStorageGetItem.mockResolvedValue(JSON.stringify(cachedStatus));

      const result = await billingService.checkSubscriptionStatus();

      expect(result.isActive).toBe(true);
      expect(result.productId).toBe('premium_monthly');
    });

    it('should fetch from server if cache expired', async () => {
      const expiredStatus: SubscriptionStatus = {
        isActive: true,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
        productId: 'premium_monthly',
      };
      mockAsyncStorageGetItem
        .mockResolvedValueOnce(JSON.stringify(expiredStatus))
        .mockResolvedValueOnce('mock-auth-token');

      mockAxiosGet.mockResolvedValue({
        data: {
          isActive: true,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          productId: 'premium_monthly',
          autoRenewing: true,
        },
      });

      const result = await billingService.checkSubscriptionStatus();

      expect(mockAxiosGet).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });

    it('should return inactive status on error', async () => {
      mockAsyncStorageGetItem.mockResolvedValue(null);
      mockAxiosGet.mockRejectedValue(new Error('Network error'));

      const result = await billingService.checkSubscriptionStatus();

      expect(result.isActive).toBe(false);
    });

    it('should return inactive when user not authenticated', async () => {
      mockAsyncStorageGetItem.mockResolvedValue(null);

      const result = await billingService.checkSubscriptionStatus();

      expect(result.isActive).toBe(false);
    });
  });

  describe('clearSubscriptionCache', () => {
    it('should clear subscription cache', async () => {
      mockAsyncStorageRemoveItem.mockResolvedValue(undefined);

      await billingService.clearSubscriptionCache();

      expect(mockAsyncStorageRemoveItem).toHaveBeenCalledWith('@billing:subscription_status');
      expect(mockAsyncStorageRemoveItem).toHaveBeenCalledWith('@billing:last_validation');
    });

    it('should handle clear cache error gracefully', async () => {
      mockAsyncStorageRemoveItem.mockRejectedValue(new Error('Clear error'));

      await billingService.clearSubscriptionCache();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error clearing subscription cache:',
        expect.any(Error)
      );
    });
  });

  describe('Purchase Validation', () => {
    it('should validate purchase with backend', async () => {
      mockAsyncStorageGetItem.mockResolvedValue('mock-auth-token');
      mockAxiosPost.mockResolvedValue({ data: { valid: true } });

      const purchase = {
        productId: 'premium_monthly',
        purchaseToken: 'token-123',
        transactionId: 'txn-123',
        transactionReceipt: 'receipt-123',
      };

      const result = await (billingService as any).validatePurchase(purchase);

      expect(result).toBe(true);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/api/billing/validate'),
        expect.objectContaining({
          productId: 'premium_monthly',
          purchaseToken: 'token-123',
        }),
        expect.any(Object)
      );
    });

    it('should return false when not authenticated', async () => {
      mockAsyncStorageGetItem.mockResolvedValue(null);

      const purchase = {
        productId: 'premium_monthly',
        purchaseToken: 'token-123',
      };

      const result = await (billingService as any).validatePurchase(purchase);

      expect(result).toBe(false);
    });

    it('should return false on validation error', async () => {
      mockAsyncStorageGetItem.mockResolvedValue('mock-auth-token');
      mockAxiosPost.mockRejectedValue(new Error('Server error'));

      const purchase = {
        productId: 'premium_monthly',
        purchaseToken: 'token-123',
      };

      const result = await (billingService as any).validatePurchase(purchase);

      expect(result).toBe(false);
    });
  });

  describe('Subscription Cache Update', () => {
    it('should update cache for premium subscription', async () => {
      mockAsyncStorageSetItem.mockResolvedValue(undefined);

      const purchase = {
        productId: 'premium_monthly',
        purchaseToken: 'token-123',
      };

      await (billingService as any).updateSubscriptionCache(purchase);

      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        '@billing:subscription_status',
        expect.stringContaining('"isActive":true')
      );
    });

    it('should not update cache for non-subscription products', async () => {
      const purchase = {
        productId: 'success_fee',
        purchaseToken: 'token-123',
      };

      await (billingService as any).updateSubscriptionCache(purchase);

      expect(mockAsyncStorageSetItem).not.toHaveBeenCalled();
    });

    it('should handle cache update error gracefully', async () => {
      mockAsyncStorageSetItem.mockRejectedValue(new Error('Storage error'));

      const purchase = {
        productId: 'premium_monthly',
        purchaseToken: 'token-123',
      };

      await (billingService as any).updateSubscriptionCache(purchase);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating subscription cache:',
        expect.any(Error)
      );
    });
  });

  describe('Purchase Listeners', () => {
    it('should setup purchase listener that processes successful purchases', async () => {
      let purchaseCallback: Function = () => {};
      mockPurchaseUpdatedListener.mockImplementation((callback) => {
        purchaseCallback = callback;
        return { remove: jest.fn() };
      });
      mockPurchaseErrorListener.mockReturnValue({ remove: jest.fn() });
      mockInitConnection.mockResolvedValue(true);

      await billingService.initConnection();

      // Mock successful validation
      mockAsyncStorageGetItem.mockResolvedValue('mock-token');
      mockAxiosPost.mockResolvedValue({ data: { valid: true } });
      mockFinishTransaction.mockResolvedValue(undefined);
      mockAsyncStorageSetItem.mockResolvedValue(undefined);

      const purchase = {
        productId: 'premium_monthly',
        purchaseToken: 'token-123',
        transactionId: 'txn-123',
      };

      // Trigger purchase callback
      await purchaseCallback(purchase);

      expect(mockFinishTransaction).toHaveBeenCalledWith({
        purchase,
        isConsumable: false,
      });
    });

    it('should setup error listener', async () => {
      let errorCallback: Function = () => {};
      mockPurchaseErrorListener.mockImplementation((callback) => {
        errorCallback = callback;
        return { remove: jest.fn() };
      });
      mockPurchaseUpdatedListener.mockReturnValue({ remove: jest.fn() });
      mockInitConnection.mockResolvedValue(true);

      await billingService.initConnection();

      const error = { message: 'Purchase cancelled', code: 'E_USER_CANCELLED' };
      errorCallback(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Purchase error:', error);
    });
  });
});
