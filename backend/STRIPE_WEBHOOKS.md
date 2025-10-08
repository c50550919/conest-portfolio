# Stripe Webhooks - Implementation Guide

Comprehensive guide for Stripe webhook handling in the CoNest platform.

## Overview

Webhooks enable real-time communication from Stripe to your backend when payment events occur. This eliminates the need for polling and ensures immediate payment status updates.

**Key Features**:
- Real-time payment status updates
- Automatic database synchronization
- Event-driven architecture
- Signature validation for security
- Idempotent event handling

---

## Webhook Architecture

### Flow Diagram

```
┌─────────────┐          ┌──────────────┐          ┌─────────────────┐
│   Stripe    │          │   Backend    │          │    Database     │
│  (Payment)  │          │   (Webhook)  │          │  (PostgreSQL)   │
└──────┬──────┘          └──────┬───────┘          └────────┬────────┘
       │                        │                           │
       │  1. Payment Event      │                           │
       ├────────────────────────>                           │
       │                        │                           │
       │  2. Verify Signature   │                           │
       │                        ├──────────┐                │
       │                        │          │                │
       │                        <──────────┘                │
       │                        │                           │
       │  3. Process Event      │                           │
       │                        ├───────────────────────────>
       │                        │  Update payment status    │
       │                        <───────────────────────────┤
       │                        │                           │
       │  4. Return 200 OK      │                           │
       <────────────────────────┤                           │
       │                        │                           │
```

---

## Event Types

### Payment Events

#### `payment_intent.succeeded`
Fired when a payment is successfully completed.

**Payload Example**:
```json
{
  "id": "evt_xxxxxxxxxxxxx",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxxxxxxxxxxxx",
      "amount": 150000,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {
        "payment_id": "payment-uuid",
        "household_id": "household-uuid",
        "payer_id": "user-uuid"
      }
    }
  }
}
```

**Handler Action**:
- Update payment status to `completed`
- Set `paid_at` timestamp
- Update payment with `stripe_charge_id`
- Log successful payment

---

#### `payment_intent.payment_failed`
Fired when a payment fails.

**Payload Example**:
```json
{
  "id": "evt_xxxxxxxxxxxxx",
  "type": "payment_intent.payment_failed",
  "data": {
    "object": {
      "id": "pi_xxxxxxxxxxxxx",
      "status": "requires_payment_method",
      "last_payment_error": {
        "code": "card_declined",
        "message": "Your card was declined."
      },
      "metadata": {
        "payment_id": "payment-uuid"
      }
    }
  }
}
```

**Handler Action**:
- Update payment status to `failed`
- Log failure reason
- Notify user (email/push notification)

---

#### `payment_intent.canceled`
Fired when a payment intent is canceled.

**Handler Action**:
- Update payment status to `failed`
- Log cancellation
- Release reserved funds (if applicable)

---

### Refund Events

#### `charge.refunded`
Fired when a charge is refunded.

**Payload Example**:
```json
{
  "id": "evt_xxxxxxxxxxxxx",
  "type": "charge.refunded",
  "data": {
    "object": {
      "id": "ch_xxxxxxxxxxxxx",
      "amount_refunded": 50000,
      "refunded": true
    }
  }
}
```

**Handler Action**:
- Log refund details
- Update payment records
- Notify affected users

---

### Connect Events

#### `account.updated`
Fired when a Stripe Connect account is updated.

**Payload Example**:
```json
{
  "id": "evt_xxxxxxxxxxxxx",
  "type": "account.updated",
  "data": {
    "object": {
      "id": "acct_xxxxxxxxxxxxx",
      "charges_enabled": true,
      "payouts_enabled": true,
      "requirements": {
        "currently_due": [],
        "eventually_due": []
      }
    }
  }
}
```

**Handler Action**:
- Log account status changes
- Update household Stripe account details
- Notify if onboarding completed

---

#### `account.application.deauthorized`
Fired when a user deauthorizes your platform's access to their Connect account.

**Handler Action**:
- Log deauthorization
- Disable Connect account in database
- Notify household administrators

---

## Implementation Details

### Webhook Endpoint

**URL**: `POST /api/stripe/webhook`

**Mounted Before Body Parsing**:
```typescript
// app.ts
app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);
```

**Why Raw Body?**
- Stripe signature verification requires the raw request body
- JSON parsing corrupts the signature
- Must be mounted before `express.json()` middleware

### Signature Validation

**Security Flow**:
```typescript
const sig = req.headers['stripe-signature'];
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Verify signature
const event = stripe.webhooks.constructEvent(
  req.body, // Raw body (Buffer)
  sig,      // Signature header
  webhookSecret
);
```

**What Gets Verified**:
- Request came from Stripe (not spoofed)
- Payload hasn't been tampered with
- Event is recent (prevents replay attacks)

### Event Processing

**Handler Implementation**:
```typescript
async handleStripeWebhook(event: Stripe.Event): Promise<void> {
  logger.info(`Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.processPayment(event.data.object.id);
        break;

      case 'payment_intent.payment_failed':
        const paymentId = event.data.object.metadata.payment_id;
        if (paymentId) {
          await PaymentModel.updatePayment(paymentId, { status: 'failed' });
        }
        break;

      // ... other event handlers
    }
  } catch (error: any) {
    logger.error(`Error processing webhook ${event.type}:`, error);
    throw error; // Stripe will retry
  }
}
```

---

## Idempotency

### Why Idempotency Matters

Stripe may send the same event multiple times due to:
- Network failures
- Timeouts
- Automatic retries
- Manual re-sends from Dashboard

**Solution**: Idempotent event processing

### Implementation Strategy

**1. Event ID Deduplication**:
```typescript
// Check if event already processed
const existingEvent = await db('webhook_events')
  .where({ stripe_event_id: event.id })
  .first();

if (existingEvent) {
  logger.info(`Event ${event.id} already processed, skipping`);
  return; // Return 200 OK without processing
}

// Process event
await processEvent(event);

// Store event ID
await db('webhook_events').insert({
  stripe_event_id: event.id,
  event_type: event.type,
  processed_at: new Date(),
});
```

**2. Database Migration** (add to migrations):
```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at);
```

---

## Error Handling

### Retry Logic

**Stripe's Retry Schedule**:
- Immediate retry on 5xx errors
- Exponential backoff: 5s, 25s, 2m, 10m, 30m, 1h, 2h, 3h
- Final retry after 3 days
- Webhook disabled after persistent failures

**Best Practices**:
```typescript
try {
  await processWebhookEvent(event);
  res.status(200).json({ received: true });
} catch (error) {
  if (isTransientError(error)) {
    // Return 5xx for Stripe to retry
    res.status(503).json({
      error: 'Temporary failure, please retry'
    });
  } else {
    // Return 200 to prevent retries for permanent errors
    logger.error('Permanent webhook error:', error);
    res.status(200).json({
      received: true,
      error: 'Logged for manual review'
    });
  }
}
```

### Error Types

**Transient Errors** (should retry):
- Database connection failures
- Timeout errors
- Network errors
- Rate limit errors

**Permanent Errors** (don't retry):
- Invalid event data
- Missing required fields
- Business logic errors
- Validation failures

---

## Monitoring & Logging

### Webhook Logging

**Log Structure**:
```typescript
logger.info('Webhook received', {
  eventId: event.id,
  eventType: event.type,
  timestamp: new Date().toISOString(),
  paymentIntentId: event.data.object.id,
  amount: event.data.object.amount,
});
```

### Monitoring Dashboard

**Key Metrics to Track**:
- Webhook success rate
- Average processing time
- Failed webhook count
- Retry attempts
- Event type distribution

**Stripe Dashboard Monitoring**:
1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your endpoint
3. View:
   - Recent deliveries
   - Success/failure rates
   - Response times
   - Error logs

### Alerting

**Critical Alerts**:
- Webhook success rate < 95%
- Processing time > 5 seconds
- Failed events > 10 in 1 hour
- Signature verification failures

---

## Testing Webhooks

### 1. Stripe CLI Testing

**Start Webhook Forwarding**:
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

**Trigger Test Events**:
```bash
# Payment succeeded
stripe trigger payment_intent.succeeded

# Payment failed
stripe trigger payment_intent.payment_failed

# Refund
stripe trigger charge.refunded

# Account updated
stripe trigger account.updated
```

### 2. Manual Testing (Stripe Dashboard)

1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. Click **Send test webhook**
4. Select event type
5. Click **Send test webhook**
6. View response

### 3. Integration Tests

**Example Test**:
```typescript
import request from 'supertest';
import stripe from '../config/stripe';

describe('Webhook Handler', () => {
  it('should process payment_intent.succeeded', async () => {
    // Create test event
    const event = stripe.webhooks.constructEvent(
      testPayload,
      testSignature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Send to webhook endpoint
    const response = await request(app)
      .post('/api/stripe/webhook')
      .set('stripe-signature', testSignature)
      .send(testPayload);

    expect(response.status).toBe(200);
    expect(response.body.received).toBe(true);

    // Verify database updated
    const payment = await PaymentModel.findById(paymentId);
    expect(payment.status).toBe('completed');
  });
});
```

---

## Production Checklist

- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] HTTPS enabled for production endpoint
- [ ] `STRIPE_WEBHOOK_SECRET` set in production environment
- [ ] Signature validation implemented and tested
- [ ] Idempotency handling implemented
- [ ] Error handling and logging configured
- [ ] Monitoring and alerting set up
- [ ] Database migrations for `webhook_events` table applied
- [ ] Integration tests passing
- [ ] Webhook endpoint tested with Stripe CLI
- [ ] Manual test webhook sent from Dashboard
- [ ] Retry logic tested and verified

---

## Troubleshooting

### Signature Verification Fails

**Symptoms**:
```
Error: Webhook signature verification failed
```

**Solutions**:
1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Check webhook endpoint uses raw body parsing
3. Ensure no middleware modifies request body before webhook handler
4. Restart server after updating webhook secret
5. Verify Stripe CLI is forwarding to correct endpoint

### Events Not Being Received

**Solutions**:
1. Check webhook endpoint is publicly accessible (use ngrok for local testing)
2. Verify endpoint URL in Stripe Dashboard
3. Check firewall/security group rules
4. Ensure endpoint returns 200 status code
5. Review Stripe Dashboard webhook delivery logs

### Duplicate Event Processing

**Solutions**:
1. Implement event ID deduplication
2. Use database transactions for idempotency
3. Check for race conditions in event processing
4. Add unique constraints on `webhook_events.stripe_event_id`

---

## Best Practices

1. **Always Verify Signatures**
   - Never skip signature verification
   - Use Stripe's built-in verification method
   - Validate webhook secret is configured

2. **Implement Idempotency**
   - Track processed event IDs
   - Use database transactions
   - Handle duplicate events gracefully

3. **Return Quickly**
   - Acknowledge webhook within 5 seconds
   - Process events asynchronously if needed
   - Use background jobs for long-running tasks

4. **Handle Errors Gracefully**
   - Return 5xx for transient errors (Stripe retries)
   - Return 200 for permanent errors (prevent retries)
   - Log all errors for monitoring

5. **Monitor and Alert**
   - Track webhook success rates
   - Alert on failures
   - Monitor processing times
   - Review Stripe Dashboard regularly

6. **Test Thoroughly**
   - Use Stripe CLI for local testing
   - Test all event types
   - Verify error handling
   - Implement integration tests

---

## Additional Resources

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Reference](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Event Types Reference](https://stripe.com/docs/api/events/types)

---

**Last Updated**: 2024-10-08
**Platform Version**: 1.0.0
**Stripe API Version**: 2024-10-28.acacia
