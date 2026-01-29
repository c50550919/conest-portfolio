/**
 * Encryption Utilities Unit Tests
 */

import {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  generateSecureToken,
  hash,
  verifyHash,
} from '../../src/utils/encryption';

describe('Encryption Utilities', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data successfully', () => {
      const plaintext = 'sensitive data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'test data';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But should decrypt to same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'Test!@#$%^&*()_+-={}[]|:";\'<>?,./';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hello 世界 🌍';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => {
        decrypt('invalid:encrypted:data');
      }).toThrow();
    });

    it('should include key version in encrypted data', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext, 'v2');

      expect(encrypted).toContain('v2:');
    });
  });

  describe('encryptFields and decryptFields', () => {
    it('should encrypt specified fields only', () => {
      const obj = {
        name: 'John',
        email: 'john@example.com',
        ssn: '123-45-6789',
      };

      const encrypted = encryptFields(obj, ['ssn']);

      expect(encrypted.name).toBe('John');
      expect(encrypted.email).toBe('john@example.com');
      expect(encrypted.ssn).not.toBe('123-45-6789');
      expect(encrypted.ssn).toContain(':'); // Encrypted format
    });

    it('should decrypt specified fields only', () => {
      const obj = {
        name: 'John',
        ssn: encrypt('123-45-6789'),
      };

      const decrypted = decryptFields(obj, ['ssn']);

      expect(decrypted.name).toBe('John');
      expect(decrypted.ssn).toBe('123-45-6789');
    });

    it('should handle missing fields gracefully', () => {
      const obj = { name: 'John' };
      const encrypted = encryptFields(obj, ['ssn']);

      expect(encrypted).toEqual(obj);
    });

    it('should not modify original object', () => {
      const obj = { ssn: '123-45-6789' };
      const original = { ...obj };

      encryptFields(obj, ['ssn']);

      expect(obj).toEqual(original);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of correct length', () => {
      const token = generateSecureToken(32);
      const buffer = Buffer.from(token, 'hex');

      expect(buffer.length).toBe(32);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate hex-encoded strings', () => {
      const token = generateSecureToken();

      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe('hash and verifyHash', () => {
    it('should hash data consistently', () => {
      const data = 'test data';
      const hash1 = hash(data);
      const hash2 = hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = hash('data1');
      const hash2 = hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should verify matching hashes', () => {
      const data = 'test data';
      const hashed = hash(data);

      expect(verifyHash(data, hashed)).toBe(true);
    });

    it('should reject non-matching hashes', () => {
      const data = 'test data';
      const hashed = hash(data);

      expect(verifyHash('wrong data', hashed)).toBe(false);
    });

    it('should produce 64-character hex hashes', () => {
      const hashed = hash('test');

      expect(hashed).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hashed)).toBe(true);
    });
  });
});
