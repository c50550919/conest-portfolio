# Verification Feature

## Overview

The Verification feature handles multi-step user verification including phone, email, ID (via Veriff), background checks (via Certn), and income verification. It maintains a verification score that determines user trust level and access to platform features. The feature includes webhook handling for external verification providers.

## API Endpoints

### User-Facing Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/verification/status` | Get verification status | Yes |
| POST | `/api/verification/phone/send` | Send phone verification code | Yes |
| POST | `/api/verification/phone/verify` | Verify phone with code | Yes |
| POST | `/api/verification/email/send` | Send email verification | Yes |
| GET | `/api/verification/email/verify/:userId` | Verify email (link click) | No |
| POST | `/api/verification/id/initiate` | Start ID verification (Veriff) | Yes |
| POST | `/api/verification/id/complete` | Complete ID verification | Yes |
| POST | `/api/verification/background/initiate` | Start background check | Yes |
| POST | `/api/verification/income/initiate` | Start income verification | Yes |

### Webhook Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/webhooks/veriff` | Handle Veriff webhooks | No (Signature) |
| POST | `/api/webhooks/certn` | Handle Certn webhooks | No (Signature) |

## Services

### VerificationController
- `getStatus` - Gets current verification status
- `sendPhoneVerification` - Sends SMS verification code
- `verifyPhone` - Verifies phone with code
- `sendEmailVerification` - Sends email verification link
- `verifyEmail` - Processes email verification
- `initiateIDVerification` - Starts Veriff session
- `completeIDVerification` - Processes Veriff result
- `initiateBackgroundCheck` - Starts Certn check
- `initiateIncomeVerification` - Starts income verification

### VerificationService
- `sendPhoneVerification(userId)` - Sends code via Telnyx
- `verifyPhoneCode(userId, code, phone)` - Validates phone code
- `sendEmailVerification(userId)` - Sends verification email
- `verifyEmail(userId)` - Marks email as verified
- `initiateIDVerification(userId)` - Creates Veriff session
- `completeIDVerification(userId, sessionId)` - Processes Veriff decision
- `initiateBackgroundCheck(userId)` - Creates Certn application
- `processBackgroundCheckResult(userId, applicationId)` - Processes result
- `initiateIncomeVerification(userId, documents)` - Starts income verification
- `getVerificationStatus(userId)` - Gets status summary

### WebhookController
- `handleVeriffWebhook` - Processes Veriff status updates
- `handleCertnWebhook` - Processes Certn results

## Models/Types

### VerificationStatus
```typescript
interface VerificationStatus {
  email_verified: boolean;
  phone_verified: boolean;
  id_verification_status: VerificationState;
  background_check_status: VerificationState;
  income_verification_status: VerificationState;
  verification_score: number;      // 0-100
  fully_verified: boolean;
}

type VerificationState = 'pending' | 'approved' | 'rejected' | 'consider';
```

### Verification Record
```typescript
interface Verification {
  id: string;
  user_id: string;
  email_verified: boolean;
  email_verification_date?: Date;
  phone_verified: boolean;
  phone_verification_date?: Date;
  id_verification_status: VerificationState;
  id_verification_date?: Date;
  id_verification_data?: string;
  background_check_status: VerificationState;
  background_check_date?: Date;
  background_check_report_id?: string;
  certn_applicant_id?: string;
  income_verification_status: VerificationState;
  income_verification_date?: Date;
  income_range?: string;
  verification_score: number;
  fully_verified: boolean;
  requires_admin_review: boolean;
  flagged_records?: object;
  created_at: Date;
  updated_at: Date;
}
```

### SendPhoneResponse
```typescript
interface SendPhoneResponse {
  verificationId?: string;   // Telnyx verification ID
  expiresIn?: number;        // Seconds until expiration
}
```

### VeriffSession
```typescript
interface VeriffSession {
  verificationUrl: string;   // URL to redirect user
  sessionId: string;         // Veriff session ID
}
```

## External Integrations

### Telnyx (Phone Verification)
- SMS code sending
- Code validation
- 40% cheaper than Twilio
- Mock mode available for development (code: 123456)

### Veriff (ID Verification)
- Document scanning
- Face matching
- Liveness detection
- Webhook for status updates

### Certn (Background Checks)
- Criminal record checks
- Identity verification
- Multiple package options
- Webhook for results

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Phone send | 10 req/IP/hour + 3 req/phone/hour |
| Phone verify | 5 attempts/phone/15 min |
| Email send | Standard verification limiter |
| ID/Background initiate | Standard verification limiter |

## Dependencies

- `../../middleware/auth.middleware` - authenticateToken
- `../../middleware/rateLimit` - Multiple rate limiters
- `../../models/Verification` - Data model
- `../../models/User` - User updates
- `../../models/VerificationPayment` - Refund processing
- `./veriff/VeriffClient` - Veriff API client
- `./certn/CertnClient` - Certn API client
- `./telnyx/TelnyxVerifyClient` - Telnyx API client

## Data Flow

### Phone Verification Flow
1. User requests phone verification
2. Rate limiting applied (IP + phone number)
3. Telnyx sends SMS with 6-digit code
4. User submits code
5. Telnyx validates code
6. Verification record updated
7. Verification score recalculated

### ID Verification Flow
1. User initiates ID verification
2. Veriff session created
3. User redirected to Veriff
4. User completes ID scan
5. Webhook received with decision
6. Status updated (approved/rejected/pending)
7. Verification score recalculated

### Background Check Flow
1. User initiates background check
2. Certn applicant created
3. Certn application submitted
4. Webhook received with results
5. If 'consider': flagged for admin review
6. If 'approved': status updated, score recalculated
7. If 'rejected': automatic refund processed

## Verification Score Calculation

Score based on completed verifications:
- Email verified: +10
- Phone verified: +15
- ID verified: +25
- Background check passed: +35
- Income verified: +15

Total: 100 (fully verified)

## Security Notes

- Webhooks validated by signature
- Raw body parsing for signature verification
- Rate limiting prevents SMS bombing
- OTP brute force protection
- Admin review for borderline background checks
- Automatic refunds for rejected background checks
