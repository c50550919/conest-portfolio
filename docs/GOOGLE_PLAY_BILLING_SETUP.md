# Google Play Billing Setup Guide

Complete guide for setting up Google Play in-app billing for CoNest platform.

## Overview

CoNest uses Google Play Billing for:
- **Premium Subscription**: $4.99/month recurring subscription
- **Success Fee**: $29 one-time purchase when lease is signed

## Prerequisites

- Google Play Console account (https://play.google.com/console)
- Published or draft Android app on Google Play
- Google Cloud Platform project with billing enabled
- Node.js backend with Google APIs client library installed

---

## Part 1: Google Play Console Setup

### 1.1 Create Products

#### Premium Monthly Subscription

1. **Navigate to Monetization**:
   - Go to Google Play Console
   - Select your app (com.conest.app)
   - Navigate to **Monetize** → **Products** → **Subscriptions**

2. **Create Subscription**:
   - Click **Create subscription**
   - Product ID: `premium_monthly`
   - Name: `CoNest Premium Monthly`
   - Description: `Premium features including unlimited profile views, advanced filters, priority support, read receipts, and extended visibility`

3. **Set Pricing**:
   - Base plan ID: `premium-monthly-base`
   - Billing period: **Monthly (P1M)**
   - Price: **$4.99 USD**
   - Add pricing for all countries where app is available
   - Free trial: Optional (7 days recommended)

4. **Configure Options**:
   - Grace period: **3 days** (recommended)
   - Account hold: **30 days** (recommended)
   - Subscription benefits: List premium features

5. **Save and Activate**:
   - Click **Save**
   - Click **Activate** to make subscription available

#### Success Fee One-Time Purchase

1. **Navigate to In-app Products**:
   - Go to **Monetize** → **Products** → **In-app products**

2. **Create Product**:
   - Click **Create product**
   - Product ID: `success_fee`
   - Name: `CoNest Success Fee`
   - Description: `One-time payment when you successfully find your roommate and sign a lease together`

3. **Set Pricing**:
   - Price: **$29.00 USD**
   - Add pricing for all countries

4. **Status**:
   - Status: **Active**
   - Click **Save**

### 1.2 Configure Service Account for API Access

1. **Go to Google Cloud Console**:
   - Visit https://console.cloud.google.com
   - Select your project (or create new one)

2. **Enable Android Publisher API**:
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google Play Android Developer API"
   - Click **Enable**

3. **Create Service Account**:
   - Go to **IAM & Admin** → **Service Accounts**
   - Click **Create Service Account**
   - Name: `conest-billing-validator`
   - Description: `Service account for validating Google Play purchases`
   - Click **Create and Continue**

4. **Grant Permissions**:
   - Role: **Service Account User**
   - Click **Continue**
   - Click **Done**

5. **Create JSON Key**:
   - Click on the created service account
   - Go to **Keys** tab
   - Click **Add Key** → **Create new key**
   - Select **JSON** format
   - Click **Create**
   - **Save the downloaded JSON file securely** (you'll need this for backend)

6. **Link Service Account to Play Console**:
   - Go back to Google Play Console
   - Navigate to **Setup** → **API access**
   - Click **Link** next to Google Cloud Project
   - Find your service account in the list
   - Click **Grant access**
   - Permissions:
     - ✅ View financial data
     - ✅ View app information and download bulk reports
     - ✅ Manage orders and subscriptions
   - Click **Invite user**
   - Click **Send invite**

---

## Part 2: Backend Configuration

### 2.1 Environment Variables

Add these environment variables to your backend `.env` file:

```env
# Google Play Billing Configuration
GOOGLE_PLAY_PACKAGE_NAME=com.conest.app
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json

# Alternative: Use JSON string directly (for cloud deployment)
# GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

### 2.2 Service Account Key Setup

**Option 1: File Path (Development)**
```bash
# Copy service account JSON to backend directory
cp ~/Downloads/conest-billing-validator-*.json backend/config/google-play-service-account.json

# Update .env
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=./config/google-play-service-account.json
```

**Option 2: Environment Variable (Production)**
```bash
# For cloud deployment (Heroku, AWS, etc.)
# Convert JSON to single line and set as environment variable
export GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

### 2.3 Database Migration

Create database table for subscriptions:

```bash
cd backend
npm run migrate
```

Migration file should include:

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id VARCHAR(255) NOT NULL,
  purchase_token TEXT NOT NULL UNIQUE,
  transaction_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'refunded')),
  purchase_type VARCHAR(50) NOT NULL CHECK (purchase_type IN ('subscription', 'one_time')),
  platform VARCHAR(50) NOT NULL DEFAULT 'google_play',
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_renewing BOOLEAN DEFAULT false,
  receipt_data TEXT,
  validation_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_purchase_token ON subscriptions(purchase_token);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at) WHERE status = 'active';
```

### 2.4 API Endpoints

Add billing endpoints to your backend:

```typescript
// backend/src/routes/billing.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { SubscriptionService } from '../services/SubscriptionService';

const router = express.Router();

// Validate receipt and create subscription
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { productId, purchaseToken, transactionId, transactionReceipt } = req.body;
    const userId = req.user.id;

    const subscription = await SubscriptionService.createSubscription({
      userId,
      productId,
      purchaseToken,
      transactionId,
      receiptData: transactionReceipt,
    });

    res.json({
      valid: true,
      subscription: {
        productId: subscription.product_id,
        expiresAt: subscription.expires_at,
        autoRenewing: subscription.auto_renewing,
      },
    });
  } catch (error: any) {
    console.error('Receipt validation error:', error);
    res.status(400).json({ valid: false, error: error.message });
  }
});

// Get subscription status
router.get('/subscription/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await SubscriptionService.getSubscriptionStatus(userId);
    res.json(status);
  } catch (error: any) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/subscription/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await SubscriptionService.cancelSubscription(userId);
    res.json({ success: true, subscription });
  } catch (error: any) {
    console.error('Subscription cancellation error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

Add to main app:
```typescript
// backend/src/server.ts
import billingRoutes from './routes/billing';

app.use('/api/billing', billingRoutes);
```

---

## Part 3: Mobile App Configuration

### 3.1 Android Build Configuration

Update `android/app/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies

    // Google Play Billing (automatically included via react-native-iap)
    implementation 'com.android.billingclient:billing:6.0.1'
}
```

### 3.2 Permissions

Already included in AndroidManifest.xml:
```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

### 3.3 Environment Configuration

Update `.env` file:
```env
API_URL=https://api.conest.com
```

---

## Part 4: Testing

### 4.1 Create Test Account

1. **Add License Testers**:
   - Go to Google Play Console
   - Navigate to **Setup** → **License testing**
   - Add test email addresses (Gmail accounts)
   - These accounts can make test purchases without real charges

2. **Create Test Subscription**:
   - Test subscriptions complete within minutes (not monthly)
   - Test subscription lifecycle: subscribe → renew → cancel
   - No real charges for license testers

### 4.2 Test Scenarios

#### Test 1: Premium Subscription

```typescript
// Mobile app test
import GooglePlayBillingService from './services/billing/GooglePlayBillingService';

// Initialize billing
await GooglePlayBillingService.initConnection();

// Get subscription products
const subscriptions = await GooglePlayBillingService.getSubscriptions();
console.log('Subscriptions:', subscriptions);

// Purchase subscription
const result = await GooglePlayBillingService.purchaseSubscription('premium_monthly');
console.log('Purchase result:', result);

// Check subscription status
const status = await GooglePlayBillingService.checkSubscriptionStatus();
console.log('Subscription status:', status);
```

#### Test 2: Success Fee Purchase

```typescript
// Get one-time products
const products = await GooglePlayBillingService.getProducts();
console.log('Products:', products);

// Purchase success fee
const result = await GooglePlayBillingService.purchaseProduct('success_fee');
console.log('Purchase result:', result);
```

#### Test 3: Restore Purchases

```typescript
// Restore previous purchases
const purchases = await GooglePlayBillingService.restorePurchases();
console.log('Restored purchases:', purchases);
```

#### Test 4: Backend Validation

```bash
# Test receipt validation endpoint
curl -X POST https://api.conest.com/api/billing/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "premium_monthly",
    "purchaseToken": "test_purchase_token",
    "transactionId": "test_transaction_id"
  }'
```

### 4.3 Test Cards

Google Play test accounts use test credit cards automatically.
No real payment information is required for license testers.

---

## Part 5: Production Deployment

### 5.1 Pre-Launch Checklist

- [ ] All products activated in Google Play Console
- [ ] Service account properly configured with correct permissions
- [ ] Backend environment variables set correctly
- [ ] Database migration completed
- [ ] API endpoints tested and working
- [ ] Mobile app tested with license testers
- [ ] Receipt validation working end-to-end
- [ ] Subscription lifecycle tested (subscribe, renew, cancel)
- [ ] Error handling implemented
- [ ] Logging and monitoring configured

### 5.2 Security Checklist

- [ ] Service account JSON key stored securely (not in Git)
- [ ] Receipt validation performed server-side only
- [ ] Purchase tokens validated before granting access
- [ ] Duplicate purchase detection implemented
- [ ] API endpoints require authentication
- [ ] Error messages don't leak sensitive information
- [ ] HTTPS enforced for all API calls

### 5.3 Go-Live Steps

1. **Release Mobile App**:
   - Build release APK/AAB
   - Upload to Google Play Console
   - Submit for review

2. **Monitor Initial Purchases**:
   - Check backend logs for validation errors
   - Monitor Google Play Console for payment issues
   - Track subscription metrics

3. **Set Up Cron Jobs**:
   ```typescript
   // Check and expire subscriptions daily
   cron.schedule('0 0 * * *', async () => {
     const expired = await SubscriptionService.expireSubscriptions();
     console.log(`Expired ${expired} subscriptions`);
   });
   ```

---

## Part 6: Troubleshooting

### Common Issues

#### Issue: "Product not found" error

**Solution**:
- Ensure product is activated in Google Play Console
- Wait 24 hours after creating product (Google Play sync time)
- Check package name matches exactly
- Verify app is signed with release key

#### Issue: "Authentication failed" during validation

**Solution**:
- Verify service account JSON key is correct
- Check service account has proper permissions in Play Console
- Ensure Android Publisher API is enabled in Google Cloud
- Verify service account email is linked to Play Console

#### Issue: Duplicate purchase detected

**Solution**:
- This is expected behavior for security
- Check if purchase was already validated
- User should restore purchases instead of buying again

#### Issue: Subscription not auto-renewing

**Solution**:
- Check subscription configuration in Play Console
- Verify grace period and account hold settings
- Ensure user's payment method is valid
- Check for expired test subscriptions (test subs complete faster)

### Debug Mode

Enable debug logging:

```typescript
// Mobile app
GooglePlayBillingService.enableDebugLogging();

// Backend
process.env.LOG_LEVEL = 'debug';
```

### Support Resources

- Google Play Billing Documentation: https://developer.android.com/google/play/billing
- Google Play Developer API: https://developers.google.com/android-publisher
- react-native-iap Documentation: https://github.com/dooboolab/react-native-iap
- Google Play Console Help: https://support.google.com/googleplay/android-developer

---

## Part 7: Monitoring and Analytics

### Key Metrics to Track

1. **Subscription Metrics**:
   - Monthly Recurring Revenue (MRR)
   - Churn rate
   - Subscription growth rate
   - Average subscription lifetime

2. **Purchase Metrics**:
   - Success fee conversion rate
   - Failed purchase rate
   - Refund rate

3. **Technical Metrics**:
   - Receipt validation success rate
   - API response times
   - Error rates

### Analytics Implementation

```typescript
// Track subscription events
analytics.track('Subscription Purchased', {
  productId: 'premium_monthly',
  price: 4.99,
  userId: user.id,
});

analytics.track('Success Fee Paid', {
  productId: 'success_fee',
  price: 29.00,
  matchId: match.id,
  userId: user.id,
});
```

---

## Appendix: Migration from Stripe

If migrating from Stripe:

1. **Keep Stripe for Household Expenses**:
   - Stripe Connect still used for rent splitting
   - Only replace subscription/IAP payments with Google Play

2. **Dual System Transition**:
   - Support both Stripe and Google Play during transition
   - Check subscription source before granting access
   - Migrate existing Stripe subscribers gradually

3. **Data Migration**:
   - No direct migration needed
   - Users must re-subscribe via Google Play
   - Offer grace period or discount for existing subscribers

---

## Summary

Google Play Billing is now configured for:
- ✅ Premium monthly subscription ($4.99/month)
- ✅ Success fee one-time purchase ($29)
- ✅ Server-side receipt validation
- ✅ Subscription lifecycle management
- ✅ Test and production environments

For questions or issues, refer to troubleshooting section or contact the development team.
