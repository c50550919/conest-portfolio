# Stripe Payment Integration - Setup Guide

Complete setup guide for Stripe payment processing and Stripe Connect integration in the CoNest platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Stripe Dashboard Configuration](#stripe-dashboard-configuration)
- [Webhook Configuration](#webhook-configuration)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

The CoNest platform uses Stripe for:
- **Payment Processing**: Rent payments, utilities, deposits
- **Stripe Connect**: Household-level payment collection accounts
- **Webhooks**: Real-time payment status updates
- **Refunds**: Full and partial refund support

**Architecture**:
- Backend: Node.js + Express + TypeScript
- Stripe SDK: `stripe@14.5.0`
- API Version: `2024-10-28.acacia`
- Authentication: JWT tokens
- Rate Limiting: 10 requests/hour for payment operations

---

## Prerequisites

1. **Stripe Account**
   - Sign up at [https://stripe.com](https://stripe.com)
   - Complete identity verification
   - Enable Stripe Connect

2. **Development Tools**
   - Node.js 18+ installed
   - npm or yarn package manager
   - Stripe CLI (for webhook testing)

3. **Required Knowledge**
   - Basic understanding of REST APIs
   - Familiarity with payment processing concepts
   - Understanding of webhook architecture

---

## Environment Setup

### 1. Install Stripe CLI (for local testing)

**macOS**:
```bash
brew install stripe/stripe-cli/stripe
```

**Linux/WSL**:
```bash
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

**Windows**:
```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

### 2. Authenticate Stripe CLI

```bash
stripe login
```

This opens your browser to authorize the CLI with your Stripe account.

### 3. Configure Environment Variables

Create or update `.env` file in `backend/` directory:

```bash
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# API Configuration
API_URL=http://localhost:3000
```

**Where to find these values**:

1. **STRIPE_SECRET_KEY** & **STRIPE_PUBLISHABLE_KEY**:
   - Go to [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
   - Copy "Secret key" (starts with `sk_test_`)
   - Copy "Publishable key" (starts with `pk_test_`)

2. **STRIPE_WEBHOOK_SECRET**:
   - See [Webhook Configuration](#webhook-configuration) section below

---

## Stripe Dashboard Configuration

### 1. Enable Stripe Connect

1. Go to [https://dashboard.stripe.com/test/connect/accounts/overview](https://dashboard.stripe.com/test/connect/accounts/overview)
2. Click **Get started with Connect**
3. Select **Express** as the account type
4. Complete the onboarding form

### 2. Configure Connect Settings

1. Go to **Settings** → **Connect**
2. Set **Account name**: `CoNest Housing Platform`
3. Set **Support email**: Your support email
4. Configure branding:
   - Upload your logo
   - Set brand colors
   - Add terms of service URL

### 3. Platform Profile Settings

1. Go to **Settings** → **Connect** → **Platform Settings**
2. Set **Business website**: Your platform URL
3. Set **Support phone**: Your support phone number
4. Enable **Platform payout schedule**: Daily

---

## Webhook Configuration

Webhooks enable real-time payment status updates. You need to configure webhooks for both **development** and **production**.

### Development (Local Testing)

**Option 1: Stripe CLI Forwarding (Recommended)**

```bash
# Start the webhook forwarding
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

This command will output a webhook signing secret:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

Copy this secret to your `.env` file as `STRIPE_WEBHOOK_SECRET`.

**Option 2: ngrok Tunnel**

If you need a public URL for testing:

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Use the HTTPS URL for webhook endpoint
# Example: https://abc123.ngrok.io/api/stripe/webhook
```

Then configure the webhook in Stripe Dashboard (see Production setup below).

### Production (Stripe Dashboard)

1. Go to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set **Endpoint URL**: `https://your-api-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`
   - ✅ `charge.refunded`
   - ✅ `account.updated`
   - ✅ `account.application.deauthorized`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to your production `.env` as `STRIPE_WEBHOOK_SECRET`

### Webhook Event Handling

The platform automatically handles these events:

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Mark payment as completed, update database |
| `payment_intent.payment_failed` | Mark payment as failed, notify user |
| `payment_intent.canceled` | Mark payment as canceled |
| `charge.refunded` | Log refund, update payment status |
| `account.updated` | Update Connect account details |
| `account.application.deauthorized` | Log deauthorization, disable account |

---

## Testing

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

Server runs on `http://localhost:3000`

### 2. Start Webhook Forwarding (if using Stripe CLI)

In a separate terminal:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

### 3. Test API Endpoints

**Test Create Stripe Connect Account**:

```bash
curl -X POST http://localhost:3000/api/payments/stripe/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Test Create Payment Intent**:

```bash
curl -X POST http://localhost:3000/api/payments/intents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150000,
    "householdId": "household-uuid-here",
    "description": "Monthly rent payment"
  }'
```

**Test Split Rent**:

```bash
curl -X POST http://localhost:3000/api/payments/split-rent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "householdId": "household-uuid-here",
    "totalAmount": 200000
  }'
```

**Test Refund**:

```bash
curl -X POST http://localhost:3000/api/payments/refund \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_xxxxxxxxxxxxx",
    "amount": 50000
  }'
```

**Test Get Payment History**:

```bash
curl http://localhost:3000/api/payments/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Test Stripe Test Cards

Use these test card numbers in your frontend:

| Card | Number | CVC | Date | Result |
|------|--------|-----|------|--------|
| Success | `4242 4242 4242 4242` | Any 3 digits | Any future date | Payment succeeds |
| Decline | `4000 0000 0000 0002` | Any 3 digits | Any future date | Payment declined |
| Insufficient funds | `4000 0000 0000 9995` | Any 3 digits | Any future date | Insufficient funds |
| Requires authentication | `4000 0025 0000 3155` | Any 3 digits | Any future date | 3D Secure authentication |

Full list: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

### 5. Monitor Webhook Events

**Stripe Dashboard**:
- Go to [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
- Click on your webhook endpoint
- View recent deliveries and responses

**Stripe CLI**:
```bash
# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

---

## Production Deployment

### 1. Switch to Live Mode Keys

Update `.env` with live mode keys:

```bash
# Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key

# Get from webhook endpoint configuration
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret

# Production API URL
API_URL=https://api.yourplatform.com
```

**⚠️ SECURITY WARNING**:
- Never commit live API keys to version control
- Use environment variable management (e.g., AWS Secrets Manager, Heroku Config Vars)
- Rotate keys regularly
- Monitor API key usage in Stripe Dashboard

### 2. Configure Production Webhooks

Follow the [Webhook Configuration → Production](#production-stripe-dashboard) steps above.

### 3. Enable PCI Compliance

1. Complete Stripe's PCI compliance questionnaire
2. Ensure HTTPS is enabled for all API endpoints
3. Never log or store card numbers, CVV, or full card data
4. Use Stripe Elements for card input on frontend

### 4. Production Checklist

- [ ] Live mode API keys configured
- [ ] Production webhook endpoint configured and tested
- [ ] HTTPS enabled for all endpoints
- [ ] Error monitoring configured (e.g., Sentry)
- [ ] Payment logging and audit trail enabled
- [ ] Rate limiting configured and tested
- [ ] Stripe Connect reviewed and approved
- [ ] PCI compliance questionnaire completed
- [ ] Refund policy documented and implemented
- [ ] Customer support email configured in Stripe Dashboard

---

## API Reference

### Endpoints

#### POST `/api/payments/stripe/connect`
Create Stripe Connect account for authenticated user.

**Authentication**: Required (JWT)
**Rate Limit**: 10 req/hour

**Request**:
```json
{}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "accountId": "acct_xxxxxxxxxxxxx",
    "onboardingUrl": "https://connect.stripe.com/setup/..."
  }
}
```

---

#### POST `/api/payments/intents`
Create payment intent with idempotency support.

**Authentication**: Required (JWT)
**Rate Limit**: 10 req/hour

**Request**:
```json
{
  "amount": 150000,
  "householdId": "uuid-here",
  "description": "Monthly rent payment",
  "idempotencyKey": "unique-key-123" // Optional
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_xxxxxxxxxxxxx",
    "clientSecret": "pi_xxxxxxxxxxxxx_secret_xxxxxxxxxxxxx",
    "amount": 150000
  }
}
```

---

#### POST `/api/payments/split-rent`
Split rent among household members.

**Authentication**: Required (JWT)
**Rate Limit**: 10 req/hour

**Request**:
```json
{
  "householdId": "uuid-here",
  "totalAmount": 200000
}
```

**Response** (200):
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "userId": "user-1-uuid",
      "amount": 100000,
      "percentage": 50
    },
    {
      "userId": "user-2-uuid",
      "amount": 100000,
      "percentage": 50
    }
  ]
}
```

---

#### POST `/api/payments/refund`
Process full or partial refund.

**Authentication**: Required (JWT)
**Rate Limit**: 10 req/hour

**Request**:
```json
{
  "paymentIntentId": "pi_xxxxxxxxxxxxx",
  "amount": 50000 // Optional, defaults to full refund
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refundId": "re_xxxxxxxxxxxxx",
    "amount": 50000,
    "status": "succeeded"
  }
}
```

---

#### GET `/api/payments/history`
Get payment history for authenticated user.

**Authentication**: Required (JWT)

**Query Params**:
- `limit` (optional): 1-100, default 50
- `offset` (optional): 0+, default 0

**Response** (200):
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "payment-uuid",
      "amount": 150000,
      "status": "completed",
      "type": "rent",
      "description": "Monthly rent payment",
      "createdAt": "2024-10-01T00:00:00.000Z",
      "paidAt": "2024-10-01T00:05:00.000Z"
    }
  ]
}
```

---

#### POST `/api/stripe/webhook`
Stripe webhook endpoint (signature validation).

**Authentication**: None (signature validation instead)
**Rate Limit**: None

**Request**:
Raw Stripe webhook payload with `Stripe-Signature` header.

**Response** (200):
```json
{
  "received": true
}
```

---

## Troubleshooting

### Common Issues

#### 1. Webhook signature verification fails

**Error**: `Webhook signature verification failed`

**Solutions**:
- Verify `STRIPE_WEBHOOK_SECRET` is correctly set in `.env`
- Ensure webhook endpoint uses raw body (not JSON parsed)
- Check that Stripe CLI is forwarding to correct port
- Restart the server after updating webhook secret

#### 2. Payment intent creation fails

**Error**: `Payment intent creation failed`

**Solutions**:
- Verify `STRIPE_SECRET_KEY` is correct and starts with `sk_test_` or `sk_live_`
- Check that amount is positive and in cents
- Verify household exists in database
- Check user is a member of the household

#### 3. Stripe Connect account creation fails

**Error**: `Stripe Connect account creation failed`

**Solutions**:
- Verify Stripe Connect is enabled in Dashboard
- Check that email is valid and not already used
- Ensure platform is approved for Connect (may require verification)
- Check Stripe Dashboard for account creation errors

#### 4. Rate limit exceeded

**Error**: `Too many payment requests`

**Solutions**:
- Wait 1 hour before retrying
- Implement exponential backoff in client
- Consider requesting rate limit increase from Stripe
- Check for duplicate/unnecessary requests

### Debug Logging

Enable debug logging for Stripe:

```bash
# Add to .env
DEBUG=stripe:*
```

View logs:
```bash
npm run dev
```

### Support Resources

- **Stripe Documentation**: [https://stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: [https://support.stripe.com](https://support.stripe.com)
- **Stripe API Status**: [https://status.stripe.com](https://status.stripe.com)
- **Community Forum**: [https://stackoverflow.com/questions/tagged/stripe-payments](https://stackoverflow.com/questions/tagged/stripe-payments)

---

## Security Best Practices

1. **API Key Management**
   - Never commit API keys to version control
   - Use environment variables for all keys
   - Rotate keys regularly (every 90 days)
   - Monitor API key usage in Stripe Dashboard

2. **Webhook Security**
   - Always validate webhook signatures
   - Use HTTPS for production webhook endpoints
   - Implement idempotency for webhook handlers
   - Log all webhook events for audit trail

3. **Payment Data**
   - Never log or store card numbers
   - Never log CVV codes
   - Use Stripe Elements for card input
   - Implement PCI DSS compliance

4. **Error Handling**
   - Never expose Stripe API keys in error messages
   - Log errors securely (without sensitive data)
   - Implement rate limiting for fraud prevention
   - Monitor for suspicious payment patterns

5. **Testing**
   - Always use test mode for development
   - Never use live cards in test mode
   - Test all webhook events before production
   - Implement comprehensive integration tests

---

## Additional Resources

- [Stripe Payment Intents Guide](https://stripe.com/docs/payments/payment-intents)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [PCI Compliance Guide](https://stripe.com/docs/security/guide)

---

**Last Updated**: 2024-10-08
**Platform Version**: 1.0.0
**Stripe API Version**: 2024-10-28.acacia
