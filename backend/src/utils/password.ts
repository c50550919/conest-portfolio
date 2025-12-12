/**
 * Password Utility Functions (bcrypt wrapper)
 *
 * Constitution Principle III: Security
 * - bcrypt cost factor: 12 (secure against brute-force attacks)
 * - Comprehensive error handling for password operations
 * - Input validation to prevent common security issues
 */

import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export interface PasswordHashResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export interface PasswordCompareResult {
  success: boolean;
  match?: boolean;
  error?: string;
}

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password to hash
 * @returns Hashed password string
 * @throws Error if password is empty or hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }

  if (password.length > 72) {
    throw new Error('Password exceeds maximum length of 72 characters');
  }

  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Password hashing failed: ${errorMessage}`);
  }
}

/**
 * Compare a plain text password with a bcrypt hash
 * @param password - Plain text password to compare
 * @param hash - Bcrypt hash to compare against
 * @returns true if password matches hash, false otherwise
 * @throws Error if inputs are invalid or comparison fails
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }

  if (!hash || hash.trim().length === 0) {
    throw new Error('Hash cannot be empty');
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Password comparison failed: ${errorMessage}`);
  }
}

/**
 * Hash password with comprehensive error handling (non-throwing version)
 * @param password - Plain text password to hash
 * @returns Result object with success status and hash or error
 */
export async function hashPasswordSafe(password: string): Promise<PasswordHashResult> {
  try {
    const hash = await hashPassword(password);
    return {
      success: true,
      hash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Password hashing failed',
    };
  }
}

/**
 * Compare password with comprehensive error handling (non-throwing version)
 * @param password - Plain text password to compare
 * @param hash - Bcrypt hash to compare against
 * @returns Result object with success status and match result or error
 */
export async function comparePasswordSafe(
  password: string,
  hash: string,
): Promise<PasswordCompareResult> {
  try {
    const match = await comparePassword(password, hash);
    return {
      success: true,
      match,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Password comparison failed',
    };
  }
}

/**
 * Validate password hash format
 * @param hash - String to validate as bcrypt hash
 * @returns true if valid bcrypt hash format, false otherwise
 */
export function isValidBcryptHash(hash: string): boolean {
  // bcrypt hash format: $2a$10$... or $2b$12$... (60 characters)
  const bcryptRegex = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/;
  return bcryptRegex.test(hash);
}
