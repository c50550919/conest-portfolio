# Migration Guide: Stripe to Google Play Billing

Guide for migrating CoNest payment system from Stripe to Google Play Billing for in-app purchases and subscriptions.

## Migration Overview

### What's Changing

**Before (Stripe)**:
- Premium subscriptions managed via Stripe
- Success fee payments via Stripe
- Household expense splitting via Stripe Connect

**After (Google Play Billing)**:
- ✅ Premium subscriptions via Google Play
- ✅ Success fee payments via Google Play
- ⚠️ Household expense splitting **REMAINS on Stripe Connect**

### Why Migrate?

1. **Platform Compliance**: Google Play requires in-app purchases through Google Play Billing
2. **Better UX**: Native Android payment experience
3. **Lower Fees**: Google Play takes 15% (vs Stripe's 2.9% + 30¢)
4. **Simplified Management**: One payment platform for mobile IAP

---

## Migration Strategy

### Phase 1: Dual System Support (Weeks 1-4)

Run both Stripe and Google Play Billing simultaneously:

```
┌─────────────────────────────────────┐
│         CoNest Platform             │
├─────────────────────────────────────┤
│  Subscriptions & IAP:               │
│  - Stripe (existing users)          │
│  - Google Play (new users)          │
│                                     │
│  Household Expenses:                │
│  - Stripe Connect (all users)       │
└─────────────────────────────────────┘
```

### Phase 2: Migration (Weeks 5-8)

Migrate existing Stripe subscribers to Google Play:

1. Notify existing subscribers of migration
2. Offer migration incentive (1 month free)
3. Cancel Stripe subscriptions
4. Create Google Play subscriptions

### Phase 3: Stripe Sunset (Week 9+)

Remove Stripe subscription code, keep only Stripe Connect for expenses.

---

## Technical Implementation

### Step 1: Install Google Play Billing

Already completed:
- ✅ `react-native-iap` installed on mobile
- ✅ `googleapis` installed on backend
- ✅ GooglePlayBillingService created
- ✅ GooglePlayValidationService created
- ✅ Subscription model created

### Step 2: Keep Stripe for Household Expenses

**DO NOT REMOVE**:
```typescript
// backend/src/config/stripe.ts - KEEP THIS
export default stripe;

// backend/src/services/paymentService.ts - KEEP THESE METHODS
PaymentService.createHouseholdStripeAccount()
PaymentService.splitRent()
PaymentService.processPayment() // for household expenses
```

**REMOVE ONLY**:
```typescript
// Methods to remove (subscription-related only)
// These will be replaced by Google Play Billing
PaymentService.createPaymentIntent() // for subscriptions
PaymentService.processSubscription()
PaymentService.cancelSubscription() // Stripe version
```

### Step 3: Update Subscription Check Logic

Add dual-system support:

```typescript
// backend/src/services/SubscriptionService.ts

export const SubscriptionService = {
  /**
   * Check if user has active subscription (Stripe OR Google Play)
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    // Check Google Play subscription
    const googlePlayStatus = await this.getSubscriptionStatus(userId);
    if (googlePlayStatus.isActive) {
      return true;
    }

    // LEGACY: Check Stripe subscription (during migration period)
    const stripeSubscription = await StripeSubscriptionModel.findActiveSubscription(userId);
    if (stripeSubscription && stripeSubscription.status === 'active') {
      return true;
    }

    return false;
  },

  /**
   * Get subscription source (for analytics)
   */
  async getSubscriptionSource(userId: string): Promise<'google_play' | 'stripe' | null> {
    const googlePlayStatus = await this.getSubscriptionStatus(userId);
    if (googlePlayStatus.isActive) {
      return 'google_play';
    }

    const stripeSubscription = await StripeSubscriptionModel.findActiveSubscription(userId);
    if (stripeSubscription && stripeSubscription.status === 'active') {
      return 'stripe';
    }

    return null;
  },
};
```

### Step 4: Update Mobile App Subscription UI

Add platform detection:

```typescript
// mobile/src/screens/subscription/SubscriptionScreen.tsx

const SubscriptionScreen: React.FC = () => {
  const [subscriptionSource, setSubscriptionSource] = useState<'google_play' | 'stripe' | null>(null);

  useEffect(() => {
    checkSubscriptionSource();
  }, []);

  const checkSubscriptionSource = async () => {
    // Check Google Play first
    const googlePlayStatus = await GooglePlayBillingService.checkSubscriptionStatus();
    if (googlePlayStatus.isActive) {
      setSubscriptionSource('google_play');
      return;
    }

    // Check Stripe (legacy)
    const response = await api.get('/api/subscription/source');
    if (response.data.source === 'stripe') {
      setSubscriptionSource('stripe');
    }
  };

  if (subscriptionSource === 'stripe') {
    return (
      <View style={styles.migrationBanner}>
        <Icon name="information" size={32} color="#FF6B6B" />
        <Text style={styles.migrationTitle}>Migrate to Google Play</Text>
        <Text style={styles.migrationText}>
          Get 1 month free when you migrate your subscription to Google Play!
        </Text>
        <TouchableOpacity style={styles.migrateButton} onPress={handleMigration}>
          <Text style={styles.migrateButtonText}>Migrate Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Regular Google Play subscription UI
  return (
    // ... existing Google Play billing UI
  );
};
```

### Step 5: Migration Endpoint

Create endpoint to migrate Stripe subscribers:

```typescript
// backend/src/routes/billing.ts

router.post('/migrate-from-stripe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Check existing Stripe subscription
    const stripeSubscription = await StripeSubscriptionModel.findActiveSubscription(userId);
    if (!stripeSubscription) {
      return res.status(400).json({ error: 'No active Stripe subscription found' });
    }

    // 2. Cancel Stripe subscription
    await stripe.subscriptions.cancel(stripeSubscription.stripe_subscription_id);

    // 3. Create Google Play subscription with promo (handled on client side)
    // Client will purchase via Google Play with promo code

    // 4. Mark Stripe subscription as migrated
    await StripeSubscriptionModel.updateSubscription(stripeSubscription.id, {
      status: 'migrated',
      migrated_at: new Date(),
    });

    // 5. Log migration for analytics
    logger.info('Subscription migrated from Stripe to Google Play', {
      userId,
      stripeSubscriptionId: stripeSubscription.id,
    });

    res.json({
      success: true,
      message: 'Subscription cancelled on Stripe. Please complete purchase on Google Play.',
    });
  } catch (error: any) {
    logger.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Database Changes

### Add Migration Tracking

```sql
-- Add migration columns to existing Stripe subscription table
ALTER TABLE stripe_subscriptions
ADD COLUMN migrated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN migrated_to VARCHAR(50); -- 'google_play'

-- Update existing active subscriptions to track source
ALTER TABLE subscriptions
ADD COLUMN source VARCHAR(50) DEFAULT 'google_play' CHECK (source IN ('stripe', 'google_play'));

-- Migration tracking table
CREATE TABLE subscription_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  from_platform VARCHAR(50) NOT NULL,
  to_platform VARCHAR(50) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  google_play_purchase_token TEXT,
  migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  promo_applied BOOLEAN DEFAULT false
);

CREATE INDEX idx_subscription_migrations_user_id ON subscription_migrations(user_id);
```

---

## User Communication

### Migration Email Template

```html
Subject: Upgrade Your CoNest Subscription - Get 1 Month Free!

Hi [User Name],

We're improving your CoNest experience with a more seamless payment system!

**What's Changing:**
- Your subscription will now be managed through Google Play
- Easier payment management
- Native Android experience
- Lower fees (more funds for platform improvements!)

**Special Offer:**
Migrate now and get **1 month FREE** on your premium subscription!

**How to Migrate:**
1. Open the CoNest app
2. Go to Settings → Subscription
3. Click "Migrate to Google Play"
4. Complete the one-time setup

**Important:**
- Your current subscription will remain active until [expiration date]
- No interruption to your premium features
- Household expense splitting remains unchanged

Questions? Contact support@conest.com

Thanks for being a valued CoNest member!

The CoNest Team
```

### In-App Migration Banner

```typescript
<View style={styles.migrationBanner}>
  <Icon name="gift" size={32} color="#FFD700" />
  <Text style={styles.bannerTitle}>Get 1 Month FREE! 🎉</Text>
  <Text style={styles.bannerText}>
    Migrate your subscription to Google Play and receive 1 month free premium.
  </Text>
  <TouchableOpacity style={styles.migrateButton} onPress={handleMigration}>
    <Text style={styles.migrateButtonText}>Migrate Now</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.remindLaterButton} onPress={handleRemindLater}>
    <Text style={styles.remindLaterText}>Remind me later</Text>
  </TouchableOpacity>
</View>
```

---

## Migration Timeline

### Week 1-2: Preparation
- [ ] Deploy Google Play Billing code
- [ ] Test dual-system support
- [ ] Create migration endpoint
- [ ] Prepare user communications

### Week 3: Soft Launch
- [ ] Enable Google Play Billing for new users only
- [ ] Monitor for issues
- [ ] Collect user feedback

### Week 4: Migration Notice
- [ ] Send migration email to existing Stripe subscribers
- [ ] Show in-app migration banner
- [ ] Publish FAQ and support docs

### Week 5-8: Active Migration
- [ ] Track migration rate
- [ ] Provide migration support
- [ ] Send reminder emails to non-migrators

### Week 9: Stripe Subscription Sunset
- [ ] Auto-migrate remaining Stripe subscribers
- [ ] Remove Stripe subscription code (keep Connect)
- [ ] Update documentation

---

## Monitoring and Rollback

### Key Metrics to Monitor

1. **Migration Rate**: Percentage of users migrated
2. **Churn Rate**: Users who don't migrate and cancel
3. **Error Rate**: Failed migrations or purchases
4. **Revenue Impact**: Compare Stripe vs Google Play revenue

### Rollback Plan

If migration fails or causes issues:

1. **Pause new Google Play subscriptions**
2. **Revert to Stripe-only for new users**
3. **Keep migrated users on Google Play**
4. **Investigate and fix issues**
5. **Resume migration when stable**

---

## Code Removal Checklist

After migration complete (Week 9+):

### Safe to Remove ❌

```typescript
// Stripe subscription-specific code
backend/src/routes/stripe-subscriptions.ts
backend/src/models/StripeSubscription.ts
backend/src/services/StripeSubscriptionService.ts

// Mobile Stripe subscription UI
mobile/src/screens/subscription/StripeSubscriptionScreen.tsx
mobile/src/services/StripeSubscriptionService.ts
```

### KEEP - Still Needed ✅

```typescript
// Stripe Connect for household expenses
backend/src/config/stripe.ts
backend/src/services/paymentService.ts (expense splitting methods)
backend/src/models/Payment.ts
backend/STRIPE_SETUP.md (for Connect setup)

// Household expense UI
mobile/src/screens/household/ExpenseSplitScreen.tsx
```

---

## FAQ

### Q: Will I lose my subscription data?
**A:** No, your subscription history is preserved. Only the payment method changes.

### Q: What happens to my Stripe payment method?
**A:** Stripe payment method remains for household expense splitting.

### Q: Can I migrate back to Stripe?
**A:** No, Google Play policy requires in-app purchases through Google Play.

### Q: Do I need to pay immediately during migration?
**A:** No, your current Stripe subscription remains active until expiration.

### Q: What if I have issues during migration?
**A:** Contact support@conest.com for immediate assistance.

---

## Support Resources

- Migration FAQ: `/docs/MIGRATION_FAQ.md`
- Google Play Setup: `/docs/GOOGLE_PLAY_BILLING_SETUP.md`
- Testing Guide: `/docs/BILLING_TESTING_GUIDE.md`
- Support Email: support@conest.com

---

## Summary

Migration from Stripe to Google Play Billing:
- ✅ Dual-system support during transition
- ✅ Stripe Connect retained for household expenses
- ✅ Migration incentive (1 month free)
- ✅ Gradual rollout with monitoring
- ✅ Rollback plan if needed
- ✅ Clear user communication

Expected timeline: **9 weeks from start to completion**

For questions or issues, contact the development team.
