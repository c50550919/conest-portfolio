/**
 * Development-Only Routes
 *
 * SECURITY: These routes are ONLY registered when NODE_ENV is 'development' or 'test'
 * They provide test authentication tokens for local development and automated testing.
 *
 * NEVER import this file in production code paths.
 * The app.ts file conditionally registers these routes based on NODE_ENV.
 */

import express, { Request, Response } from 'express';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { UserModel } from '../models/User';

const router = express.Router();

// Known test user emails (seeded via scripts/seed-test-users-api.ts)
// Password for all test users: TestPassword123!
const TEST_USER_EMAILS: Record<string, string> = {
  sarah: 'sarah.verified@test.com',
  maria: 'maria.fullverified@test.com',
  lisa: 'lisa.pending@test.com',
  jennifer: 'jennifer.complete@test.com',
  amanda: 'amanda.new@test.com',
  michelle: 'michelle.budget@test.com',
  patricia: 'patricia.schedule@test.com',
  karen: 'karen.lifestyle@test.com',
};

/**
 * GET /api/dev/test-token
 *
 * Get a valid JWT for a test user. For local development and testing only.
 * Looks up user from database by email to get the actual user ID.
 *
 * Query params:
 *   - user: Test user name (sarah, maria, lisa, etc.) - defaults to 'sarah'
 *   - email: Direct email lookup (alternative to user param)
 *
 * Response:
 *   - accessToken: Valid JWT access token (15min expiry)
 *   - refreshToken: Valid JWT refresh token (7 day expiry)
 *   - user: User details
 *   - expiresIn: Token expiry time
 *
 * Example:
 *   GET /api/dev/test-token?user=sarah
 *   GET /api/dev/test-token?email=sarah.verified@test.com
 *   curl http://localhost:3000/api/dev/test-token?user=sarah
 */
router.get('/test-token', async (req: Request, res: Response) => {
  try {
    // Determine email to look up
    let email: string | undefined;

    if (req.query.email) {
      // Direct email lookup
      email = req.query.email as string;
    } else {
      // Lookup by test user name
      const userName = (req.query.user as string || 'sarah').toLowerCase();
      email = TEST_USER_EMAILS[userName];

      if (!email) {
        res.status(400).json({
          error: 'Invalid test user',
          message: `Available test users: ${Object.keys(TEST_USER_EMAILS).join(', ')}`,
          hint: 'You can also use ?email=your@email.com for direct lookup',
        });
        return;
      }
    }

    // Look up user in database
    const user = await UserModel.findByEmail(email);

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: `No user found with email: ${email}`,
        hint: 'Run the seed script first: npx ts-node scripts/seed-test-users-api.ts',
        availableUsers: Object.entries(TEST_USER_EMAILS).map(([key, e]) => ({ key, email: e })),
      });
      return;
    }

    // Generate tokens with REAL user ID from database
    const payload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      success: true,
      message: '⚠️  DEV ONLY - This endpoint does not exist in production',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
      expiresIn: '15m',
      usage: {
        header: 'Authorization: Bearer <accessToken>',
        example: `curl -H "Authorization: Bearer ${accessToken.substring(0, 30)}..." http://localhost:3000/api/profiles/compare`,
      },
    });
  } catch (error) {
    console.error('Error generating test token:', error);
    res.status(500).json({
      error: 'Failed to generate test token',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/dev/test-users
 *
 * List all available test users.
 */
router.get('/test-users', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: '⚠️  DEV ONLY - Available test users for authentication',
    note: 'Password for all test users: TestPassword123!',
    users: Object.entries(TEST_USER_EMAILS).map(([key, email]) => ({
      key,
      email,
      getToken: `/api/dev/test-token?user=${key}`,
      login: {
        endpoint: 'POST /api/auth/login',
        body: { email, password: 'TestPassword123!' },
      },
    })),
  });
});

/**
 * GET /api/dev/health
 *
 * Simple health check that confirms dev routes are active.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    environment: process.env.NODE_ENV,
    message: '⚠️  Dev routes are active - this should NOT appear in production',
    timestamp: new Date().toISOString(),
  });
});

export default router;
