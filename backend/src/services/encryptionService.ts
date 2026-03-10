/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

/**
 * AES-256-GCM Encryption Service
 *
 * Provides end-to-end encryption for messages using AES-256-GCM.
 * Key features:
 * - AES-256-GCM for authenticated encryption
 * - Unique IV for each message
 * - PBKDF2 key derivation with salt
 * - Message authentication tags
 */

export interface EncryptedData {
  encryptedContent: string; // Base64 encoded
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt
  authTag: string; // Base64 encoded authentication tag
  version: 'aes-256-gcm-v1';
}

interface DecryptedData {
  content: string;
}

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 32;
  private readonly authTagLength = 16;
  private readonly version = 'aes-256-gcm-v1';

  // Master encryption key from environment (base64 encoded)
  private masterKey: Buffer;

  constructor() {
    const masterKeyEnv = process.env.ENCRYPTION_MASTER_KEY;

    if (!masterKeyEnv) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable not set');
    }

    try {
      this.masterKey = Buffer.from(masterKeyEnv, 'base64');

      if (this.masterKey.length !== this.keyLength) {
        throw new Error(`Master key must be ${this.keyLength} bytes (256 bits)`);
      }
    } catch (error) {
      throw new Error('Invalid ENCRYPTION_MASTER_KEY format. Must be base64 encoded 256-bit key');
    }
  }

  /**
   * Generate a cryptographically secure random key
   * Used for generating new master keys
   */
  static generateMasterKey(): string {
    const key = crypto.randomBytes(32); // 256 bits
    return key.toString('base64');
  }

  /**
   * Encrypt a message using AES-256-GCM
   *
   * @param plaintext - The message to encrypt
   * @returns Encrypted data with IV, salt, and auth tag
   */
  async encrypt(plaintext: string): Promise<EncryptedData> {
    try {
      // Generate unique IV and salt for this message
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);

      // Derive encryption key from master key using PBKDF2
      const derivedKey = (await scrypt(this.masterKey, salt, this.keyLength)) as Buffer;

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv, {
        authTagLength: this.authTagLength,
      });

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        encryptedContent: encrypted,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        authTag: authTag.toString('base64'),
        version: this.version,
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message using AES-256-GCM
   *
   * @param encryptedData - The encrypted data object
   * @returns Decrypted message
   * @throws Error if decryption fails or authentication fails
   */
  async decrypt(encryptedData: EncryptedData): Promise<DecryptedData> {
    try {
      // Validate version
      if (encryptedData.version !== this.version) {
        throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
      }

      // Decode from base64
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');

      // Derive the same key using the stored salt
      const derivedKey = (await scrypt(this.masterKey, salt, this.keyLength)) as Buffer;

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv, {
        authTagLength: this.authTagLength,
      });

      // Set authentication tag
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encryptedData.encryptedContent, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return { content: decrypted };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unsupported state or unable to authenticate data')
      ) {
        throw new Error('Message authentication failed - data may have been tampered with');
      }
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Encrypt file metadata (URLs, filenames, etc.)
   */
  async encryptMetadata(metadata: Record<string, any>): Promise<EncryptedData> {
    const jsonString = JSON.stringify(metadata);
    return this.encrypt(jsonString);
  }

  /**
   * Decrypt file metadata
   */
  async decryptMetadata(encryptedData: EncryptedData): Promise<Record<string, any>> {
    const decrypted = await this.decrypt(encryptedData);
    return JSON.parse(decrypted.content);
  }

  /**
   * Generate a secure hash for message verification
   */
  generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('base64');
  }

  /**
   * Verify message hash
   */
  verifyHash(data: string, hash: string): boolean {
    const computedHash = this.generateHash(data);
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'base64'), Buffer.from(hash, 'base64'));
  }

  /**
   * Generate a secure random token
   * Useful for conversation IDs, encryption key IDs, etc.
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Singleton instance
let encryptionServiceInstance: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
}

// Export for testing with custom keys
export function createEncryptionService(): EncryptionService {
  return new EncryptionService();
}
