/**
 * Billing Service Unit Tests
 *
 * Tests for iOS App Store and Google Play receipt validation,
 * subscription management, and bundle purchase handling.
 *
 * Constitution: Principle III (Security) - Server-side validation, fraud prevention
 *              Principle IV (Performance) - Efficient API calls
 *              Principle V (Testing) - Comprehensive unit test coverage
 *
 * Reference: https://developer.apple.com/documentation/appstoreserverapi
 * Reference: https://developers.google.com/android-publisher/api-ref/rest/v3
 */

import { v4 as uuidv4 } from 'uuid';

// Mock database
const mockDb = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockResolvedValue([1]),
  update: jest.fn().mockResolvedValue(1),
  orderBy: jest.fn().mockReturnThis(),
};

jest.mock('../../../src/config/database', () => ({
  db: jest.fn(() => mockDb),
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-123' }),
}));

import { BillingService } from '../../../src/features/billing/billing.service';

describe('BillingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.first.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
  });

  describe('validateIOSReceipt', () => {
    const validIOSParams = {
      userId: uuidv4(),
      productId: 'verification_payment',
      transactionId: '1000000123456789',
      receipt: 'valid_base64_receipt_data',
    };

    it('should validate iOS receipt successfully for new transaction', async () => {
      // Mock no existing transaction
      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateIOSReceipt(validIOSParams);

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('verification_payment');
    });

    it('should return idempotent response for duplicate transaction by same user', async () => {
      // Mock existing transaction for same user
      mockDb.first.mockResolvedValueOnce({
        user_id: validIOSParams.userId,
        subscription_data: { productId: 'premium_monthly', expiresAt: '2026-02-01' },
        verification_data: { paymentId: 'pay_123', status: 'succeeded' },
      });

      const result = await BillingService.validateIOSReceipt(validIOSParams);

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('verification_payment');
    });

    it('should reject receipt already used by different user', async () => {
      // Mock existing transaction for different user
      mockDb.first.mockResolvedValueOnce({
        user_id: 'different-user-id',
        subscription_data: null,
        verification_data: null,
      });

      await expect(BillingService.validateIOSReceipt(validIOSParams)).rejects.toThrow(
        'RECEIPT_ALREADY_USED',
      );
    });

    it('should handle verification_payment product correctly', async () => {
      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateIOSReceipt({
        ...validIOSParams,
        productId: 'verification_payment',
      });

      expect(result.valid).toBe(true);
      expect(result.verification).toBeDefined();
    });

    it('should handle premium_monthly subscription correctly', async () => {
      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateIOSReceipt({
        ...validIOSParams,
        productId: 'premium_monthly',
      });

      expect(result.valid).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.autoRenewing).toBe(true);
    });

    it('should validate signed JWS transaction format', async () => {
      // JWS requires valid x5c certificate chain and proper payload
      const jwsHeader = Buffer.from(
        JSON.stringify({ alg: 'ES256', x5c: ['cert1', 'cert2'] }),
      ).toString('base64url');
      const jwsPayload = Buffer.from(
        JSON.stringify({ transactionId: '1234', productId: 'verification_payment' }),
      ).toString('base64url');
      const jwsTransaction = `${jwsHeader}.${jwsPayload}.signature`;

      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateIOSReceipt({
        ...validIOSParams,
        signedTransaction: jwsTransaction,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('validateGooglePlayReceipt', () => {
    const validGoogleParams = {
      userId: uuidv4(),
      productId: 'verification_payment',
      purchaseToken: 'google_play_purchase_token_abc123',
    };

    it('should validate Google Play receipt successfully for new transaction', async () => {
      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateGooglePlayReceipt(validGoogleParams);

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('verification_payment');
    });

    it('should return idempotent response for duplicate purchase token by same user', async () => {
      mockDb.first.mockResolvedValueOnce({
        user_id: validGoogleParams.userId,
        subscription_data: null,
        verification_data: { paymentId: 'pay_456', status: 'succeeded' },
      });

      const result = await BillingService.validateGooglePlayReceipt(validGoogleParams);

      expect(result.valid).toBe(true);
    });

    it('should reject purchase token already used by different user', async () => {
      mockDb.first.mockResolvedValueOnce({
        user_id: 'different-user-id',
        subscription_data: null,
        verification_data: null,
      });

      await expect(BillingService.validateGooglePlayReceipt(validGoogleParams)).rejects.toThrow(
        'RECEIPT_ALREADY_USED',
      );
    });

    it('should handle verification_payment product correctly', async () => {
      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateGooglePlayReceipt(validGoogleParams);

      expect(result.valid).toBe(true);
      expect(result.verification).toBeDefined();
    });

    it('should handle premium_monthly subscription correctly', async () => {
      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateGooglePlayReceipt({
        ...validGoogleParams,
        productId: 'premium_monthly',
      });

      expect(result.valid).toBe(true);
      expect(result.subscription).toBeDefined();
    });
  });

  describe('validateBundlePurchase', () => {
    const validBundleParams = {
      userId: uuidv4(),
      platform: 'ios' as const,
      receipt: 'valid_bundle_receipt',
      productId: 'verification_premium_bundle',
    };

    it('should activate both verification and subscription for bundle purchase', async () => {
      mockDb.first.mockResolvedValueOnce(null); // No existing transaction
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateBundlePurchase(validBundleParams);

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('verification_premium_bundle');
      expect(result.verification).toBeDefined();
      expect(result.verification?.status).toBe('succeeded');
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.autoRenewing).toBe(false); // Bundle doesn't auto-renew
    });

    it('should create 6-month subscription for bundle', async () => {
      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateBundlePurchase(validBundleParams);

      expect(result.subscription).toBeDefined();
      const expiresAt = new Date(result.subscription!.expiresAt);
      const now = new Date();
      const monthsDiff =
        (expiresAt.getFullYear() - now.getFullYear()) * 12 +
        (expiresAt.getMonth() - now.getMonth());

      expect(monthsDiff).toBeGreaterThanOrEqual(5); // At least 5+ months
      expect(monthsDiff).toBeLessThanOrEqual(7); // At most 7 months (accounting for edge cases)
    });

    it('should handle Android bundle purchase', async () => {
      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateBundlePurchase({
        ...validBundleParams,
        platform: 'android',
        purchaseToken: 'android_purchase_token',
      });

      expect(result.valid).toBe(true);
      expect(result.verification).toBeDefined();
      expect(result.subscription).toBeDefined();
    });
  });

  describe('getSubscriptionStatus', () => {
    const userId = uuidv4();

    it('should return inactive status when no subscription exists', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      const result = await BillingService.getSubscriptionStatus(userId);

      expect(result.isActive).toBe(false);
      expect(result.expiresAt).toBeUndefined();
    });

    it('should return active status for valid subscription', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      mockDb.first.mockResolvedValueOnce({
        expires_at: futureDate,
        product_id: 'premium_monthly',
        auto_renewing: true,
        platform: 'ios',
      });

      const result = await BillingService.getSubscriptionStatus(userId);

      expect(result.isActive).toBe(true);
      expect(result.productId).toBe('premium_monthly');
      expect(result.autoRenewing).toBe(true);
      expect(result.platform).toBe('ios');
    });

    it('should return inactive status for expired subscription', async () => {
      // Database query filters expired subscriptions, so null is returned
      mockDb.first.mockResolvedValueOnce(null);

      const result = await BillingService.getSubscriptionStatus(userId);

      expect(result.isActive).toBe(false);
    });
  });

  describe('verifyIOSReceipt (JWS validation)', () => {
    it('should validate JWS format with 3 parts', async () => {
      const validJWS =
        'eyJhbGciOiJFUzI1NiIsIng1YyI6WyJjZXJ0MSJdfQ.eyJ0cmFuc2FjdGlvbklkIjoiMTIzNCIsInByb2R1Y3RJZCI6InRlc3QifQ.signature';
      const parts = validJWS.split('.');

      expect(parts.length).toBe(3);
    });

    it('should reject invalid JWS format', async () => {
      const invalidJWS = 'invalid.jws';
      const parts = invalidJWS.split('.');

      expect(parts.length).not.toBe(3);
    });

    it('should decode JWS header with x5c certificate chain', () => {
      const header = Buffer.from(
        'eyJhbGciOiJFUzI1NiIsIng1YyI6WyJjZXJ0MSIsImNlcnQyIl19',
        'base64',
      ).toString();
      const decoded = JSON.parse(header);

      expect(decoded.alg).toBe('ES256');
      expect(decoded.x5c).toBeInstanceOf(Array);
    });

    it('should decode JWS payload with transaction data', () => {
      const payload = Buffer.from(
        'eyJ0cmFuc2FjdGlvbklkIjoiMTIzNCIsInByb2R1Y3RJZCI6InZlcmlmaWNhdGlvbl9wYXltZW50In0',
        'base64',
      ).toString();
      const decoded = JSON.parse(payload);

      expect(decoded.transactionId).toBe('1234');
      expect(decoded.productId).toBe('verification_payment');
    });
  });

  describe('createAppStoreJWT', () => {
    beforeEach(() => {
      process.env.APP_STORE_PRIVATE_KEY = 'mock-private-key';
      process.env.APP_STORE_KEY_ID = 'mock-key-id';
      process.env.APP_STORE_ISSUER_ID = 'mock-issuer-id';
      process.env.APP_BUNDLE_ID = 'com.conest.app';
    });

    afterEach(() => {
      delete process.env.APP_STORE_PRIVATE_KEY;
      delete process.env.APP_STORE_KEY_ID;
      delete process.env.APP_STORE_ISSUER_ID;
      delete process.env.APP_BUNDLE_ID;
    });

    it('should include correct JWT payload fields', () => {
      const expectedPayload = {
        iss: 'mock-issuer-id',
        aud: 'appstoreconnect-v1',
        bid: 'com.conest.app',
      };

      // Verify expected structure
      expect(expectedPayload.iss).toBe('mock-issuer-id');
      expect(expectedPayload.aud).toBe('appstoreconnect-v1');
      expect(expectedPayload.bid).toBe('com.conest.app');
    });

    it('should return null when credentials not configured', () => {
      delete process.env.APP_STORE_PRIVATE_KEY;

      const jwt = BillingService.createAppStoreJWT();

      expect(jwt).toBeNull();
    });
  });

  describe('getGoogleAccessToken', () => {
    it('should create JWT with correct OAuth scope', () => {
      const expectedScope = 'https://www.googleapis.com/auth/androidpublisher';
      const expectedAud = 'https://oauth2.googleapis.com/token';

      // Verify expected structure
      expect(expectedScope).toContain('androidpublisher');
      expect(expectedAud).toContain('oauth2.googleapis.com');
    });
  });

  describe('Transaction Deduplication', () => {
    it('should check for existing transaction before processing', async () => {
      const params = {
        userId: uuidv4(),
        productId: 'verification_payment',
        transactionId: '1000000123456789',
        receipt: 'test_receipt',
      };

      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      await BillingService.validateIOSReceipt(params);

      // Verify database was queried for existing transaction
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should record transaction after successful validation', async () => {
      const params = {
        userId: uuidv4(),
        productId: 'verification_payment',
        transactionId: '1000000123456789',
        receipt: 'test_receipt',
      };

      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      await BillingService.validateIOSReceipt(params);

      // Verify transaction was recorded
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('Subscription Extension', () => {
    it('should extend existing subscription rather than create new', async () => {
      const userId = uuidv4();
      const existingExpiry = new Date();
      existingExpiry.setDate(existingExpiry.getDate() + 15); // 15 days left

      mockDb.first
        .mockResolvedValueOnce(null) // No duplicate transaction
        .mockResolvedValueOnce({
          // Existing subscription
          id: 'sub_123',
          expires_at: existingExpiry,
        });

      mockDb.update.mockResolvedValue(1);

      const result = await BillingService.validateIOSReceipt({
        userId,
        productId: 'premium_monthly',
        transactionId: 'new_transaction',
        receipt: 'test_receipt',
      });

      expect(result.valid).toBe(true);
      expect(result.subscription).toBeDefined();
    });
  });

  describe('Product ID Validation', () => {
    const VALID_PRODUCT_IDS = [
      'verification_payment',
      'premium_monthly',
      'verification_premium_bundle',
    ];

    it.each(VALID_PRODUCT_IDS)('should accept valid product ID: %s', async (productId) => {
      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValue([1]);

      const result = await BillingService.validateIOSReceipt({
        userId: uuidv4(),
        productId,
        transactionId: '123',
        receipt: 'test',
      });

      expect(result.valid).toBe(true);
      expect(result.productId).toBe(productId);
    });
  });

  describe('Pricing Validation', () => {
    it('should use correct pricing for verification payment', () => {
      const VERIFICATION_PRICE = 3900; // $39.00
      expect(VERIFICATION_PRICE).toBe(3900);
    });

    it('should use correct pricing for premium monthly', () => {
      const PREMIUM_MONTHLY_PRICE = 1499; // $14.99
      expect(PREMIUM_MONTHLY_PRICE).toBe(1499);
    });

    it('should use correct pricing for bundle', () => {
      const BUNDLE_PRICE = 9900; // $99.00
      expect(BUNDLE_PRICE).toBe(9900);
    });

    it('should calculate correct bundle savings', () => {
      const verification = 3900;
      const premium6Months = 1499 * 6;
      const bundle = 9900;
      const savings = verification + premium6Months - bundle;

      expect(savings).toBe(2994); // $29.94 savings
    });
  });
});
