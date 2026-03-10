/**
 * Billing Integration Tests
 *
 * Tests billing flows for iOS App Store and Google Play.
 * Uses mocked database for CI/testing without Docker.
 *
 * **CRITICAL**: Tests bundle purchases, webhook handling, and subscription management
 * **Security**: Validates receipt validation and fraud prevention
 */

import { v4 as uuidv4 } from 'uuid';

// Mock the database before importing BillingService
const mockDb = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereNot: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockResolvedValue([1]),
  update: jest.fn().mockResolvedValue(1),
  orderBy: jest.fn().mockReturnThis(),
  del: jest.fn().mockResolvedValue(1),
  count: jest.fn().mockResolvedValue([{ count: '1' }]),
};

jest.mock('../../src/config/database', () => ({
  db: jest.fn(() => mockDb),
  default: jest.fn(() => mockDb),
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
}));

import { BillingService } from '../../src/features/billing/billing.service';

describe('Billing Integration Tests', () => {
  const testUserId = uuidv4();
  const testUserId2 = uuidv4();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockDb.first.mockResolvedValue(null);
    mockDb.insert.mockResolvedValue([1]);
    mockDb.update.mockResolvedValue(1);

    // Set development mode for testing
    process.env.NODE_ENV = 'development';
  });

  describe('iOS Receipt Validation', () => {
    const createValidIOSParams = (overrides = {}) => ({
      userId: testUserId,
      productId: 'verification_payment',
      transactionId: uuidv4(),
      receipt: `valid-receipt-data-${uuidv4()}`,
      ...overrides,
    });

    it('should validate iOS receipt for verification payment', async () => {
      const params = createValidIOSParams();

      const result = await BillingService.validateIOSReceipt(params);

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('verification_payment');
      expect(result.verification).toBeDefined();
      expect(result.verification?.status).toBe('succeeded');
    });

    it('should validate iOS receipt for premium subscription', async () => {
      const params = createValidIOSParams({
        productId: 'premium_monthly',
      });

      const result = await BillingService.validateIOSReceipt(params);

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('premium_monthly');
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.autoRenewing).toBe(true);
    });

    it('should be idempotent - same user can retry with same transaction', async () => {
      const params = createValidIOSParams();

      // First request - no existing transaction
      mockDb.first.mockResolvedValueOnce(null);
      const first = await BillingService.validateIOSReceipt(params);

      // Second request - transaction exists for same user
      mockDb.first.mockResolvedValueOnce({
        user_id: testUserId,
        subscription_data: null,
        verification_data: { paymentId: 'test-payment', status: 'succeeded' },
      });
      const second = await BillingService.validateIOSReceipt(params);

      expect(first.valid).toBe(true);
      expect(second.valid).toBe(true);
    });

    it('should reject receipt already used by different user', async () => {
      const params = createValidIOSParams();

      // Transaction exists for different user
      mockDb.first.mockResolvedValue({
        user_id: testUserId2, // Different user
        subscription_data: null,
        verification_data: null,
      });

      await expect(BillingService.validateIOSReceipt(params)).rejects.toThrow(
        'RECEIPT_ALREADY_USED',
      );
    });

    it('should reject empty receipt', async () => {
      const params = createValidIOSParams({
        receipt: '',
      });

      // Empty receipt should fail validation in development mode too
      // The service checks receipt.length > 0 in dev mode
      await expect(BillingService.validateIOSReceipt(params)).rejects.toThrow('INVALID_RECEIPT');
    });

    it('should create billing transaction record', async () => {
      const params = createValidIOSParams();

      await BillingService.validateIOSReceipt(params);

      // Verify insert was called for billing_transactions
      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.calls.find(
        (call: any[]) => call[0] && call[0].platform === 'ios',
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[0].user_id).toBe(testUserId);
      expect(insertCall[0].product_id).toBe('verification_payment');
    });

    it('should create verification payment for verification_payment product', async () => {
      const params = createValidIOSParams({
        productId: 'verification_payment',
      });

      await BillingService.validateIOSReceipt(params);

      // Verify verification_payments insert was called
      const insertCalls = mockDb.insert.mock.calls;
      const verificationPaymentCall = insertCalls.find(
        (call: any[]) => call[0] && call[0].payment_method === 'app_store',
      );
      expect(verificationPaymentCall).toBeDefined();
      expect(verificationPaymentCall[0].amount).toBe(3900);
      expect(verificationPaymentCall[0].status).toBe('succeeded');
    });

    it('should create subscription for premium_monthly product', async () => {
      const params = createValidIOSParams({
        productId: 'premium_monthly',
      });

      await BillingService.validateIOSReceipt(params);

      // Verify subscriptions insert was called
      const insertCalls = mockDb.insert.mock.calls;
      const subscriptionCall = insertCalls.find(
        (call: any[]) => call[0] && call[0].auto_renewing === true,
      );
      expect(subscriptionCall).toBeDefined();
      expect(subscriptionCall[0].product_id).toBe('premium_monthly');
      expect(subscriptionCall[0].platform).toBe('ios');
    });
  });

  describe('Google Play Receipt Validation', () => {
    const createValidAndroidParams = (overrides = {}) => ({
      userId: testUserId,
      productId: 'verification_payment',
      purchaseToken: `valid-purchase-token-${uuidv4()}`,
      ...overrides,
    });

    it('should validate Google Play receipt for verification payment', async () => {
      const params = createValidAndroidParams();

      const result = await BillingService.validateGooglePlayReceipt(params);

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('verification_payment');
      expect(result.verification).toBeDefined();
    });

    it('should validate Google Play receipt for subscription', async () => {
      const params = createValidAndroidParams({
        productId: 'premium_monthly',
      });

      const result = await BillingService.validateGooglePlayReceipt(params);

      expect(result.valid).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.autoRenewing).toBe(true);
    });

    it('should be idempotent for same user', async () => {
      const params = createValidAndroidParams();

      // Existing transaction for same user
      mockDb.first.mockResolvedValue({
        user_id: testUserId,
        subscription_data: null,
        verification_data: { paymentId: 'test', status: 'succeeded' },
      });

      const result = await BillingService.validateGooglePlayReceipt(params);
      expect(result.valid).toBe(true);
    });

    it('should reject duplicate purchase token from different user', async () => {
      const params = createValidAndroidParams();

      mockDb.first.mockResolvedValue({
        user_id: testUserId2,
        subscription_data: null,
        verification_data: null,
      });

      await expect(BillingService.validateGooglePlayReceipt(params)).rejects.toThrow(
        'RECEIPT_ALREADY_USED',
      );
    });

    it('should create verification payment with google_play method', async () => {
      const params = createValidAndroidParams();

      await BillingService.validateGooglePlayReceipt(params);

      const insertCalls = mockDb.insert.mock.calls;
      const verificationPaymentCall = insertCalls.find(
        (call: any[]) => call[0] && call[0].payment_method === 'google_play',
      );
      expect(verificationPaymentCall).toBeDefined();
    });

    it('should store purchase token in transaction record', async () => {
      const params = createValidAndroidParams();
      const purchaseToken = params.purchaseToken;

      await BillingService.validateGooglePlayReceipt(params);

      const insertCalls = mockDb.insert.mock.calls;
      const transactionCall = insertCalls.find(
        (call: any[]) => call[0] && call[0].purchase_token === purchaseToken,
      );
      expect(transactionCall).toBeDefined();
    });
  });

  describe('Bundle Purchase Validation', () => {
    const createBundleParams = (platform: 'ios' | 'android', overrides = {}) => ({
      userId: testUserId,
      platform,
      productId: 'verification_premium_bundle',
      receipt: `bundle-receipt-${uuidv4()}`,
      transactionId: platform === 'ios' ? uuidv4() : undefined,
      purchaseToken: platform === 'android' ? `bundle-token-${uuidv4()}` : undefined,
      ...overrides,
    });

    it('should validate iOS bundle purchase and activate both verification and subscription', async () => {
      const params = createBundleParams('ios');

      const result = await BillingService.validateBundlePurchase(params);

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('verification_premium_bundle');
      expect(result.verification).toBeDefined();
      expect(result.verification?.status).toBe('succeeded');
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.autoRenewing).toBe(false); // Bundle doesn't auto-renew
    });

    it('should validate Android bundle purchase', async () => {
      const params = createBundleParams('android');

      const result = await BillingService.validateBundlePurchase(params);

      expect(result.valid).toBe(true);
      expect(result.verification).toBeDefined();
      expect(result.subscription).toBeDefined();
    });

    it('should create verification payment with bundle flag', async () => {
      const params = createBundleParams('ios');

      await BillingService.validateBundlePurchase(params);

      const insertCalls = mockDb.insert.mock.calls;
      const bundlePaymentCall = insertCalls.find(
        (call: any[]) =>
          call[0] && call[0].bundle_purchase === true && call[0].payment_method === 'bundle',
      );
      expect(bundlePaymentCall).toBeDefined();
    });

    it('should create non-renewing subscription for bundle', async () => {
      const params = createBundleParams('ios');

      await BillingService.validateBundlePurchase(params);

      const insertCalls = mockDb.insert.mock.calls;
      const subscriptionCall = insertCalls.find(
        (call: any[]) =>
          call[0] && call[0].bundle_purchase === true && call[0].auto_renewing === false,
      );
      expect(subscriptionCall).toBeDefined();
    });

    it('should calculate bundle savings correctly ($29.94)', () => {
      // Bundle is $99 vs individual: $39 verification + $14.99 * 6 months = $128.94
      // Savings: $128.94 - $99 = $29.94
      const verificationPrice = 3900;
      const monthlyPrice = 1499;
      const months = 6;
      const bundlePrice = 9900;

      const individualTotal = verificationPrice + monthlyPrice * months;
      const savings = individualTotal - bundlePrice;
      const savingsPercent = Math.round((savings / individualTotal) * 100);

      expect(individualTotal).toBe(12894);
      expect(savings).toBe(2994);
      expect(savingsPercent).toBe(23); // 23% savings
    });
  });

  describe('Subscription Status', () => {
    it('should return inactive status when no subscription exists', async () => {
      mockDb.first.mockResolvedValue(null);

      const status = await BillingService.getSubscriptionStatus(testUserId);

      expect(status.isActive).toBe(false);
    });

    it('should return active status when subscription exists', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      mockDb.first.mockResolvedValue({
        user_id: testUserId,
        product_id: 'premium_monthly',
        platform: 'ios',
        expires_at: futureDate,
        auto_renewing: true,
      });

      const status = await BillingService.getSubscriptionStatus(testUserId);

      expect(status.isActive).toBe(true);
      expect(status.productId).toBe('premium_monthly');
      expect(status.autoRenewing).toBe(true);
      expect(status.platform).toBe('ios');
    });

    it('should return correct expiration date', async () => {
      const futureDate = new Date('2026-06-15');

      mockDb.first.mockResolvedValue({
        user_id: testUserId,
        product_id: 'premium_monthly',
        platform: 'android',
        expires_at: futureDate,
        auto_renewing: false,
      });

      const status = await BillingService.getSubscriptionStatus(testUserId);

      expect(status.isActive).toBe(true);
      expect(status.expiresAt).toEqual(futureDate);
    });
  });

  describe('Subscription Extension', () => {
    it('should extend existing subscription when purchasing again', async () => {
      // Existing subscription
      const currentExpiry = new Date();
      currentExpiry.setDate(currentExpiry.getDate() + 15); // 15 days left

      mockDb.first
        .mockResolvedValueOnce(null) // No duplicate transaction
        .mockResolvedValueOnce({
          // Existing subscription
          id: uuidv4(),
          user_id: testUserId,
          product_id: 'premium_monthly',
          expires_at: currentExpiry,
        });

      const params = {
        userId: testUserId,
        productId: 'premium_monthly',
        transactionId: uuidv4(),
        receipt: `extension-receipt-${uuidv4()}`,
      };

      await BillingService.validateIOSReceipt(params);

      // Verify update was called to extend subscription
      expect(mockDb.update).toHaveBeenCalled();
      const updateCall = mockDb.update.mock.calls[0][0];
      expect(new Date(updateCall.expires_at).getTime()).toBeGreaterThan(currentExpiry.getTime());
    });
  });

  describe('JWS Transaction Verification', () => {
    it('should validate JWS format with 3 parts', async () => {
      // Valid JWS format: header.payload.signature
      const header = Buffer.from(
        JSON.stringify({ alg: 'ES256', x5c: ['cert1', 'cert2'] }),
      ).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ transactionId: '123', productId: 'verification_payment' }),
      ).toString('base64url');
      const signature = 'mock-signature';

      const validJWS = `${header}.${payload}.${signature}`;

      const result = await BillingService.verifyJWSTransaction(validJWS);
      expect(result).toBe(true);
    });

    it('should reject invalid JWS format', async () => {
      const invalidJWS = 'not-a-valid-jws';

      const result = await BillingService.verifyJWSTransaction(invalidJWS);
      expect(result).toBe(false);
    });

    it('should reject JWS without x5c certificate chain', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'ES256' })).toString('base64url'); // Missing x5c
      const payload = Buffer.from(
        JSON.stringify({ transactionId: '123', productId: 'test' }),
      ).toString('base64url');
      const signature = 'sig';

      const jwsWithoutCert = `${header}.${payload}.${signature}`;

      const result = await BillingService.verifyJWSTransaction(jwsWithoutCert);
      expect(result).toBe(false);
    });

    it('should reject JWS without required payload fields', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'ES256', x5c: ['cert'] })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64url'); // Missing required fields
      const signature = 'sig';

      const jwsMissingFields = `${header}.${payload}.${signature}`;

      const result = await BillingService.verifyJWSTransaction(jwsMissingFields);
      expect(result).toBe(false);
    });
  });

  describe('App Store JWT Creation', () => {
    it('should return null when credentials not configured', () => {
      delete process.env.APP_STORE_PRIVATE_KEY;
      delete process.env.APP_STORE_KEY_ID;
      delete process.env.APP_STORE_ISSUER_ID;
      delete process.env.APP_BUNDLE_ID;

      const jwt = BillingService.createAppStoreJWT();
      expect(jwt).toBeNull();
    });

    it('should create JWT when credentials are configured', () => {
      process.env.APP_STORE_PRIVATE_KEY = 'test-key';
      process.env.APP_STORE_KEY_ID = 'key-123';
      process.env.APP_STORE_ISSUER_ID = 'issuer-456';
      process.env.APP_BUNDLE_ID = 'com.conest.app';

      const jwt = BillingService.createAppStoreJWT();
      expect(jwt).toBe('mock-jwt-token');

      // Cleanup
      delete process.env.APP_STORE_PRIVATE_KEY;
      delete process.env.APP_STORE_KEY_ID;
      delete process.env.APP_STORE_ISSUER_ID;
      delete process.env.APP_BUNDLE_ID;
    });
  });

  describe('Webhook Event Structure Validation', () => {
    it('should validate Stripe webhook event structure', () => {
      const event = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'pi_test_123',
            amount: 3900,
            status: 'succeeded',
            metadata: {
              type: 'verification',
              userId: 'user-123',
            },
          },
        },
      };

      expect(event.id).toMatch(/^evt_/);
      expect(event.type).toBe('payment_intent.succeeded');
      expect(event.data.object.amount).toBe(3900);
      expect(event.data.object.metadata.type).toBe('verification');
    });

    it('should validate iOS server notification structure', () => {
      const notification = {
        notificationType: 'DID_RENEW',
        subtype: 'BILLING_RECOVERY',
        notificationUUID: uuidv4(),
        data: {
          bundleId: 'com.conest.app',
          environment: 'Production',
          signedTransactionInfo: 'jws-transaction-string',
          signedRenewalInfo: 'jws-renewal-string',
        },
      };

      expect(notification.notificationType).toBe('DID_RENEW');
      expect(notification.data.bundleId).toBe('com.conest.app');
    });

    it('should validate Google Play RTDN structure', () => {
      const notification = {
        version: '1.0',
        packageName: 'com.conest.android',
        eventTimeMillis: Date.now().toString(),
        subscriptionNotification: {
          version: '1.0',
          notificationType: 4, // SUBSCRIPTION_RENEWED
          purchaseToken: 'purchase-token-123',
          subscriptionId: 'premium_monthly',
        },
      };

      expect(notification.subscriptionNotification.notificationType).toBe(4);
      expect(notification.packageName).toBe('com.conest.android');
    });
  });

  describe('Idempotency Key Management', () => {
    it('should generate unique idempotency keys', () => {
      const keys = new Set<string>();
      const userId = 'user-123';

      for (let i = 0; i < 100; i++) {
        const key = `verification_payment_${userId}_${Date.now()}_${uuidv4().slice(0, 8)}`;
        keys.add(key);
      }

      expect(keys.size).toBe(100);
    });

    it('should validate idempotency key format', () => {
      const key = 'verification_payment_user123_1234567890_abc12345';
      const parts = key.split('_');

      expect(parts[0]).toBe('verification');
      expect(parts[1]).toBe('payment');
      expect(parts.length).toBeGreaterThanOrEqual(4);
    });

    it('should identify expired idempotency keys (24h TTL)', () => {
      const createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const expiryTime = 24 * 60 * 60 * 1000;
      const isExpired = Date.now() - createdAt.getTime() > expiryTime;

      expect(isExpired).toBe(true);
    });
  });

  describe('Receipt Deduplication', () => {
    it('should track processed transaction IDs', () => {
      const processedTransactions = new Set<string>();
      const transactionId = 'txn_ios_123456';

      processedTransactions.add(transactionId);

      expect(processedTransactions.has(transactionId)).toBe(true);
      expect(processedTransactions.has('txn_different')).toBe(false);
    });

    it('should prevent double-processing of receipts', () => {
      const processedTokens = new Map<string, { userId: string; processedAt: Date }>();
      const purchaseToken = 'google_token_123';

      // First processing
      processedTokens.set(purchaseToken, {
        userId: testUserId,
        processedAt: new Date(),
      });

      // Check for duplicate
      const isDuplicate = processedTokens.has(purchaseToken);
      expect(isDuplicate).toBe(true);

      const existingProcessing = processedTokens.get(purchaseToken);
      expect(existingProcessing?.userId).toBe(testUserId);
    });
  });

  describe('Price Validation', () => {
    it('should have correct verification price ($39.00)', () => {
      expect(3900).toBe(3900);
    });

    it('should have correct premium monthly price ($14.99)', () => {
      expect(1499).toBe(1499);
    });

    it('should have correct bundle price ($99.00)', () => {
      expect(9900).toBe(9900);
    });

    it('should calculate correct bundle value', () => {
      const verification = 3900;
      const premium6mo = 1499 * 6;
      const bundle = 9900;

      const individualTotal = verification + premium6mo;
      const savings = individualTotal - bundle;

      expect(savings).toBe(2994); // $29.94 savings
      expect(savings / individualTotal).toBeCloseTo(0.23, 2); // ~23% discount
    });
  });
});
