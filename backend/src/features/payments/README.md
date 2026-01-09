# Payments Feature

## Overview

The Payments feature provides Stripe integration for handling household payments including rent splitting, payment processing, and refunds. It supports Stripe Connect for household payment collection and includes webhook handling for payment status updates. All payment operations are secured with JWT authentication and rate limiting.

## API Endpoints

### New Endpoints (with Zod Validation)

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/payments/stripe/connect` | Create Stripe Connect account | Yes |
| POST | `/api/payments/intents` | Create payment intent | Yes |
| POST | `/api/payments/split-rent` | Split rent among members | Yes |
| POST | `/api/payments/refund` | Process refund | Yes |
| GET | `/api/payments/history` | Get payment history | Yes |

### Webhook Endpoint

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/stripe/webhook` | Handle Stripe webhooks | No (Signature) |

### Legacy Endpoints (Backward Compatibility)

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/payments/create` | Create payment (legacy) | Yes |
| GET | `/api/payments/my-payments` | Get user payments | Yes |
| GET | `/api/payments/household/:householdId` | Get household payments | Yes |
| GET | `/api/payments/overdue` | Get overdue payments | Yes |
| POST | `/api/payments/:paymentId/refund` | Refund payment (legacy) | Yes |
| POST | `/api/payments/household/:householdId/split-rent` | Split rent (legacy) | Yes |
| POST | `/api/payments/stripe/create-account` | Create Stripe account (legacy) | Yes |
| GET | `/api/payments/stripe/onboarding/:householdId` | Get onboarding link | Yes |

## Services

### PaymentController
- `createStripeAccount` - Creates Stripe Connect account for user
- `createPaymentIntent` - Creates payment intent with idempotency
- `splitRent` - Calculates rent split for household members
- `processRefund` - Processes refund for payment
- `getPaymentHistory` - Gets user's payment history
- `handleWebhook` - Handles Stripe webhook events

### PaymentService
- `createStripeAccount(userId)` - Creates Connect account
- `createHouseholdStripeAccount(userId, householdId)` - Legacy account creation
- `getOnboardingLink(householdId)` - Gets Stripe onboarding URL
- `createPaymentIntent(params)` - Creates payment intent
- `createPayment(householdId, payerId, amount, type, description)` - Legacy creation
- `processPayment(paymentIntentId)` - Processes completed payment
- `splitRent(params)` - Calculates rent splits
- `splitRentPayment(householdId)` - Legacy rent splitting
- `processRefund(params)` - Processes refund
- `refundPayment(paymentId, amount)` - Legacy refund
- `getPaymentHistory(userId)` - Gets payment history
- `getUserPayments(userId)` - Legacy user payments
- `getHouseholdPayments(householdId)` - Gets household payments
- `getOverduePayments(householdId)` - Gets overdue payments
- `handleStripeWebhook(event)` - Processes webhook events

## Models/Types

### CreatePaymentIntentParams
```typescript
interface CreatePaymentIntentParams {
  amount: number;           // In cents
  householdId: string;
  description: string;
  payerId?: string;
  idempotencyKey?: string;
}
```

### SplitRentParams
```typescript
interface SplitRentParams {
  householdId: string;
  totalAmount: number;      // In cents
}
```

### SplitResult
```typescript
interface SplitResult {
  userId: string;
  amount: number;           // In cents
  percentage: number;
}
```

### RefundParams
```typescript
interface RefundParams {
  paymentIntentId: string;
  amount?: number;          // Partial refund, or full if omitted
}
```

### PaymentHistory
```typescript
interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  type: string;
  description?: string;
  createdAt: Date;
  paidAt?: Date;
}
```

### Payment Types
```typescript
type PaymentType = 'rent' | 'utilities' | 'deposit' | 'other';

type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded';
```

## Webhook Events

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Mark payment completed |
| `payment_intent.payment_failed` | Mark payment failed |
| `payment_intent.canceled` | Mark payment failed |
| `charge.refunded` | Log refund |
| `account.updated` | Log Connect account status |
| `account.application.deauthorized` | Log deauthorization |

## Dependencies

- `../../config/stripe` - Stripe client and helpers
- `../../middleware/auth.middleware` - authenticateToken
- `../../middleware/rateLimit` - paymentLimiter (10 req/hour)
- `../../models/Payment` - Payment data model
- `../../models/Household` - Household data model
- `../../models/User` - User data model

## Data Flow

### Create Payment Intent Flow
1. Authenticate user via JWT
2. Apply rate limiting (10 requests/hour)
3. Validate request with Zod schema
4. Verify household exists
5. Verify user is household member (if payerId provided)
6. Create Stripe PaymentIntent with idempotency key
7. If household has Connect account, set as transfer destination
8. Return client secret for frontend

### Split Rent Flow
1. Authenticate user via JWT
2. Verify household exists
3. Get household members
4. Calculate total rent shares
5. Calculate each member's amount based on their share percentage
6. Return split amounts

### Webhook Flow
1. Receive webhook from Stripe (raw body)
2. Validate webhook signature
3. Parse event type
4. Process event:
   - Update payment status
   - Log account updates
5. Return 200 OK

## Security Notes

- PCI DSS compliant - no card data stored
- Webhook signature validation (no authentication needed)
- Idempotency keys prevent duplicate payments
- Rate limiting prevents abuse (10 requests/hour)
- All amounts in cents to prevent floating point issues
- JWT required for all endpoints except webhook
