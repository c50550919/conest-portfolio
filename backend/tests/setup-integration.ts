/**
 * Integration Test Setup
 *
 * Purpose: Configure REAL database and Redis connections for integration tests
 * Unlike unit tests, these tests verify actual system behavior with real data stores.
 *
 * Prerequisites:
 *   docker-compose -f docker-compose.test.yml up -d
 *
 * Usage:
 *   This file is automatically loaded for tests matching /integration/ pattern
 *   via Jest's setupFilesAfterEnv configuration.
 */

// IMPORTANT: Set test environment variables BEFORE importing any modules
// These match docker-compose.test.yml container configuration
process.env.NODE_ENV = 'test';
process.env.DB_HOST = '127.0.0.1';  // Use IPv4 to avoid IPv6 issues
process.env.DB_PORT = '5433';        // Test container mapped port
process.env.DB_NAME = 'conest_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6380';     // Test container mapped port
process.env.REDIS_PASSWORD = 'test_redis_password';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

import { db } from '../src/config/database';
import Redis from 'ioredis';

// Global Redis instance for integration tests
let redis: Redis | null = null;

/**
 * Get Redis client for integration tests
 * Creates a new connection if one doesn't exist
 */
export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6380,
      password: process.env.REDIS_PASSWORD || 'test_redis_password',
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });
  }
  return redis;
}

/**
 * Global setup - runs once before all integration tests
 */
beforeAll(async () => {
  // Ensure test environment
  process.env.NODE_ENV = 'test';

  // Run migrations to ensure schema is up to date
  try {
    await db.migrate.latest();
    console.log('[Integration Setup] Database migrations complete');
  } catch (error) {
    console.error('[Integration Setup] Migration failed:', error);
    throw error;
  }

  // Initialize Redis connection
  try {
    const redisClient = getRedis();
    await redisClient.ping();
    console.log('[Integration Setup] Redis connection established');
  } catch (error) {
    console.error('[Integration Setup] Redis connection failed:', error);
    throw error;
  }
}, 30000);

/**
 * Global teardown - runs once after all integration tests
 */
afterAll(async () => {
  // Close Redis connection
  if (redis) {
    await redis.quit();
    redis = null;
  }

  // Close database connection
  await db.destroy();
});

/**
 * Per-test cleanup - runs after each test
 * Truncates all tables to ensure test isolation
 */
afterEach(async () => {
  // Truncate all relevant tables for clean test isolation
  // Order matters due to foreign key constraints - truncate in dependency order
  // Note: Only include tables that exist in the schema
  await db.raw(`
    TRUNCATE TABLE
      ai_moderation_logs,
      moderation_patterns,
      admin_actions,
      message_reports,
      encryption_keys,
      billing_transactions,
      subscriptions,
      messages,
      conversations,
      connection_requests,
      household_members,
      households,
      saved_profiles,
      matches,
      swipes,
      verification_payments,
      verification_webhook_events,
      payments,
      profiles,
      verifications,
      users
    RESTART IDENTITY CASCADE
  `);

  // Clear Redis keys
  const redisClient = getRedis();
  await redisClient.flushdb();
});

/**
 * Integration test utilities
 */

export interface IntegrationTestUser {
  id: string;
  email: string;
  password: string;
  phone?: string;
  token: string;
}

/**
 * Create a user directly in the database for integration tests
 * Returns user data with a valid JWT token
 *
 * Note: The users table has limited columns. Admin role is simulated
 * by checking token claims in tests.
 */
export async function createIntegrationTestUser(options: {
  email?: string;
  password?: string;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  role?: 'user' | 'admin';
} = {}): Promise<IntegrationTestUser> {
  const bcrypt = await import('bcrypt');
  const jwt = await import('jsonwebtoken');

  const email = options.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const password = options.password || 'TestPassword123!';
  const phone = options.phone || `+1555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;

  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user - only use columns that exist in the schema
  // status enum: 'active', 'suspended', 'deactivated'
  const [user] = await db('users')
    .insert({
      email,
      password_hash: passwordHash,
      phone,
      email_verified: options.emailVerified ?? true,
      phone_verified: options.phoneVerified ?? true,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');

  // Insert verification record
  await db('verifications').insert({
    user_id: user.id,
    email_verified: options.emailVerified ?? true,
    phone_verified: options.phoneVerified ?? true,
    id_verification_status: 'pending',
    background_check_status: 'pending',
    fully_verified: false,
    verification_score: 50,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Generate valid JWT - include role in token for admin tests
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: options.role ?? 'user',
    },
    process.env.JWT_SECRET || 'test-secret-key-for-testing-only',
    { expiresIn: '1h' },
  );

  return {
    id: user.id,
    email: user.email,
    password,
    phone,
    token,
  };
}

/**
 * Create a pending payment record for testing webhook flows
 */
export async function createPendingPayment(
  userId: string,
  type: 'verification' | 'subscription' = 'verification',
  stripePaymentIntentId?: string,
): Promise<string> {
  const paymentIntentId = stripePaymentIntentId || `pi_test_${Date.now()}`;

  const [payment] = await db('payments')
    .insert({
      user_id: userId,
      stripe_payment_intent_id: paymentIntentId,
      amount: type === 'verification' ? 3900 : 1499,
      currency: 'usd',
      status: 'pending',
      type,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('id');

  return payment.id;
}

/**
 * Create a conversation between two users
 */
export async function createConversation(
  user1Id: string,
  user2Id: string,
): Promise<string> {
  const [conversation] = await db('conversations')
    .insert({
      participant_ids: [user1Id, user2Id],
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('id');

  return conversation.id;
}

/**
 * Create a Stripe webhook signature for testing
 * Uses the same algorithm Stripe uses to sign webhooks
 */
export function createStripeSignature(
  payload: object | string,
  secret: string = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret',
): string {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

// Re-export database for direct queries in tests
export { db };
