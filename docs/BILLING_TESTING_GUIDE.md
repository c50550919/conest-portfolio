# Google Play Billing Testing Guide

Comprehensive testing guide for CoNest Google Play Billing integration.

## Overview

This guide covers testing strategies for:
- Premium subscription ($4.99/month)
- Success fee purchase ($29 one-time)
- Receipt validation
- Subscription lifecycle
- Error handling

---

## Test Environment Setup

### 1. License Testing Accounts

Configure test accounts in Google Play Console:

1. Go to **Google Play Console** → **Setup** → **License testing**
2. Add Gmail addresses that will be used for testing
3. Test accounts can make purchases without real charges
4. Test subscriptions complete within minutes (not monthly)

**Example test accounts**:
```
test1@gmail.com
test2@gmail.com
developer@conest.com
```

### 2. Enable Debug Mode

#### Mobile App
```typescript
// Add to App.tsx or index.tsx
if (__DEV__) {
  console.log('Billing debug mode enabled');
}
```

#### Backend
```env
# .env.test
NODE_ENV=test
LOG_LEVEL=debug
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=./config/test-service-account.json
```

---

## Test Scenarios

### Scenario 1: Premium Subscription Purchase

**Objective**: Test complete subscription purchase flow

**Steps**:
1. Open mobile app as test user
2. Navigate to Subscription screen
3. View premium plan details
4. Click "Subscribe Now"
5. Complete Google Play purchase flow
6. Verify subscription status updates

**Expected Results**:
- ✅ Subscription screen shows premium plan at $4.99/month
- ✅ Google Play purchase dialog appears
- ✅ Purchase completes successfully
- ✅ Backend validates receipt
- ✅ Subscription status shows "active"
- ✅ Premium features are now accessible
- ✅ Database record created in `subscriptions` table

**Test Code**:
```typescript
describe('Premium Subscription Purchase', () => {
  it('should complete subscription purchase', async () => {
    // Initialize billing
    await GooglePlayBillingService.initConnection();

    // Get subscription products
    const subscriptions = await GooglePlayBillingService.getSubscriptions();
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].productId).toBe('premium_monthly');

    // Purchase subscription
    const result = await GooglePlayBillingService.purchaseSubscription('premium_monthly');
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();

    // Check subscription status
    const status = await GooglePlayBillingService.checkSubscriptionStatus();
    expect(status.isActive).toBe(true);
    expect(status.productId).toBe('premium_monthly');
  });
});
```

---

### Scenario 2: Success Fee Purchase

**Objective**: Test one-time success fee payment

**Steps**:
1. Open mobile app as test user with signed lease
2. Navigate to Success Fee screen
3. View fee details ($29)
4. Click "Pay Success Fee"
5. Confirm payment in dialog
6. Complete Google Play purchase
7. Verify payment confirmation screen

**Expected Results**:
- ✅ Success fee screen shows $29 amount
- ✅ Google Play purchase dialog appears
- ✅ Purchase completes successfully
- ✅ Backend validates receipt
- ✅ Payment confirmation screen displayed
- ✅ Receipt details shown
- ✅ Database record created with `purchase_type: 'one_time'`

**Test Code**:
```typescript
describe('Success Fee Purchase', () => {
  it('should complete success fee payment', async () => {
    // Initialize billing
    await GooglePlayBillingService.initConnection();

    // Get products
    const products = await GooglePlayBillingService.getProducts();
    expect(products).toHaveLength(1);
    expect(products[0].productId).toBe('success_fee');

    // Purchase success fee
    const result = await GooglePlayBillingService.purchaseProduct('success_fee');
    expect(result.success).toBe(true);

    // Verify purchase recorded
    const hasPaid = await SubscriptionService.hasUserPaidSuccessFee(userId);
    expect(hasPaid).toBe(true);
  });
});
```

---

### Scenario 3: Restore Purchases

**Objective**: Test purchase restoration on new device

**Steps**:
1. Purchase premium subscription on device A
2. Log out and uninstall app
3. Install app on device B
4. Log in with same account
5. Click "Restore Purchases"
6. Verify subscription status restored

**Expected Results**:
- ✅ Restore purchases completes successfully
- ✅ Backend validates restored purchases
- ✅ Subscription status shows "active"
- ✅ Premium features accessible
- ✅ No duplicate subscription records created

**Test Code**:
```typescript
describe('Restore Purchases', () => {
  it('should restore previous purchases', async () => {
    // Initialize billing
    await GooglePlayBillingService.initConnection();

    // Restore purchases
    const purchases = await GooglePlayBillingService.restorePurchases();
    expect(purchases.length).toBeGreaterThan(0);

    // Verify subscription restored
    const status = await GooglePlayBillingService.checkSubscriptionStatus();
    expect(status.isActive).toBe(true);
  });
});
```

---

### Scenario 4: Subscription Cancellation

**Objective**: Test subscription cancellation flow

**Steps**:
1. Have active premium subscription
2. Navigate to Subscription screen
3. Click "Manage Subscription"
4. Follow link to Google Play subscriptions
5. Cancel subscription in Google Play
6. Return to app
7. Verify status shows "cancelling at period end"

**Expected Results**:
- ✅ Subscription remains active until expiration
- ✅ `auto_renewing` flag set to `false`
- ✅ Expiration date displayed
- ✅ Premium features still accessible
- ✅ After expiration, subscription marked as "expired"

**Test Code**:
```typescript
describe('Subscription Cancellation', () => {
  it('should cancel subscription', async () => {
    // Cancel subscription
    const result = await SubscriptionService.cancelSubscription(userId);
    expect(result).toBeDefined();
    expect(result.auto_renewing).toBe(false);

    // Verify still active until expiration
    const status = await SubscriptionService.getSubscriptionStatus(userId);
    expect(status.isActive).toBe(true);
    expect(status.autoRenewing).toBe(false);
  });
});
```

---

### Scenario 5: Receipt Validation

**Objective**: Test server-side receipt validation

**Steps**:
1. Complete purchase in mobile app
2. App sends receipt to backend
3. Backend validates with Google Play API
4. Backend creates subscription record
5. Backend returns validation result to app

**Expected Results**:
- ✅ Receipt sent to backend immediately after purchase
- ✅ Backend validates receipt with Google Play API
- ✅ Valid receipt returns success response
- ✅ Invalid/expired receipt returns error
- ✅ Duplicate receipt detected and rejected
- ✅ Subscription record created only for valid receipt

**Test Code**:
```typescript
describe('Receipt Validation', () => {
  it('should validate subscription receipt', async () => {
    const validationResult = await GooglePlayValidationService.validateSubscription(
      'test_purchase_token',
      'premium_monthly'
    );

    expect(validationResult.valid).toBe(true);
    expect(validationResult.expiresAt).toBeDefined();
    expect(validationResult.autoRenewing).toBeDefined();
  });

  it('should reject invalid receipt', async () => {
    const validationResult = await GooglePlayValidationService.validateSubscription(
      'invalid_token',
      'premium_monthly'
    );

    expect(validationResult.valid).toBe(false);
    expect(validationResult.error).toBeDefined();
  });

  it('should reject duplicate receipt', async () => {
    // First validation - should succeed
    await SubscriptionService.createSubscription({
      userId: 'user1',
      productId: 'premium_monthly',
      purchaseToken: 'duplicate_token',
      transactionId: 'txn1',
    });

    // Second validation - should fail
    await expect(
      SubscriptionService.createSubscription({
        userId: 'user1',
        productId: 'premium_monthly',
        purchaseToken: 'duplicate_token',
        transactionId: 'txn1',
      })
    ).rejects.toThrow('DUPLICATE_PURCHASE');
  });
});
```

---

### Scenario 6: Subscription Expiration

**Objective**: Test automatic subscription expiration

**Steps**:
1. Create test subscription with short expiration (test subs expire faster)
2. Wait for expiration time to pass
3. Run expiration cron job
4. Verify subscription marked as expired
5. Verify premium features no longer accessible

**Expected Results**:
- ✅ Subscription remains active until expiration time
- ✅ Cron job detects expired subscription
- ✅ Status updated to "expired"
- ✅ Premium features blocked
- ✅ User prompted to renew

**Test Code**:
```typescript
describe('Subscription Expiration', () => {
  it('should expire subscription', async () => {
    // Create subscription that expires soon
    const subscription = await SubscriptionModel.createSubscription({
      user_id: userId,
      product_id: 'premium_monthly',
      purchase_token: 'test_token',
      transaction_id: 'test_txn',
      purchase_type: 'subscription',
      expires_at: new Date(Date.now() - 1000), // Already expired
      auto_renewing: false,
    });

    // Run expiration job
    const expiredCount = await SubscriptionService.expireSubscriptions();
    expect(expiredCount).toBeGreaterThan(0);

    // Verify subscription expired
    const status = await SubscriptionService.getSubscriptionStatus(userId);
    expect(status.isActive).toBe(false);
  });
});
```

---

### Scenario 7: Error Handling

**Objective**: Test error scenarios and edge cases

**Test Cases**:

#### Network Error During Purchase
```typescript
it('should handle network error gracefully', async () => {
  // Simulate network error
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Network error'));

  const result = await GooglePlayBillingService.purchaseSubscription('premium_monthly');

  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  // User should see error message and retry option
});
```

#### Backend Validation Failure
```typescript
it('should handle validation failure', async () => {
  const result = await SubscriptionService.createSubscription({
    userId: 'user1',
    productId: 'premium_monthly',
    purchaseToken: 'invalid_token',
    transactionId: 'txn1',
  });

  expect(result).toBeUndefined();
  // Purchase should not be recorded
});
```

#### Google Play API Timeout
```typescript
it('should handle API timeout', async () => {
  // Simulate timeout
  jest.setTimeout(1000);

  await expect(
    GooglePlayValidationService.validateSubscription('test_token', 'premium_monthly')
  ).rejects.toThrow('timeout');
});
```

---

## Performance Testing

### Load Testing

Test concurrent purchase validation:

```typescript
describe('Load Testing', () => {
  it('should handle concurrent validations', async () => {
    const promises = [];

    // Simulate 100 concurrent validations
    for (let i = 0; i < 100; i++) {
      promises.push(
        SubscriptionService.createSubscription({
          userId: `user${i}`,
          productId: 'premium_monthly',
          purchaseToken: `token${i}`,
          transactionId: `txn${i}`,
        })
      );
    }

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    expect(successful).toBe(100);
  });
});
```

### Response Time Testing

```typescript
describe('Performance', () => {
  it('should validate receipt within 2 seconds', async () => {
    const start = Date.now();

    await GooglePlayValidationService.validateSubscription(
      'test_token',
      'premium_monthly'
    );

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
```

---

## Security Testing

### Test Cases

1. **Unauthorized Access**:
```typescript
it('should reject unauthenticated requests', async () => {
  const response = await request(app)
    .post('/api/billing/validate')
    .send({ productId: 'premium_monthly' })
    .expect(401);
});
```

2. **Invalid Purchase Token**:
```typescript
it('should reject invalid purchase token', async () => {
  const result = await GooglePlayValidationService.validateSubscription(
    'invalid_token',
    'premium_monthly'
  );
  expect(result.valid).toBe(false);
});
```

3. **Replay Attack Prevention**:
```typescript
it('should prevent replay attacks', async () => {
  // First validation should succeed
  await SubscriptionService.createSubscription({
    userId: 'user1',
    productId: 'premium_monthly',
    purchaseToken: 'token123',
    transactionId: 'txn123',
  });

  // Second validation with same token should fail
  await expect(
    SubscriptionService.createSubscription({
      userId: 'user1',
      productId: 'premium_monthly',
      purchaseToken: 'token123',
      transactionId: 'txn123',
    })
  ).rejects.toThrow('DUPLICATE_PURCHASE');
});
```

---

## Integration Testing

### End-to-End Test

Complete purchase flow from mobile to backend:

```typescript
describe('E2E Billing Flow', () => {
  it('should complete full purchase flow', async () => {
    // Step 1: Mobile app purchases subscription
    const purchaseResult = await GooglePlayBillingService.purchaseSubscription('premium_monthly');
    expect(purchaseResult.success).toBe(true);

    // Step 2: Backend validates receipt
    const subscription = await SubscriptionService.createSubscription({
      userId: 'test_user',
      productId: purchaseResult.productId,
      purchaseToken: purchaseResult.purchaseToken!,
      transactionId: purchaseResult.transactionId!,
    });
    expect(subscription).toBeDefined();

    // Step 3: Check subscription status
    const status = await SubscriptionService.getSubscriptionStatus('test_user');
    expect(status.isActive).toBe(true);

    // Step 4: Verify premium access
    const hasPremium = status.isPremium;
    expect(hasPremium).toBe(true);
  });
});
```

---

## Monitoring and Logging

### Key Metrics to Monitor

1. **Purchase Success Rate**: Percentage of successful purchases
2. **Validation Success Rate**: Percentage of valid receipts
3. **Average Validation Time**: Time to validate receipt
4. **Error Rate**: Percentage of failed operations
5. **Subscription Churn**: Monthly cancellation rate

### Logging Examples

```typescript
// Mobile app logging
console.log('Billing: Purchase initiated', {
  productId: 'premium_monthly',
  userId: user.id,
  timestamp: new Date().toISOString(),
});

// Backend logging
logger.info('Receipt validation', {
  userId: req.user.id,
  productId: body.productId,
  valid: result.valid,
  duration: Date.now() - startTime,
});
```

---

## Test Data Cleanup

After testing, clean up test data:

```typescript
describe('Cleanup', () => {
  afterAll(async () => {
    // Delete test subscriptions
    await db('subscriptions').where('user_id', 'LIKE', 'test_%').delete();

    // Clear billing cache
    await GooglePlayBillingService.clearSubscriptionCache();

    // End billing connection
    await GooglePlayBillingService.endConnection();
  });
});
```

---

## Troubleshooting Test Issues

### Issue: "Product not found"

**Solution**: Ensure products are activated in Google Play Console and wait 24 hours for sync.

### Issue: Test purchases not working

**Solution**: Verify test account is added to license testers list.

### Issue: Validation always fails

**Solution**: Check service account permissions and API key configuration.

### Issue: Duplicate purchase errors

**Solution**: Clear test data between test runs or use unique tokens.

---

## Continuous Integration

### CI/CD Pipeline

```yaml
# .github/workflows/billing-tests.yml
name: Billing Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend
          npm install

      - name: Run billing tests
        env:
          GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON }}
          GOOGLE_PLAY_PACKAGE_NAME: com.conest.app
        run: |
          cd backend
          npm test -- --testPathPattern=billing
```

---

## Summary

This testing guide covers:
- ✅ Premium subscription purchase flow
- ✅ Success fee one-time purchase
- ✅ Purchase restoration
- ✅ Subscription lifecycle (cancel, expire, renew)
- ✅ Receipt validation (valid, invalid, duplicate)
- ✅ Error handling
- ✅ Performance testing
- ✅ Security testing
- ✅ End-to-end integration testing

All tests should pass before deploying to production.
