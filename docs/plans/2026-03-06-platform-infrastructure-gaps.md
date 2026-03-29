# Platform Infrastructure Gaps (GAP-01 through GAP-05) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add transactional email, push notifications, universal links, analytics, and mobile photo upload — the 5 infrastructure gaps blocking launch readiness.

**Architecture:** Each gap is a vertical slice (backend service + mobile integration) following CoNest's existing singleton service pattern. Email and deep linking ship first because push notifications depend on both. Analytics is independent. Photo upload leverages the existing backend endpoint (POST /profiles/photo) — only mobile flow is needed.

**Tech Stack:** @sendgrid/mail (email), firebase-admin + @react-native-firebase/messaging (push), posthog-react-native (analytics), react-native-image-picker (already installed), Express static routes (AASA/assetlinks)

---

## Dependency Order

```
GAP-02 (Email) ──┐
                  ├──→ GAP-01 (Push Notifications)
GAP-03 (Links) ──┘
                     GAP-05 (Analytics) — independent
                     GAP-04 (Photo Upload) — independent, backend exists
```

## Prerequisites (Ops — Do Before Code)

These require account creation and cannot be automated:

1. **SendGrid**: Create account at sendgrid.com → Settings → API Keys → Create with "Mail Send" permission → copy key
2. **Firebase**: Create project at console.firebase.google.com → Add iOS app (bundle: `com.conest.app`) → Add Android app (package: `com.conest.app`) → Download `google-services.json` and `GoogleService-Info.plist` → Project Settings → Cloud Messaging → Get Server Key
3. **Firebase APNs**: Apple Developer → Keys → Create APNs Auth Key (.p8) → Upload to Firebase Console → Cloud Messaging → Apple app configuration
4. **PostHog**: Create account at posthog.com → copy Project API Key + Host URL

---

## Phase 1: Transactional Email Service (GAP-02)

> No dependencies. Blocks TASK-CMP-04 (FCRA adverse action needs email delivery). ~2 days.

### Task 1: Install SendGrid and add env configuration

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/config/env.ts`

**Step 1: Install SendGrid**

Run: `cd backend && npm install @sendgrid/mail@^8.1.0`

**Step 2: Add env vars to Zod schema**

In `backend/src/config/env.ts`, add to the `envSchema` object:

```typescript
// Email (SendGrid)
SENDGRID_API_KEY: z.string().default('SG.not_configured'),
SENDGRID_FROM_EMAIL: z.string().email().default('noreply@conest.app'),
SENDGRID_FROM_NAME: z.string().default('CoNest'),
```

**Step 3: Add to .env.production.template**

Add to `backend/.env.production.template`:

```bash
# Email Service (SendGrid)
SENDGRID_API_KEY=SG.your_live_api_key_here
SENDGRID_FROM_EMAIL=noreply@conest.app
SENDGRID_FROM_NAME=CoNest
```

**Step 4: Verify env loads**

Run: `cd backend && npx ts-node -e "require('./src/config/env').validateEnv(); console.log('OK')"`
Expected: `OK` (defaults used in dev)

**Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/config/env.ts backend/.env.production.template
git commit -m "chore(email): install SendGrid and add env configuration"
```

---

### Task 2: Create email service with tests

**Files:**
- Create: `backend/src/services/emailService.ts`
- Create: `backend/tests/unit/email-service.test.ts`

**Step 1: Write the failing test**

Create `backend/tests/unit/email-service.test.ts`:

```typescript
import { EmailService } from '../../src/services/emailService';

// Mock SendGrid before importing
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

const sgMail = require('@sendgrid/mail');

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    emailService = new EmailService({
      apiKey: 'SG.test_key',
      fromEmail: 'test@conest.app',
      fromName: 'CoNest Test',
    });
  });

  describe('sendWelcomeEmail', () => {
    it('sends welcome email with correct params', async () => {
      await emailService.sendWelcomeEmail('user@example.com', 'Jane');

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const call = sgMail.send.mock.calls[0][0];
      expect(call.to).toBe('user@example.com');
      expect(call.from.email).toBe('test@conest.app');
      expect(call.subject).toContain('Welcome');
      expect(call.html).toContain('Jane');
    });
  });

  describe('sendEmailVerification', () => {
    it('sends verification email with token link', async () => {
      await emailService.sendEmailVerification('user@example.com', 'abc123');

      const call = sgMail.send.mock.calls[0][0];
      expect(call.to).toBe('user@example.com');
      expect(call.html).toContain('abc123');
      expect(call.html).toContain('verify-email');
    });
  });

  describe('sendAccountDeletionConfirmation', () => {
    it('sends deletion confirmation', async () => {
      await emailService.sendAccountDeletionConfirmation('user@example.com');

      const call = sgMail.send.mock.calls[0][0];
      expect(call.to).toBe('user@example.com');
      expect(call.subject).toContain('deleted');
    });
  });

  describe('sendFCRAPreAdverseNotice', () => {
    it('sends pre-adverse notice with required FCRA content', async () => {
      await emailService.sendFCRAPreAdverseNotice('user@example.com', {
        firstName: 'Jane',
        reportAgency: 'Certn',
        reportAgencyPhone: '1-888-123-4567',
        reportAgencyAddress: '123 Main St, Suite 100',
      });

      const call = sgMail.send.mock.calls[0][0];
      expect(call.html).toContain('pre-adverse');
      expect(call.html).toContain('Certn');
      expect(call.html).toContain('dispute');
      expect(call.html).toContain('rights');
    });
  });

  describe('sendFCRAFinalAdverseNotice', () => {
    it('sends final adverse notice with required FCRA content', async () => {
      await emailService.sendFCRAFinalAdverseNotice('user@example.com', {
        firstName: 'Jane',
        reportAgency: 'Certn',
        reportAgencyPhone: '1-888-123-4567',
        reportAgencyAddress: '123 Main St, Suite 100',
        adverseReason: 'Background check did not meet platform safety requirements.',
      });

      const call = sgMail.send.mock.calls[0][0];
      expect(call.html).toContain('adverse action');
      expect(call.html).toContain('reinvestigation');
      expect(call.html).toContain('free copy');
    });
  });

  describe('error handling', () => {
    it('logs error but does not throw on send failure', async () => {
      sgMail.send.mockRejectedValueOnce(new Error('API down'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await emailService.sendWelcomeEmail('user@example.com', 'Jane');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/unit/email-service.test.ts --no-cache`
Expected: FAIL — `Cannot find module '../../src/services/emailService'`

**Step 3: Implement the email service**

Create `backend/src/services/emailService.ts`:

```typescript
import sgMail from '@sendgrid/mail';
import { logger } from '../config/logger';

interface EmailServiceConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

interface FCRAAdverseActionData {
  firstName: string;
  reportAgency: string;
  reportAgencyPhone: string;
  reportAgencyAddress: string;
  adverseReason?: string;
}

export class EmailService {
  private from: { email: string; name: string };

  constructor(config: EmailServiceConfig) {
    sgMail.setApiKey(config.apiKey);
    this.from = { email: config.fromEmail, name: config.fromName };
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    await this.send({
      to,
      subject: 'Welcome to CoNest — Safe Housing for Single Parents',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2D6A4F;">Welcome to CoNest, ${this.esc(firstName)}!</h1>
          <p>You've taken the first step toward finding safe, affordable shared housing.</p>
          <h3>What's next:</h3>
          <ol>
            <li>Set your location and budget to see matches</li>
            <li>Browse compatible parents in your area</li>
            <li>Complete verification to start messaging</li>
          </ol>
          <p>Every parent on CoNest goes through identity and background verification — your family's safety is our priority.</p>
          <p style="color: #666; font-size: 12px;">You're receiving this because you created a CoNest account. If this wasn't you, please contact support@conest.app.</p>
        </div>
      `,
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const verifyUrl = `https://conest.app/verify-email/${token}`;
    await this.send({
      to,
      subject: 'Verify your email — CoNest',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2D6A4F;">Verify your email address</h2>
          <p>Tap the button below to verify your email:</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #2D6A4F; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Verify Email</a>
          <p style="margin-top: 16px; color: #666; font-size: 13px;">Or copy this link: ${verifyUrl}</p>
          <p style="color: #666; font-size: 12px;">This link expires in 24 hours. If you didn't create a CoNest account, ignore this email.</p>
        </div>
      `,
    });
  }

  async sendAccountDeletionConfirmation(to: string): Promise<void> {
    await this.send({
      to,
      subject: 'Your CoNest account has been deleted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2D6A4F;">Account deleted</h2>
          <p>Your CoNest account and all associated data have been permanently deleted.</p>
          <p>This includes your profile, messages, matches, verification records, and payment history.</p>
          <p>If you didn't request this or believe this was done in error, contact us immediately at <a href="mailto:support@conest.app">support@conest.app</a>.</p>
        </div>
      `,
    });
  }

  async sendFCRAPreAdverseNotice(to: string, data: FCRAAdverseActionData): Promise<void> {
    await this.send({
      to,
      subject: 'Important: Information about your CoNest background check — pre-adverse action notice',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Pre-Adverse Action Notice</h2>
          <p>Dear ${this.esc(data.firstName)},</p>
          <p>CoNest is considering taking adverse action based, in whole or in part, on information contained in a consumer report obtained from:</p>
          <p><strong>${this.esc(data.reportAgency)}</strong><br/>
          ${this.esc(data.reportAgencyAddress)}<br/>
          Phone: ${this.esc(data.reportAgencyPhone)}</p>
          <p>${this.esc(data.reportAgency)} did not make the decision to take adverse action and cannot explain why it was made.</p>
          <h3>Your rights under the Fair Credit Reporting Act (FCRA):</h3>
          <ul>
            <li>You have the right to dispute the accuracy or completeness of any information in your consumer report.</li>
            <li>You may contact ${this.esc(data.reportAgency)} directly to dispute any information.</li>
            <li>You are entitled to a free copy of your consumer report from ${this.esc(data.reportAgency)} if you request it within 60 days.</li>
            <li>You have 5 business days from the date of this notice to dispute the information before a final decision is made.</li>
          </ul>
          <p>A copy of your consumer report and a summary of your rights under the FCRA are available upon request.</p>
          <p>To dispute, contact: <a href="mailto:support@conest.app">support@conest.app</a></p>
          <p style="color: #666; font-size: 12px;">This is a required legal notice under 15 U.S.C. &sect; 1681b(b)(3). CoNest, LLC.</p>
        </div>
      `,
    });
  }

  async sendFCRAFinalAdverseNotice(to: string, data: FCRAAdverseActionData): Promise<void> {
    await this.send({
      to,
      subject: 'Notice of adverse action — CoNest background check',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Notice of Adverse Action</h2>
          <p>Dear ${this.esc(data.firstName)},</p>
          <p>CoNest has taken adverse action based, in whole or in part, on information contained in a consumer report from:</p>
          <p><strong>${this.esc(data.reportAgency)}</strong><br/>
          ${this.esc(data.reportAgencyAddress)}<br/>
          Phone: ${this.esc(data.reportAgencyPhone)}</p>
          ${data.adverseReason ? `<p><strong>Reason:</strong> ${this.esc(data.adverseReason)}</p>` : ''}
          <h3>Your rights:</h3>
          <ul>
            <li>You have the right to obtain a free copy of your consumer report from ${this.esc(data.reportAgency)} within 60 days of this notice.</li>
            <li>You have the right to dispute the accuracy or completeness of any information with ${this.esc(data.reportAgency)}.</li>
            <li>${this.esc(data.reportAgency)} must complete its reinvestigation within 30 days of receiving your dispute.</li>
            <li>You may include a brief statement in your file if the reinvestigation does not resolve the dispute.</li>
          </ul>
          <p>To request your report or file a dispute, contact ${this.esc(data.reportAgency)} at ${this.esc(data.reportAgencyPhone)}.</p>
          <p>For questions about this decision, contact: <a href="mailto:support@conest.app">support@conest.app</a></p>
          <p style="color: #666; font-size: 12px;">This notice is provided pursuant to 15 U.S.C. &sect; 1681m(a). CoNest, LLC.</p>
        </div>
      `,
    });
  }

  private async send(msg: { to: string; subject: string; html: string }): Promise<void> {
    try {
      await sgMail.send({ ...msg, from: this.from });
    } catch (error: any) {
      const log = logger || console;
      log.error('[EmailService] Failed to send email', {
        to: msg.to,
        subject: msg.subject,
        error: error.message,
        statusCode: error.code,
      });
    }
  }

  private esc(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Singleton
let instance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!instance) {
    const { getEnv } = require('../config/env');
    const env = getEnv();
    instance = new EmailService({
      apiKey: env.SENDGRID_API_KEY,
      fromEmail: env.SENDGRID_FROM_EMAIL,
      fromName: env.SENDGRID_FROM_NAME,
    });
  }
  return instance;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest tests/unit/email-service.test.ts --no-cache`
Expected: 6 tests PASS

**Step 5: Commit**

```bash
git add backend/src/services/emailService.ts backend/tests/unit/email-service.test.ts
git commit -m "feat(email): add EmailService with SendGrid — welcome, verification, FCRA notices"
```

---

### Task 3: Wire welcome email to auth signup

**Files:**
- Modify: `backend/src/features/auth/auth.routes.ts` (or wherever signup completes)
- Modify: `backend/src/features/auth/oauth.service.ts`

**Step 1: Add welcome email after successful registration**

In the auth service or controller where a new user is created (after `UserModel.create()` succeeds), add:

```typescript
import { getEmailService } from '../../services/emailService';

// After successful user creation:
getEmailService().sendWelcomeEmail(user.email, user.first_name || 'there');
// Fire-and-forget — don't await, don't block registration
```

Do the same in the OAuth service for new OAuth users (after `UserModel.create()` in the Google/Apple OAuth flow).

**Step 2: Add welcome email after OAuth registration**

In `backend/src/features/auth/oauth.service.ts`, find where new users are created and add the same fire-and-forget call.

**Step 3: Verify manually**

Run: `cd backend && npm run dev`
Create a test account via signup or OAuth. Check SendGrid Activity Feed (or dev logs) for the email.
Expected: Welcome email sent (in dev mode, will log error since `SG.not_configured` — that's correct behavior).

**Step 4: Commit**

```bash
git add backend/src/features/auth/
git commit -m "feat(email): send welcome email on signup and OAuth registration"
```

---

### Task 4: Wire email to account deletion

**Files:**
- Modify: `backend/src/features/profile/profile.controller.ts` (deleteProfile method)

**Step 1: Send deletion confirmation email**

In the `deleteProfile` controller method, before or after the cascade delete transaction, capture the user's email, then fire:

```typescript
import { getEmailService } from '../../services/emailService';

// After successful deletion (capture email BEFORE deleting user row):
const userEmail = user.email;
// ... perform deletion ...
getEmailService().sendAccountDeletionConfirmation(userEmail);
```

**Step 2: Verify the existing delete test still passes**

Run: `cd backend && npx jest tests/ --testPathPattern="delete" --no-cache`
Expected: All existing deletion tests pass (email is fire-and-forget, won't break tests).

**Step 3: Commit**

```bash
git add backend/src/features/profile/profile.controller.ts
git commit -m "feat(email): send account deletion confirmation email"
```

---

### Task 5: Wire email verification delivery

**Files:**
- Modify: `backend/src/features/verification/verification.service.ts` (where email verification token is generated)

**Step 1: Find where email verification tokens are created**

Search for the email verification flow — look for where a verification token/link is generated and the current delivery mechanism.

**Step 2: Add email delivery**

Replace or supplement the current verification delivery with:

```typescript
import { getEmailService } from '../../services/emailService';

// After generating the email verification token:
await getEmailService().sendEmailVerification(user.email, verificationToken);
```

**Step 3: Verify**

Run: `cd backend && npx jest tests/ --testPathPattern="verification" --no-cache`
Expected: Existing tests pass.

**Step 4: Commit**

```bash
git add backend/src/features/verification/
git commit -m "feat(email): deliver email verification via SendGrid"
```

---

## Phase 2: Deep Linking Completion (GAP-03)

> Partial implementation exists. URL schemes (conest://, safenest://) work. Missing: HTTPS Universal Links (iOS) and App Links (Android) for `conest.app` domain. Missing: expanded route config for messages, connections, household. ~1 day.

### Task 6: Add AASA and assetlinks.json backend endpoints

**Files:**
- Create: `backend/src/features/well-known/well-known.routes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/tests/integration/well-known.test.ts`

**Step 1: Write the failing test**

Create `backend/tests/integration/well-known.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/app';

describe('Well-Known Endpoints', () => {
  describe('GET /.well-known/apple-app-site-association', () => {
    it('returns valid AASA JSON with correct content type', async () => {
      const res = await request(app)
        .get('/.well-known/apple-app-site-association')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(res.body.applinks).toBeDefined();
      expect(res.body.applinks.apps).toEqual([]);
      expect(res.body.applinks.details).toBeInstanceOf(Array);
      expect(res.body.applinks.details[0].appID).toContain('com.conest.app');
      expect(res.body.applinks.details[0].paths).toContain('/verify-email/*');
      expect(res.body.applinks.details[0].paths).toContain('/messages/*');
    });
  });

  describe('GET /.well-known/assetlinks.json', () => {
    it('returns valid Android assetlinks JSON', async () => {
      const res = await request(app)
        .get('/.well-known/assetlinks.json')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0].relation).toContain('delegate_permission/common.handle_all_urls');
      expect(res.body[0].target.package_name).toBe('com.conest.app');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/integration/well-known.test.ts --no-cache`
Expected: FAIL — 404 Not Found

**Step 3: Implement the well-known routes**

Create `backend/src/features/well-known/well-known.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';

const router = Router();

// iOS Universal Links — Apple App Site Association
router.get('/apple-app-site-association', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: 'TEAM_ID.com.conest.app', // Replace TEAM_ID with Apple Team ID
          paths: [
            '/verify-email/*',
            '/verification',
            '/verify-phone',
            '/verify-id',
            '/background-check',
            '/messages/*',
            '/connections',
            '/household/*',
            '/discover',
            '/profile/*',
          ],
        },
      ],
    },
  });
});

// Android App Links — Digital Asset Links
router.get('/assetlinks.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.conest.app',
        sha256_cert_fingerprints: [
          // Replace with actual signing certificate fingerprint
          'REPLACE_WITH_SHA256_FINGERPRINT',
        ],
      },
    },
  ]);
});

export default router;
```

**Step 4: Register in app.ts**

In `backend/src/app.ts`, add BEFORE the `/api/` routes (well-known routes are unauthenticated):

```typescript
import wellKnownRoutes from './features/well-known/well-known.routes';

// Well-known routes (no auth, no rate limiting)
app.use('/.well-known', wellKnownRoutes);
```

**Step 5: Run test to verify it passes**

Run: `cd backend && npx jest tests/integration/well-known.test.ts --no-cache`
Expected: 2 tests PASS

**Step 6: Commit**

```bash
git add backend/src/features/well-known/ backend/src/app.ts backend/tests/integration/well-known.test.ts
git commit -m "feat(links): add AASA and assetlinks.json for Universal/App Links"
```

---

### Task 7: Expand React Navigation deep link config

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx` (linking config object, ~lines 36-60)

**Step 1: Update the linking config**

Replace the existing `linking.config.screens` with expanded routes:

```typescript
const linking = {
  prefixes: ['conest://', 'safenest://', 'https://conest.app', 'https://safenest.app'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: {
            screens: {
              ConnectionRequests: 'connections',
            },
          },
          Discover: 'discover',
          Messages: {
            screens: {
              Chat: 'messages/:conversationId',
              ConversationsList: 'messages',
            },
          },
          Household: {
            screens: {
              HouseholdHome: 'household/:id',
              ViewInvitation: 'household/invite/:invitationId',
            },
          },
          Profile: {
            screens: {
              Verification: {
                screens: {
                  EmailVerification: 'verify-email/:token',
                  Dashboard: 'verification',
                  PhoneVerification: 'verify-phone',
                  IDVerification: 'verify-id',
                  BackgroundCheck: 'background-check',
                  IncomeVerification: 'income-verification',
                },
              },
            },
          },
        },
      },
    },
  },
};
```

**Step 2: Verify the app compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: No errors (or only pre-existing errors unrelated to linking)

**Step 3: Manual test**

Run: `npx uri-scheme open "conest://messages" --ios` (or Android equivalent)
Expected: App opens to Messages tab

**Step 4: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx
git commit -m "feat(links): expand deep link routes for messages, connections, household"
```

---

## Phase 3: Push Notifications (GAP-01)

> Depends on GAP-03 (deep linking for tap routing). Most complex gap — ~3-4 days.

### Task 8: Create device_tokens migration and model

**Files:**
- Create: `backend/src/migrations/20260306000001_create_device_tokens.ts`
- Create: `backend/src/models/DeviceToken.ts`
- Create: `backend/tests/unit/device-token-model.test.ts`

**Step 1: Write the failing test**

Create `backend/tests/unit/device-token-model.test.ts`:

```typescript
import { DeviceTokenModel } from '../../src/models/DeviceToken';

// This test requires the migration to have run
// In CI, use test database setup. Locally, run migration first.
describe('DeviceTokenModel', () => {
  const testUserId = 'test-user-id';
  const testToken = 'fcm-token-abc123';

  afterEach(async () => {
    await DeviceTokenModel.deleteByUserId(testUserId);
  });

  it('registers a new device token', async () => {
    const result = await DeviceTokenModel.register(testUserId, testToken, 'ios');
    expect(result.user_id).toBe(testUserId);
    expect(result.token).toBe(testToken);
    expect(result.platform).toBe('ios');
  });

  it('upserts on duplicate token', async () => {
    await DeviceTokenModel.register(testUserId, testToken, 'ios');
    await DeviceTokenModel.register(testUserId, testToken, 'ios');

    const tokens = await DeviceTokenModel.findByUserId(testUserId);
    expect(tokens).toHaveLength(1);
  });

  it('finds all tokens for a user', async () => {
    await DeviceTokenModel.register(testUserId, 'token-1', 'ios');
    await DeviceTokenModel.register(testUserId, 'token-2', 'android');

    const tokens = await DeviceTokenModel.findByUserId(testUserId);
    expect(tokens).toHaveLength(2);
  });

  it('deletes a specific token', async () => {
    await DeviceTokenModel.register(testUserId, testToken, 'ios');
    await DeviceTokenModel.deleteByToken(testToken);

    const tokens = await DeviceTokenModel.findByUserId(testUserId);
    expect(tokens).toHaveLength(0);
  });

  it('deletes all tokens for a user', async () => {
    await DeviceTokenModel.register(testUserId, 'token-1', 'ios');
    await DeviceTokenModel.register(testUserId, 'token-2', 'android');
    await DeviceTokenModel.deleteByUserId(testUserId);

    const tokens = await DeviceTokenModel.findByUserId(testUserId);
    expect(tokens).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/unit/device-token-model.test.ts --no-cache`
Expected: FAIL — `Cannot find module '../../src/models/DeviceToken'`

**Step 3: Create the migration**

Create `backend/src/migrations/20260306000001_create_device_tokens.ts`:

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('device_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('token').notNullable();
    table.enum('platform', ['ios', 'android']).notNullable();
    table.timestamp('last_used_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['token']); // One token per device
    table.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('device_tokens');
}
```

**Step 4: Create the model**

Create `backend/src/models/DeviceToken.ts`:

```typescript
import { db } from '../config/database';

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  last_used_at: Date;
  created_at: Date;
  updated_at: Date;
}

export const DeviceTokenModel = {
  async register(userId: string, token: string, platform: 'ios' | 'android'): Promise<DeviceToken> {
    // Upsert: if token exists, update user_id and last_used_at
    const [result] = await db('device_tokens')
      .insert({
        user_id: userId,
        token,
        platform,
        last_used_at: db.fn.now(),
      })
      .onConflict('token')
      .merge({
        user_id: userId,
        platform,
        last_used_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return result;
  },

  async findByUserId(userId: string): Promise<DeviceToken[]> {
    return db('device_tokens').where({ user_id: userId });
  },

  async deleteByToken(token: string): Promise<void> {
    await db('device_tokens').where({ token }).delete();
  },

  async deleteByUserId(userId: string): Promise<void> {
    await db('device_tokens').where({ user_id: userId }).delete();
  },
};
```

**Step 5: Run migration and test**

Run: `cd backend && npx knex migrate:latest && npx jest tests/unit/device-token-model.test.ts --no-cache`
Expected: 5 tests PASS

**Step 6: Commit**

```bash
git add backend/src/migrations/20260306000001_create_device_tokens.ts backend/src/models/DeviceToken.ts backend/tests/unit/device-token-model.test.ts
git commit -m "feat(push): add device_tokens table, model, and tests"
```

---

### Task 9: Create device token API endpoints

**Files:**
- Create: `backend/src/features/notifications/notification.routes.ts`
- Create: `backend/src/features/notifications/notification.controller.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/tests/integration/device-tokens-api.test.ts`

**Step 1: Write the failing test**

Create `backend/tests/integration/device-tokens-api.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/app';

describe('Device Token API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Use existing test auth helper to get a valid JWT
    // Adjust based on existing test patterns in the project
    authToken = 'Bearer test-jwt-token';
  });

  describe('POST /api/notifications/device-token', () => {
    it('registers a device token', async () => {
      const res = await request(app)
        .post('/api/notifications/device-token')
        .set('Authorization', authToken)
        .send({ token: 'fcm-token-test-123', platform: 'ios' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('rejects invalid platform', async () => {
      await request(app)
        .post('/api/notifications/device-token')
        .set('Authorization', authToken)
        .send({ token: 'fcm-token-test-123', platform: 'windows' })
        .expect(400);
    });

    it('rejects missing token', async () => {
      await request(app)
        .post('/api/notifications/device-token')
        .set('Authorization', authToken)
        .send({ platform: 'ios' })
        .expect(400);
    });
  });

  describe('DELETE /api/notifications/device-token', () => {
    it('removes a device token', async () => {
      // Register first
      await request(app)
        .post('/api/notifications/device-token')
        .set('Authorization', authToken)
        .send({ token: 'fcm-token-to-delete', platform: 'android' });

      const res = await request(app)
        .delete('/api/notifications/device-token')
        .set('Authorization', authToken)
        .send({ token: 'fcm-token-to-delete' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/integration/device-tokens-api.test.ts --no-cache`
Expected: FAIL — 404 Not Found

**Step 3: Implement controller and routes**

Create `backend/src/features/notifications/notification.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { DeviceTokenModel } from '../../models/DeviceToken';

const registerTokenSchema = z.object({
  token: z.string().min(1).max(500),
  platform: z.enum(['ios', 'android']),
});

const deleteTokenSchema = z.object({
  token: z.string().min(1).max(500),
});

export const notificationController = {
  async registerDeviceToken(req: Request, res: Response): Promise<void> {
    const parsed = registerTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const userId = (req as any).userId;
    await DeviceTokenModel.register(userId, parsed.data.token, parsed.data.platform);
    res.json({ success: true });
  },

  async removeDeviceToken(req: Request, res: Response): Promise<void> {
    const parsed = deleteTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    await DeviceTokenModel.deleteByToken(parsed.data.token);
    res.json({ success: true });
  },
};
```

Create `backend/src/features/notifications/notification.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { notificationController } from './notification.controller';

const router = Router();
router.use(authenticateToken);

router.post('/device-token', notificationController.registerDeviceToken);
router.delete('/device-token', notificationController.removeDeviceToken);

export default router;
```

**Step 4: Register in app.ts**

In `backend/src/app.ts`:

```typescript
import notificationRoutes from './features/notifications/notification.routes';

app.use('/api/notifications', notificationRoutes);
```

**Step 5: Run test to verify it passes**

Run: `cd backend && npx jest tests/integration/device-tokens-api.test.ts --no-cache`
Expected: 4 tests PASS

**Step 6: Commit**

```bash
git add backend/src/features/notifications/ backend/src/app.ts backend/tests/integration/device-tokens-api.test.ts
git commit -m "feat(push): add device token registration and removal API"
```

---

### Task 10: Install firebase-admin and create push notification service

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/config/env.ts`
- Create: `backend/src/services/pushNotificationService.ts`
- Create: `backend/tests/unit/push-notification-service.test.ts`

**Step 1: Install firebase-admin**

Run: `cd backend && npm install firebase-admin@^12.0.0`

**Step 2: Add env var for Firebase service account**

In `backend/src/config/env.ts`, add:

```typescript
FIREBASE_SERVICE_ACCOUNT_PATH: z.string().default(''),
```

Add to `.env.production.template`:

```bash
# Push Notifications (Firebase)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
```

**Step 3: Write the failing test**

Create `backend/tests/unit/push-notification-service.test.ts`:

```typescript
import { PushNotificationService } from '../../src/services/pushNotificationService';
import { DeviceTokenModel } from '../../src/models/DeviceToken';

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  messaging: jest.fn(() => ({
    sendEachForMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    }),
  })),
}));

jest.mock('../../src/models/DeviceToken');

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PushNotificationService();
    (DeviceTokenModel.findByUserId as jest.Mock).mockResolvedValue([
      { token: 'token-1', platform: 'ios' },
    ]);
  });

  it('sends push to all user devices', async () => {
    await service.sendToUser('user-123', {
      title: 'New Message',
      body: 'Jane sent you a message',
      data: { type: 'message', conversationId: 'conv-456' },
    });

    expect(DeviceTokenModel.findByUserId).toHaveBeenCalledWith('user-123');
  });

  it('skips send when user has no devices', async () => {
    (DeviceTokenModel.findByUserId as jest.Mock).mockResolvedValue([]);

    await service.sendToUser('user-123', {
      title: 'Test',
      body: 'Test body',
    });

    // Should not throw, just skip
  });
});
```

**Step 4: Run test to verify it fails**

Run: `cd backend && npx jest tests/unit/push-notification-service.test.ts --no-cache`
Expected: FAIL — `Cannot find module '../../src/services/pushNotificationService'`

**Step 5: Implement the service**

Create `backend/src/services/pushNotificationService.ts`:

```typescript
import * as admin from 'firebase-admin';
import { DeviceTokenModel } from '../models/DeviceToken';
import { logger } from '../config/logger';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export class PushNotificationService {
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized || admin.apps.length > 0) {
      this.initialized = true;
      return;
    }

    try {
      const { getEnv } = require('../config/env');
      const env = getEnv();

      if (!env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const log = logger || console;
        log.warn('[PushNotificationService] FIREBASE_SERVICE_ACCOUNT_PATH not set, push disabled');
        return;
      }

      const serviceAccount = require(env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.initialized = true;
    } catch (error: any) {
      const log = logger || console;
      log.error('[PushNotificationService] Firebase init failed:', error.message);
    }
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const tokens = await DeviceTokenModel.findByUserId(userId);
    if (tokens.length === 0) return;

    this.ensureInitialized();
    if (!this.initialized) return;

    const tokenStrings = tokens.map((t) => t.token);

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: tokenStrings,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data,
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'conest_default',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokenStrings[idx]);
          }
        });
        for (const token of invalidTokens) {
          await DeviceTokenModel.deleteByToken(token);
        }
      }
    } catch (error: any) {
      const log = logger || console;
      log.error('[PushNotificationService] Send failed:', {
        userId,
        error: error.message,
        tokenCount: tokenStrings.length,
      });
    }
  }
}

// Singleton
let instance: PushNotificationService | null = null;

export function getPushService(): PushNotificationService {
  if (!instance) {
    instance = new PushNotificationService();
  }
  return instance;
}
```

**Step 6: Run test to verify it passes**

Run: `cd backend && npx jest tests/unit/push-notification-service.test.ts --no-cache`
Expected: 2 tests PASS

**Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/config/env.ts backend/.env.production.template backend/src/services/pushNotificationService.ts backend/tests/unit/push-notification-service.test.ts
git commit -m "feat(push): add PushNotificationService with Firebase Admin SDK"
```

---

### Task 11: Wire push notification triggers to events

**Files:**
- Modify: `backend/src/services/SocketService.ts`
- Modify: `backend/src/features/messages/enhanced-messaging.service.ts` (or messaging.service.ts)
- Modify: `backend/src/features/connections/connection-request.service.ts`
- Modify: `backend/src/features/household/invitations.service.ts`
- Modify: `backend/src/features/verification/verification.service.ts`

**Step 1: Add push to new message events**

In the messaging service, where a new message is persisted and the Socket.io event fires, add:

```typescript
import { getPushService } from '../../services/pushNotificationService';

// After saving the message and emitting socket event:
getPushService().sendToUser(recipientId, {
  title: `${senderName}`,
  body: messageContent.length > 100 ? messageContent.substring(0, 100) + '...' : messageContent,
  data: { type: 'message', conversationId: String(conversationId) },
});
```

**Step 2: Add push to connection requests**

In the connection request service, after creating a new request:

```typescript
getPushService().sendToUser(targetUserId, {
  title: 'New Connection Request',
  body: `${requesterName} wants to connect with you`,
  data: { type: 'connection_request', requestId: String(requestId) },
});
```

**Step 3: Add push to household invitations**

In the invitation service, after creating an invitation:

```typescript
getPushService().sendToUser(inviteeUserId, {
  title: 'Household Invitation',
  body: `${inviterName} invited you to join their household`,
  data: { type: 'household_invite', invitationId: String(invitationId) },
});
```

**Step 4: Add push to verification status changes**

In the verification service, where verification status is updated (approved/rejected):

```typescript
getPushService().sendToUser(userId, {
  title: 'Verification Update',
  body: status === 'approved'
    ? 'Your verification has been approved!'
    : 'Your verification requires attention',
  data: { type: 'verification', status },
});
```

**Step 5: Verify existing tests still pass**

Run: `cd backend && npx jest --no-cache`
Expected: All existing tests pass (push is fire-and-forget, mocked in test env).

**Step 6: Commit**

```bash
git add backend/src/services/SocketService.ts backend/src/features/messages/ backend/src/features/connections/ backend/src/features/household/ backend/src/features/verification/
git commit -m "feat(push): wire push notifications to message, connection, household, verification events"
```

---

### Task 12: Mobile — Install Firebase Messaging and register tokens

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/ios/Podfile`
- Modify: `mobile/android/build.gradle`
- Modify: `mobile/android/app/build.gradle`
- Create: `mobile/src/services/pushNotificationService.ts`
- Create: `mobile/src/services/api/notificationAPI.ts`

**Step 1: Install React Native Firebase**

Run:
```bash
cd mobile && npm install @react-native-firebase/app@^20.0.0 @react-native-firebase/messaging@^20.0.0
```

**Step 2: iOS — Add Firebase pods and install**

Add to `mobile/ios/Podfile` (in the target block):

```ruby
pod 'FirebaseMessaging', :modular_headers => true
```

Run: `cd mobile/ios && pod install`

Copy `GoogleService-Info.plist` (from Firebase Console) into `mobile/ios/conest/`.

**Step 3: Android — Add Firebase config**

In `mobile/android/build.gradle`, add to `buildscript.dependencies`:

```groovy
classpath 'com.google.gms:google-services:4.4.0'
```

In `mobile/android/app/build.gradle`, add at the bottom:

```groovy
apply plugin: 'com.google.gms.google-services'
```

Copy `google-services.json` (from Firebase Console) into `mobile/android/app/`.

**Step 4: Create notification API client**

Create `mobile/src/services/api/notificationAPI.ts`:

```typescript
import apiClient from '../../config/api';

export const notificationAPI = {
  async registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    await apiClient.post('/api/notifications/device-token', { token, platform });
  },

  async removeDeviceToken(token: string): Promise<void> {
    await apiClient.delete('/api/notifications/device-token', { data: { token } });
  },
};
```

**Step 5: Create mobile push notification service**

Create `mobile/src/services/pushNotificationService.ts`:

```typescript
import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import { notificationAPI } from './api/notificationAPI';

class MobilePushService {
  private currentToken: string | null = null;

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    }

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true; // Android < 13 doesn't need runtime permission
  }

  async registerToken(): Promise<void> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return;

      const token = await messaging().getToken();
      if (token && token !== this.currentToken) {
        const platform = Platform.OS as 'ios' | 'android';
        await notificationAPI.registerDeviceToken(token, platform);
        this.currentToken = token;
      }
    } catch (error) {
      console.warn('[PushService] Token registration failed:', error);
    }
  }

  async unregisterToken(): Promise<void> {
    if (this.currentToken) {
      try {
        await notificationAPI.removeDeviceToken(this.currentToken);
      } catch (error) {
        console.warn('[PushService] Token removal failed:', error);
      }
      this.currentToken = null;
    }
  }

  onTokenRefresh(callback: (token: string) => void): () => void {
    return messaging().onTokenRefresh(callback);
  }

  setupForegroundHandler(): () => void {
    return messaging().onMessage(async (remoteMessage) => {
      // In-app notification handled by existing toast/modal system
      // Parse remoteMessage.data.type to determine action
      console.log('[PushService] Foreground message:', remoteMessage.notification?.title);
    });
  }

  setupBackgroundHandler(): void {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      // Background processing — minimal work here
      console.log('[PushService] Background message:', remoteMessage.notification?.title);
    });
  }
}

export const mobilePushService = new MobilePushService();
```

**Step 6: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: No new errors

**Step 7: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/ios/Podfile mobile/ios/Podfile.lock mobile/android/build.gradle mobile/android/app/build.gradle mobile/src/services/pushNotificationService.ts mobile/src/services/api/notificationAPI.ts
git commit -m "feat(push): install Firebase Messaging and create mobile push service"
```

---

### Task 13: Wire push registration into app lifecycle

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx`

**Step 1: Register push token after auth + onboarding complete**

In `AppNavigator.tsx`, inside the existing `useEffect` that initializes Socket.io (around line 131), add push registration:

```typescript
import { mobilePushService } from '../services/pushNotificationService';

// Inside the useEffect where socket connects:
useEffect(() => {
  if (isAuthenticated && isOnboardingComplete) {
    // Existing socket connection...
    socketService.connect().then(() => {
      initializeMessagingSocket();
      initializeModerationSocket();
    });

    // Register push notifications
    mobilePushService.registerToken();
    const unsubscribeForeground = mobilePushService.setupForegroundHandler();
    const unsubscribeTokenRefresh = mobilePushService.onTokenRefresh(async (newToken) => {
      const { notificationAPI } = require('../services/api/notificationAPI');
      const { Platform } = require('react-native');
      await notificationAPI.registerDeviceToken(newToken, Platform.OS as 'ios' | 'android');
    });

    return () => {
      cleanupMessagingSocket();
      cleanupModerationSocket();
      socketService.disconnect();
      unsubscribeForeground();
      unsubscribeTokenRefresh();
    };
  } else {
    // User logged out — unregister push token
    mobilePushService.unregisterToken();
    cleanupMessagingSocket();
    cleanupModerationSocket();
    socketService.disconnect();
  }
}, [isAuthenticated, isOnboardingComplete]);
```

**Step 2: Add background handler in app entry point**

In `mobile/index.js` (or wherever the app is registered), add before `AppRegistry.registerComponent`:

```typescript
import { mobilePushService } from './src/services/pushNotificationService';
mobilePushService.setupBackgroundHandler();
```

**Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: No new errors

**Step 4: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx mobile/index.js
git commit -m "feat(push): wire push token registration and notification handlers into app lifecycle"
```

---

## Phase 4: Onboarding Analytics (GAP-05)

> Independent of other gaps. ~1-2 days.

### Task 14: Install PostHog and initialize

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/src/config/environment.ts`
- Create: `mobile/src/services/analytics.ts`

**Step 1: Install PostHog**

Run: `cd mobile && npm install posthog-react-native@^3.0.0`

**Step 2: Add PostHog config to environment**

In `mobile/src/config/environment.ts`, add:

```typescript
const POSTHOG_API_KEY = 'phc_your_key_here'; // Replace after account creation
const POSTHOG_HOST = 'https://us.i.posthog.com'; // or eu.i.posthog.com

export const analyticsConfig = {
  apiKey: POSTHOG_API_KEY,
  host: POSTHOG_HOST,
  enabled: isProduction, // Only track in production builds
};
```

**Step 3: Create analytics service**

Create `mobile/src/services/analytics.ts`:

```typescript
import PostHog from 'posthog-react-native';
import { analyticsConfig } from '../config/environment';

let posthog: PostHog | null = null;

export const analytics = {
  async init(): Promise<void> {
    if (!analyticsConfig.enabled || !analyticsConfig.apiKey.startsWith('phc_')) {
      return; // Skip in dev or when not configured
    }

    posthog = new PostHog(analyticsConfig.apiKey, {
      host: analyticsConfig.host,
      enableSessionReplay: false,
    });
  },

  identify(userId: string, properties?: Record<string, any>): void {
    posthog?.identify(userId, properties);
  },

  track(event: string, properties?: Record<string, any>): void {
    posthog?.capture(event, properties);
  },

  screen(screenName: string, properties?: Record<string, any>): void {
    posthog?.screen(screenName, properties);
  },

  reset(): void {
    posthog?.reset();
  },

  async flush(): Promise<void> {
    await posthog?.flush();
  },
};

// Event name constants — prevent typos
export const AnalyticsEvents = {
  // Onboarding funnel
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  OAUTH_STARTED: 'oauth_started',
  OAUTH_COMPLETED: 'oauth_completed',
  ONBOARDING_LOCATION_SET: 'onboarding_location_set',
  ONBOARDING_BUDGET_SET: 'onboarding_budget_set',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FIRST_DISCOVERY_VIEW: 'first_discovery_view',

  // Core actions
  PROFILE_SWIPED: 'profile_swiped',
  CONNECTION_REQUESTED: 'connection_requested',
  CONNECTION_ACCEPTED: 'connection_accepted',
  MESSAGE_SENT: 'message_sent',
  PROFILE_SAVED: 'profile_saved',

  // Verification
  VERIFICATION_STARTED: 'verification_started',
  VERIFICATION_COMPLETED: 'verification_completed',

  // Monetization
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_COMPLETED: 'payment_completed',
  SUBSCRIPTION_STARTED: 'subscription_started',

  // Household
  HOUSEHOLD_CREATED: 'household_created',
  HOUSEHOLD_INVITE_SENT: 'household_invite_sent',
} as const;
```

**Step 4: Initialize in app entry**

In `mobile/src/navigation/AppNavigator.tsx` (or App.tsx), add early initialization:

```typescript
import { analytics } from '../services/analytics';

// At component mount:
useEffect(() => {
  analytics.init();
}, []);
```

**Step 5: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: No new errors

**Step 6: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/src/config/environment.ts mobile/src/services/analytics.ts mobile/src/navigation/AppNavigator.tsx
git commit -m "feat(analytics): install PostHog and create analytics service with event constants"
```

---

### Task 15: Add screen tracking and onboarding funnel events

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx` (screen tracking)
- Modify: `mobile/src/screens/auth/SignupScreen.tsx`
- Modify: `mobile/src/screens/auth/LoginScreen.tsx`
- Modify: `mobile/src/services/api/oauth.ts`

**Step 1: Add automatic screen tracking**

In `AppNavigator.tsx`, add `onStateChange` to NavigationContainer:

```typescript
import { analytics } from '../services/analytics';

<NavigationContainer
  ref={navigationRef}
  linking={linking}
  onStateChange={(state) => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    if (currentRoute) {
      analytics.screen(currentRoute.name, { routeParams: currentRoute.params });
    }
  }}
>
```

**Step 2: Add signup funnel events**

In `SignupScreen.tsx`, track signup start and completion:

```typescript
import { analytics, AnalyticsEvents } from '../../services/analytics';

// When signup form is submitted:
analytics.track(AnalyticsEvents.SIGNUP_STARTED, { method: 'email' });

// After successful signup:
analytics.track(AnalyticsEvents.SIGNUP_COMPLETED, { method: 'email' });
analytics.identify(user.id, { email: user.email, city: user.city });
```

**Step 3: Add OAuth funnel events**

In `mobile/src/services/api/oauth.ts`, in `signInWithGoogle` and `signInWithApple`:

```typescript
import { analytics, AnalyticsEvents } from '../analytics';

// At start of signInWithGoogle:
analytics.track(AnalyticsEvents.OAUTH_STARTED, { provider: 'google' });

// After successful token storage:
analytics.track(AnalyticsEvents.OAUTH_COMPLETED, { provider: 'google' });
analytics.identify(response.data.user.id, { email: response.data.user.email });
```

Same pattern for Apple OAuth with `{ provider: 'apple' }`.

**Step 4: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: No new errors

**Step 5: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx mobile/src/screens/auth/ mobile/src/services/api/oauth.ts
git commit -m "feat(analytics): add screen tracking and onboarding funnel events"
```

---

### Task 16: Add action event tracking across app

**Files:**
- Modify: `mobile/src/screens/main/BrowseDiscoveryScreen.tsx` (swipe events)
- Modify: `mobile/src/screens/messaging/ChatScreen.tsx` (message sent)
- Modify: `mobile/src/screens/main/ConnectionRequestsScreen.tsx` (connection events)

**Step 1: Track discovery swipes**

In `BrowseDiscoveryScreen.tsx`, where swipe actions are handled:

```typescript
import { analytics, AnalyticsEvents } from '../../services/analytics';

// After a swipe is processed:
analytics.track(AnalyticsEvents.PROFILE_SWIPED, {
  direction: swipeDirection, // 'right' | 'left'
  targetProfileId: profile.id,
});
```

**Step 2: Track messages sent**

In `ChatScreen.tsx`, after a message is successfully sent:

```typescript
analytics.track(AnalyticsEvents.MESSAGE_SENT, {
  conversationId: conversationId,
});
```

**Step 3: Track connection requests**

In the connection request flow, track sends and accepts:

```typescript
analytics.track(AnalyticsEvents.CONNECTION_REQUESTED, {
  targetUserId: targetId,
});

// On accept:
analytics.track(AnalyticsEvents.CONNECTION_ACCEPTED, {
  requesterId: requesterId,
});
```

**Step 4: Track verification and payment events**

In verification screens, track starts and completions. In payment screens, track payment initiation and success.

```typescript
// Verification start:
analytics.track(AnalyticsEvents.VERIFICATION_STARTED, { type: 'phone' });

// Payment completed:
analytics.track(AnalyticsEvents.PAYMENT_COMPLETED, { amount: 39, type: 'verification' });
```

**Step 5: Add analytics reset on logout**

In the logout handler (wherever `clearTokens()` is called):

```typescript
analytics.reset();
```

**Step 6: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: No new errors

**Step 7: Commit**

```bash
git add mobile/src/screens/ mobile/src/services/analytics.ts
git commit -m "feat(analytics): add event tracking for swipes, messages, connections, verification, payments"
```

---

## Phase 5: Photo Upload Mobile Flow (GAP-04)

> Backend endpoint already exists (POST /profiles/photo with multer + S3). Only mobile flow needed. ~1 day.

### Task 17: Create mobile photo upload service

**Files:**
- Create: `mobile/src/services/api/photoUploadAPI.ts`
- Create: `mobile/__tests__/services/photoUploadAPI.test.ts`

**Step 1: Write the failing test**

Create `mobile/__tests__/services/photoUploadAPI.test.ts`:

```typescript
import { photoUploadAPI } from '../../src/services/api/photoUploadAPI';

jest.mock('../../src/config/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn().mockResolvedValue({
      data: { success: true, url: 'https://s3.amazonaws.com/photo.jpg' },
    }),
  },
}));

describe('photoUploadAPI', () => {
  it('uploads photo as FormData', async () => {
    const apiClient = require('../../src/config/api').default;

    const result = await photoUploadAPI.uploadProfilePhoto({
      uri: 'file:///tmp/photo.jpg',
      type: 'image/jpeg',
      fileName: 'photo.jpg',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/profiles/photo',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'multipart/form-data',
        }),
      }),
    );
    expect(result.url).toBe('https://s3.amazonaws.com/photo.jpg');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest __tests__/services/photoUploadAPI.test.ts --no-cache`
Expected: FAIL — `Cannot find module`

**Step 3: Implement the API service**

Create `mobile/src/services/api/photoUploadAPI.ts`:

```typescript
import apiClient from '../../config/api';
import { Platform } from 'react-native';

interface PhotoFile {
  uri: string;
  type: string;
  fileName: string;
}

interface UploadResult {
  success: boolean;
  url: string;
}

export const photoUploadAPI = {
  async uploadProfilePhoto(photo: PhotoFile): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('photo', {
      uri: Platform.OS === 'ios' ? photo.uri.replace('file://', '') : photo.uri,
      type: photo.type,
      name: photo.fileName,
    } as any);

    const response = await apiClient.post<UploadResult>('/api/profiles/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000, // 30s for large uploads
    });

    return response.data;
  },
};
```

**Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest __tests__/services/photoUploadAPI.test.ts --no-cache`
Expected: 1 test PASS

**Step 5: Commit**

```bash
git add mobile/src/services/api/photoUploadAPI.ts mobile/__tests__/services/photoUploadAPI.test.ts
git commit -m "feat(photo): add mobile photo upload API service"
```

---

### Task 18: Create PhotoUploadButton component and wire to ProfileScreen

**Files:**
- Create: `mobile/src/components/profile/PhotoUploadButton.tsx`
- Modify: `mobile/src/screens/main/ProfileScreen.tsx`
- Modify: `mobile/src/store/slices/userSlice.ts`

**Step 1: Create the PhotoUploadButton component**

Create `mobile/src/components/profile/PhotoUploadButton.tsx`:

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, Image, View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { photoUploadAPI } from '../../services/api/photoUploadAPI';
import { theme } from '../../theme';

const { colors } = theme;

interface PhotoUploadButtonProps {
  currentPhotoUrl?: string | null;
  onUploadSuccess: (url: string) => void;
  size?: number;
}

const PhotoUploadButton: React.FC<PhotoUploadButtonProps> = ({
  currentPhotoUrl,
  onUploadSuccess,
  size = 100,
}) => {
  const [uploading, setUploading] = useState(false);

  const handlePress = () => {
    Alert.alert('Update Photo', 'Choose a source', [
      { text: 'Camera', onPress: () => pickImage('camera') },
      { text: 'Photo Library', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const launcher = source === 'camera' ? launchCamera : launchImageLibrary;
    const result: ImagePickerResponse = await launcher({
      mediaType: 'photo',
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
    });

    if (result.didCancel || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.uri || !asset.type || !asset.fileName) return;

    setUploading(true);
    try {
      const response = await photoUploadAPI.uploadProfilePhoto({
        uri: asset.uri,
        type: asset.type,
        fileName: asset.fileName,
      });
      onUploadSuccess(response.url);
    } catch (error) {
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.', [
        { text: 'Retry', onPress: () => pickImage(source) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={handlePress}
      disabled={uploading}
      testID="photo-upload-button"
      accessibilityLabel="Change profile photo"
      accessibilityRole="button"
    >
      {currentPhotoUrl ? (
        <Image
          source={{ uri: currentPhotoUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Icon name="camera-plus" size={size * 0.35} color={colors.text.secondary} />
        </View>
      )}
      {uploading && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      )}
      <View style={styles.editBadge}>
        <Icon name="pencil" size={14} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default PhotoUploadButton;
```

**Step 2: Wire into ProfileScreen**

In `mobile/src/screens/main/ProfileScreen.tsx`, replace the static profile photo image with `PhotoUploadButton`:

```typescript
import PhotoUploadButton from '../../components/profile/PhotoUploadButton';
import { useDispatch, useSelector } from 'react-redux';

// In the render, replace the profile photo section:
<PhotoUploadButton
  currentPhotoUrl={profile?.profilePhoto}
  onUploadSuccess={(url) => {
    dispatch(updateOnboardingData({ profilePhotoUri: url }));
    // Or dispatch a setProfile action to update the photo URL in Redux
  }}
  size={100}
/>
```

**Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: No new errors

**Step 4: Commit**

```bash
git add mobile/src/components/profile/PhotoUploadButton.tsx mobile/src/screens/main/ProfileScreen.tsx
git commit -m "feat(photo): add PhotoUploadButton component with camera/gallery picker and S3 upload"
```

---

## Verification Checklist

After all phases complete, verify:

- [ ] Email: `cd backend && npx jest tests/unit/email-service.test.ts` — 6 tests pass
- [ ] Deep Links: `cd backend && npx jest tests/integration/well-known.test.ts` — 2 tests pass
- [ ] Device Tokens: `cd backend && npx jest tests/unit/device-token-model.test.ts` — 5 tests pass
- [ ] Device Token API: `cd backend && npx jest tests/integration/device-tokens-api.test.ts` — 4 tests pass
- [ ] Push Service: `cd backend && npx jest tests/unit/push-notification-service.test.ts` — 2 tests pass
- [ ] Photo Upload: `cd mobile && npx jest __tests__/services/photoUploadAPI.test.ts` — 1 test passes
- [ ] Full backend suite: `cd backend && npx jest --no-cache` — no regressions
- [ ] Full mobile TypeScript: `cd mobile && npx tsc --noEmit` — no new errors
- [ ] Manual: Send test push notification via Firebase Console → app receives it
- [ ] Manual: Open `https://conest.app/.well-known/apple-app-site-association` → valid JSON
- [ ] Manual: Tap profile photo → picker opens → upload succeeds → photo updates

## Summary

| Phase | GAP | Tasks | New Files | Tests |
|-------|-----|-------|-----------|-------|
| 1 | GAP-02 Email | 5 | 2 | 6 |
| 2 | GAP-03 Links | 2 | 2 | 2 |
| 3 | GAP-01 Push | 6 | 7 | 11 |
| 4 | GAP-05 Analytics | 3 | 1 | 0 (manual) |
| 5 | GAP-04 Photo | 2 | 3 | 1 |
| **Total** | **5 gaps** | **18 tasks** | **15 new files** | **20 tests** |

Estimated total: 8-12 days depending on Firebase/SendGrid account setup time.
