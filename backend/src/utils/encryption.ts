/**
 * AES-256-GCM Encryption Utilities
 * Provides secure encryption/decryption for sensitive data
 */

import crypto from 'crypto';
import { securityConfig } from '../config/security';

const { algorithm, keyLength, ivLength, authTagLength: _authTagLength, saltLength, iterations, digest } = securityConfig.encryption;

/**
 * Derive encryption key from master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    iterations,
    keyLength,
    digest,
  );
}

/**
 * Get master encryption key from environment
 */
function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY not set in environment');
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_MASTER_KEY must be at least 32 characters');
  }
  return key;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @param keyVersion - Optional key version for key rotation support
 * @returns Encrypted data with salt, IV, authTag, and ciphertext
 */
export function encrypt(plaintext: string, keyVersion: string = 'v1'): string {
  try {
    const masterKey = getMasterKey();

    // Generate random salt and IV
    const salt = crypto.randomBytes(saltLength);
    const iv = crypto.randomBytes(ivLength);

    // Derive encryption key
    const key = deriveKey(masterKey, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    // Encrypt data
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine all components: keyVersion:salt:iv:authTag:ciphertext
    const encrypted = [
      keyVersion,
      salt.toString('hex'),
      iv.toString('hex'),
      authTag.toString('hex'),
      ciphertext,
    ].join(':');

    return encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 * @param encrypted - Encrypted data string
 * @returns Decrypted plaintext
 */
export function decrypt(encrypted: string): string {
  try {
    const masterKey = getMasterKey();

    // Split components
    const parts = encrypted.split(':');
    if (parts.length !== 5) {
      throw new Error('Invalid encrypted data format');
    }

    const [_keyVersion, saltHex, ivHex, authTagHex, ciphertext] = parts;

    // Convert from hex
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Derive decryption key
    const key = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt object fields selectively
 * @param obj - Object to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: string[],
): T {
  const result = { ...obj } as any;

  for (const field of fieldsToEncrypt) {
    if (field in result && result[field]) {
      result[field] = encrypt(String(result[field]));
    }
  }

  return result as T;
}

/**
 * Decrypt object fields selectively
 * @param obj - Object to decrypt
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: string[],
): T {
  const result = { ...obj } as any;

  for (const field of fieldsToDecrypt) {
    if (field in result && result[field]) {
      try {
        result[field] = decrypt(String(result[field]));
      } catch (error) {
        // If decryption fails, keep original value (might not be encrypted)
        console.error('Failed to decrypt field', `${field  }:`, error);
      }
    }
  }

  return result as T;
}

/**
 * Generate secure random token
 * @param length - Token length in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash data using SHA-256
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compare hash with data
 * @param data - Original data
 * @param hashedData - Hash to compare against
 * @returns True if match
 */
export function verifyHash(data: string, hashedData: string): boolean {
  return hash(data) === hashedData;
}

/**
 * Encrypt a note with separate IV for database storage
 * Used for SavedProfile and ConnectionRequest notes
 * @param plaintext - Note text to encrypt
 * @returns Object with encrypted text and IV
 */
export function encryptNote(plaintext: string): { encrypted: string; iv: string } {
  try {
    const masterKey = getMasterKey();
    const salt = crypto.randomBytes(saltLength);
    const iv = crypto.randomBytes(ivLength);
    const key = deriveKey(masterKey, salt);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: salt:authTag:ciphertext (IV stored separately)
    const encrypted = [
      salt.toString('hex'),
      authTag.toString('hex'),
      ciphertext,
    ].join(':');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  } catch (error) {
    throw new Error(`Note encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt a note using encrypted text and IV
 * Used for SavedProfile and ConnectionRequest notes
 * @param encrypted - Encrypted note text
 * @param ivHex - Initialization vector (hex string)
 * @returns Decrypted plaintext
 */
export function decryptNote(encrypted: string, ivHex: string): string {
  try {
    const masterKey = getMasterKey();

    // Split components: salt:authTag:ciphertext
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted note format');
    }

    const [saltHex, authTagHex, ciphertext] = parts;

    // Convert from hex
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Derive decryption key
    const key = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    throw new Error(`Note decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
