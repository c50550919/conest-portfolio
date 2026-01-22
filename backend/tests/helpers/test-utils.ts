import { Knex } from 'knex';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../../src/config/database';

/**
 * Test Utilities
 *
 * Purpose: Shared test helpers for database setup, user creation, and authentication
 * Used by: Contract, Integration, Compliance, and E2E tests
 */

export interface TestUser {
  id: string;
  email: string;
  verified: boolean;
  idVerified: boolean;
  backgroundCheckComplete: boolean;
  phoneVerified: boolean;
  profile?: {
    firstName: string;
    age: number;
    city: string;
    childrenCount: number;
    childrenAgeGroups: string[];
    budget: number;
    moveInDate: Date;
  };
}

export interface CreateTestUserOptions {
  email: string;
  password?: string;
  verified?: boolean;
  idVerified?: boolean;
  backgroundCheckComplete?: boolean;
  phoneVerified?: boolean;
  profile?: {
    firstName: string;
    age: number;
    city: string;
    childrenCount: number;
    childrenAgeGroups: string[];
    budget: number;
    moveInDate: Date;
  };
}

/**
 * Setup test database connection and run migrations
 */
export async function setupTestDatabase(): Promise<void> {
  // Run migrations using the singleton database instance
  await db.migrate.latest();

  // Clear all test data
  await db.raw('TRUNCATE TABLE users, profiles, verifications, swipes, matches RESTART IDENTITY CASCADE');
}

/**
 * Teardown test database connection and rollback migrations
 */
export async function teardownTestDatabase(): Promise<void> {
  if (db) {
    // Clean up test data
    await db.raw('TRUNCATE TABLE users, profiles, verifications, swipes, matches RESTART IDENTITY CASCADE');

    // Close connection
    await db.destroy();
  }
}

/**
 * Create a test user with profile
 */
export async function createTestUser(options: CreateTestUserOptions): Promise<TestUser> {
  const {
    email: baseEmail,
    password = 'Test1234!',
    verified = false,
    idVerified = false,
    backgroundCheckComplete = false,
    phoneVerified = false,
    profile,
  } = options;

  // Make email unique by appending timestamp + random to avoid conflicts
  const email = baseEmail.includes('@')
    ? baseEmail.replace('@', `+${Date.now()}${Math.random().toString(36).substring(7)}@`)
    : baseEmail;

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user
  const [user] = await db('users')
    .insert({
      email,
      password_hash: passwordHash,
      phone_verified: phoneVerified,
      email_verified: verified,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');

  // Insert verification record
  await db('verifications').insert({
    user_id: user.id,
    phone_verified: phoneVerified,
    email_verified: verified,
    id_verification_status: idVerified ? 'approved' : 'pending',
    background_check_status: backgroundCheckComplete ? 'clear' : 'pending',
    fully_verified: verified && idVerified && backgroundCheckComplete && phoneVerified,
    verification_score: (verified ? 25 : 0) + (idVerified ? 25 : 0) + (backgroundCheckComplete ? 25 : 0) + (phoneVerified ? 25 : 0),
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Insert profile if provided
  if (profile) {
    // Calculate date of birth from age (approximate)
    const dateOfBirth = new Date();
    dateOfBirth.setFullYear(dateOfBirth.getFullYear() - profile.age);

    await db('profiles').insert({
      user_id: user.id,
      first_name: profile.firstName,
      last_name: 'TestUser', // Default last name for tests
      date_of_birth: dateOfBirth,
      city: profile.city,
      state: 'CA', // Default state for tests
      zip_code: '90001', // Default zip for tests
      budget_min: Math.floor(profile.budget * 0.8), // 80% of budget
      budget_max: Math.floor(profile.budget * 1.2), // 120% of budget
      children_count: profile.childrenCount,
      children_age_groups: profile.childrenAgeGroups.join(','),
      schedule_type: 'flexible', // Default schedule for tests
      move_in_date: profile.moveInDate,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return {
    id: user.id,
    email: user.email,
    verified: verified,
    idVerified: idVerified,
    backgroundCheckComplete: backgroundCheckComplete,
    phoneVerified: phoneVerified,
    profile: profile || undefined,
  };
}

/**
 * Generate JWT auth token for test user
 * Creates a VALID JWT that will pass middleware verification
 *
 * @param userId - User ID to include in token payload
 * @param email - Email to include in token payload (defaults to test email)
 * @param options - Additional options for token generation
 */
export function getAuthToken(
  userId: string,
  email: string = 'test@example.com',
  options: { expiresIn?: string } = {},
): string {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
  const expiresIn = options.expiresIn || '1h';
  const token = jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn } as jwt.SignOptions,
  );
  return token;
}

/**
 * Create a test auth token with Bearer prefix for Authorization header
 *
 * @param userId - User ID to include in token payload
 * @param email - Email to include in token payload (defaults to test email)
 */
export function getAuthHeader(userId: string, email: string = 'test@example.com'): string {
  return `Bearer ${getAuthToken(userId, email)}`;
}

/**
 * Generate an expired JWT token for testing token expiration scenarios
 */
export function getExpiredAuthToken(userId: string, email: string = 'test@example.com'): string {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
  // Create token that expired 1 hour ago
  const token = jwt.sign(
    { userId, email, exp: Math.floor(Date.now() / 1000) - 3600 },
    JWT_SECRET,
  );
  return token;
}

/**
 * Generate an invalid/malformed JWT token for testing error scenarios
 */
export function getInvalidAuthToken(): string {
  return 'invalid.token.here';
}

/**
 * Get database connection (for direct queries in tests)
 */
export function getDatabase(): Knex {
  return db;
}

/**
 * Clear all test data between tests
 */
export async function clearTestData(): Promise<void> {
  if (db) {
    await db.raw('TRUNCATE TABLE users, profiles, verifications, swipes, matches RESTART IDENTITY CASCADE');
  }
}

/**
 * Create multiple test users in bulk
 */
export async function createTestUsers(
  count: number,
  baseOptions: Partial<CreateTestUserOptions> = {},
): Promise<TestUser[]> {
  const users: TestUser[] = [];

  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      email: `test-user-${i}@example.com`,
      ...baseOptions,
      profile: baseOptions.profile
        ? {
          ...baseOptions.profile,
          firstName: `TestUser${i}`,
        }
        : undefined,
    });
    users.push(user);
  }

  return users;
}
