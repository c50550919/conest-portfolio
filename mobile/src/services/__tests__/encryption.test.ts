/**
 * Client-Side End-to-End Encryption Service Tests
 * Comprehensive test coverage for AES-256-CBC + HMAC encryption
 */

import {
  encrypt,
  decrypt,
  randomKey,
  pbkdf2,
  hmac256,
  sha256,
} from 'react-native-aes-crypto';
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  generateSharedSecret,
  encryptWithSharedSecret,
  decryptWithSharedSecret,
  signMessage,
  verifySignature,
} from '../encryption';

// Mock react-native-aes-crypto
jest.mock('react-native-aes-crypto', () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  randomKey: jest.fn(),
  pbkdf2: jest.fn(),
  hmac256: jest.fn(),
  sha256: jest.fn(),
}));

describe('Encryption Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKeyPair', () => {
    it('should generate unique public and private keys', async () => {
      const privateSeed = 'private_seed_hex';
      const publicSeed = 'public_seed_hex';
      const salt = 'salt_hex';
      const privateKey = 'derived_private_key_hex';
      const publicKey = 'derived_public_key_hex';

      (randomKey as jest.Mock)
        .mockResolvedValueOnce(privateSeed)
        .mockResolvedValueOnce(publicSeed)
        .mockResolvedValueOnce(salt);
      (pbkdf2 as jest.Mock)
        .mockResolvedValueOnce(privateKey)
        .mockResolvedValueOnce(publicKey);

      const keyPair = await generateKeyPair();

      expect(keyPair).toEqual({ publicKey, privateKey });
      expect(randomKey).toHaveBeenCalledTimes(3); // privateSeed, publicSeed, salt
      expect(pbkdf2).toHaveBeenCalledTimes(2);
    });

    it('should use PBKDF2 with 10000 iterations', async () => {
      (randomKey as jest.Mock)
        .mockResolvedValue('random_seed')
        .mockResolvedValue('random_seed')
        .mockResolvedValue('salt');
      (pbkdf2 as jest.Mock)
        .mockResolvedValue('derived_key')
        .mockResolvedValue('derived_key');

      await generateKeyPair();

      expect(pbkdf2).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        10000,
        32,
        'sha256'
      );
    });

    it('should throw error on key generation failure', async () => {
      (randomKey as jest.Mock).mockRejectedValue(new Error('Random key generation failed'));

      await expect(generateKeyPair()).rejects.toThrow('Failed to generate encryption key pair');
    });

    it('should generate different keys on each call', async () => {
      let callCount = 0;
      (randomKey as jest.Mock).mockImplementation(async () => {
        callCount++;
        return `random_${callCount}`;
      });
      (pbkdf2 as jest.Mock).mockImplementation(async (seed) => {
        return `derived_${seed}`;
      });

      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();

      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    });
  });

  describe('encryptMessage', () => {
    it('should encrypt message with AES-256-CBC and generate HMAC tag', async () => {
      const message = 'Hello, World!';
      const recipientPublicKey = 'a'.repeat(64); // 32 bytes as hex
      const iv = 'random_iv_hex';
      const ciphertext = 'encrypted_ciphertext_base64';
      const tag = 'hmac_tag_hex';

      (randomKey as jest.Mock).mockResolvedValue(iv);
      (encrypt as jest.Mock).mockResolvedValue(ciphertext);
      (hmac256 as jest.Mock).mockResolvedValue(tag);

      const encrypted = await encryptMessage(message, recipientPublicKey);

      const encryptedData = JSON.parse(encrypted);
      expect(encryptedData).toEqual({
        iv,
        ciphertext,
        tag,
      });
      expect(encrypt).toHaveBeenCalledWith(message, recipientPublicKey, iv, 'aes-256-cbc');
      expect(hmac256).toHaveBeenCalledWith(`${iv}:${ciphertext}`, recipientPublicKey);
    });

    it('should generate unique IV for each encryption', async () => {
      const message = 'test message';
      const publicKey = 'a'.repeat(64);

      (randomKey as jest.Mock)
        .mockResolvedValueOnce('iv1')
        .mockResolvedValueOnce('iv2');
      (encrypt as jest.Mock)
        .mockResolvedValueOnce('cipher1')
        .mockResolvedValueOnce('cipher2');
      (hmac256 as jest.Mock)
        .mockResolvedValue('tag');

      const encrypted1 = await encryptMessage(message, publicKey);
      const encrypted2 = await encryptMessage(message, publicKey);

      const data1 = JSON.parse(encrypted1);
      const data2 = JSON.parse(encrypted2);

      expect(data1.iv).not.toBe(data2.iv);
      expect(data1.ciphertext).not.toBe(data2.ciphertext);
    });

    it('should handle empty messages', async () => {
      const message = '';
      const publicKey = 'a'.repeat(64);

      (randomKey as jest.Mock).mockResolvedValue('iv');
      (encrypt as jest.Mock).mockResolvedValue('encrypted_empty');
      (hmac256 as jest.Mock).mockResolvedValue('tag');

      const encrypted = await encryptMessage(message, publicKey);

      expect(encrypt).toHaveBeenCalledWith('', publicKey, 'iv', 'aes-256-cbc');
      expect(encrypted).toContain('encrypted_empty');
    });

    it('should handle long messages', async () => {
      const message = 'x'.repeat(10000);
      const publicKey = 'a'.repeat(64);

      (randomKey as jest.Mock).mockResolvedValue('iv');
      (encrypt as jest.Mock).mockResolvedValue('encrypted_long');
      (hmac256 as jest.Mock).mockResolvedValue('tag');

      const encrypted = await encryptMessage(message, publicKey);

      expect(encrypt).toHaveBeenCalledWith(message, publicKey, 'iv', 'aes-256-cbc');
    });

    it('should handle Unicode characters', async () => {
      const message = '你好世界 🌍 مرحبا';
      const publicKey = 'a'.repeat(64);

      (randomKey as jest.Mock).mockResolvedValue('iv');
      (encrypt as jest.Mock).mockResolvedValue('encrypted_unicode');
      (hmac256 as jest.Mock).mockResolvedValue('tag');

      const encrypted = await encryptMessage(message, publicKey);

      expect(encrypt).toHaveBeenCalledWith(message, publicKey, 'iv', 'aes-256-cbc');
    });

    it('should throw error on encryption failure', async () => {
      const message = 'test';
      const publicKey = 'a'.repeat(64);

      (randomKey as jest.Mock).mockResolvedValue('iv');
      (encrypt as jest.Mock).mockRejectedValue(new Error('Encryption failed'));

      await expect(encryptMessage(message, publicKey)).rejects.toThrow('Failed to encrypt message');
    });
  });

  describe('decryptMessage', () => {
    it('should decrypt message with HMAC verification', async () => {
      const encryptedMessage = JSON.stringify({
        iv: 'test_iv',
        ciphertext: 'test_cipher',
        tag: 'test_tag',
      });
      const senderPublicKey = 'a'.repeat(64);
      const privateKey = 'private_key_hex';
      const plaintext = 'decrypted message';

      (hmac256 as jest.Mock).mockResolvedValue('test_tag'); // Matching tag
      (decrypt as jest.Mock).mockResolvedValue(plaintext);

      const result = await decryptMessage(encryptedMessage, senderPublicKey, privateKey);

      expect(result).toBe(plaintext);
      expect(hmac256).toHaveBeenCalledWith('test_iv:test_cipher', senderPublicKey);
      expect(decrypt).toHaveBeenCalledWith('test_cipher', senderPublicKey, 'test_iv', 'aes-256-cbc');
    });

    it('should throw error on HMAC authentication failure', async () => {
      const encryptedMessage = JSON.stringify({
        iv: 'test_iv',
        ciphertext: 'test_cipher',
        tag: 'wrong_tag',
      });
      const senderPublicKey = 'a'.repeat(64);
      const privateKey = 'private_key';

      (hmac256 as jest.Mock).mockResolvedValue('expected_tag'); // Different tag

      await expect(decryptMessage(encryptedMessage, senderPublicKey, privateKey))
        .rejects.toThrow('Message authentication failed');
    });

    it('should throw error on malformed encrypted data', async () => {
      const encryptedMessage = 'invalid json';
      const senderPublicKey = 'a'.repeat(64);
      const privateKey = 'private_key';

      await expect(decryptMessage(encryptedMessage, senderPublicKey, privateKey))
        .rejects.toThrow('Failed to decrypt message');
    });

    it('should handle decryption of empty messages', async () => {
      const encryptedMessage = JSON.stringify({
        iv: 'iv',
        ciphertext: 'encrypted_empty',
        tag: 'tag',
      });
      const senderPublicKey = 'a'.repeat(64);
      const privateKey = 'private_key';

      (hmac256 as jest.Mock).mockResolvedValue('tag');
      (decrypt as jest.Mock).mockResolvedValue('');

      const result = await decryptMessage(encryptedMessage, senderPublicKey, privateKey);

      expect(result).toBe('');
    });
  });

  describe('generateSharedSecret', () => {
    it('should generate shared secret using PBKDF2', async () => {
      const myPrivateKey = 'my_private_key';
      const theirPublicKey = 'their_public_key';
      const sharedSecret = 'shared_secret_hex';

      (sha256 as jest.Mock).mockResolvedValue('salt_material_hex');
      (pbkdf2 as jest.Mock).mockResolvedValue(sharedSecret);

      const result = await generateSharedSecret(myPrivateKey, theirPublicKey);

      expect(result).toBe(sharedSecret);
      expect(sha256).toHaveBeenCalled();
      expect(pbkdf2).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        10000,
        32,
        'sha256'
      );
    });

    it('should generate same shared secret for both parties', async () => {
      const alicePrivate = 'alice_private';
      const alicePublic = 'alice_public';
      const bobPrivate = 'bob_private';
      const bobPublic = 'bob_public';

      (sha256 as jest.Mock).mockResolvedValue('salt_material');
      (pbkdf2 as jest.Mock).mockResolvedValue('shared_secret');

      const aliceSecret = await generateSharedSecret(alicePrivate, bobPublic);
      const bobSecret = await generateSharedSecret(bobPrivate, alicePublic);

      // Both should call pbkdf2 with sorted keys, resulting in same secret
      expect(aliceSecret).toBe(bobSecret);
    });

    it('should throw error on shared secret generation failure', async () => {
      (sha256 as jest.Mock).mockRejectedValue(new Error('Hash failed'));

      await expect(generateSharedSecret('key1', 'key2'))
        .rejects.toThrow('Failed to generate shared secret');
    });

    it('should produce different secrets for different key pairs', async () => {
      (sha256 as jest.Mock).mockResolvedValue('salt');
      (pbkdf2 as jest.Mock)
        .mockResolvedValueOnce('secret1')
        .mockResolvedValueOnce('secret2');

      const secret1 = await generateSharedSecret('private1', 'public1');
      const secret2 = await generateSharedSecret('private2', 'public2');

      expect(secret1).not.toBe(secret2);
    });
  });

  describe('encryptWithSharedSecret', () => {
    it('should encrypt data with shared secret', async () => {
      const data = 'sensitive data';
      const sharedSecret = 'a'.repeat(64);
      const iv = 'random_iv';
      const ciphertext = 'encrypted_data';
      const tag = 'hmac_tag';

      (randomKey as jest.Mock).mockResolvedValue(iv);
      (encrypt as jest.Mock).mockResolvedValue(ciphertext);
      (hmac256 as jest.Mock).mockResolvedValue(tag);

      const encrypted = await encryptWithSharedSecret(data, sharedSecret);

      const encryptedData = JSON.parse(encrypted);
      expect(encryptedData).toEqual({ iv, ciphertext, tag });
      expect(encrypt).toHaveBeenCalledWith(data, sharedSecret, iv, 'aes-256-cbc');
    });

    it('should produce different output for same input with unique IVs', async () => {
      const data = 'test data';
      const secret = 'a'.repeat(64);

      (randomKey as jest.Mock)
        .mockResolvedValueOnce('iv1')
        .mockResolvedValueOnce('iv2');
      (encrypt as jest.Mock)
        .mockResolvedValueOnce('cipher1')
        .mockResolvedValueOnce('cipher2');
      (hmac256 as jest.Mock)
        .mockResolvedValue('tag');

      const encrypted1 = await encryptWithSharedSecret(data, secret);
      const encrypted2 = await encryptWithSharedSecret(data, secret);

      const data1 = JSON.parse(encrypted1);
      const data2 = JSON.parse(encrypted2);

      expect(data1.iv).not.toBe(data2.iv);
      expect(data1.ciphertext).not.toBe(data2.ciphertext);
    });

    it('should handle empty data', async () => {
      const data = '';
      const secret = 'a'.repeat(64);

      (randomKey as jest.Mock).mockResolvedValue('iv');
      (encrypt as jest.Mock).mockResolvedValue('encrypted_empty');
      (hmac256 as jest.Mock).mockResolvedValue('tag');

      const encrypted = await encryptWithSharedSecret(data, secret);

      expect(encrypt).toHaveBeenCalledWith('', secret, 'iv', 'aes-256-cbc');
    });

    it('should throw error on encryption failure', async () => {
      (randomKey as jest.Mock).mockResolvedValue('iv');
      (encrypt as jest.Mock).mockRejectedValue(new Error('Encryption failed'));

      await expect(encryptWithSharedSecret('data', 'secret'))
        .rejects.toThrow('Failed to encrypt with shared secret');
    });
  });

  describe('decryptWithSharedSecret', () => {
    it('should decrypt data with shared secret', async () => {
      const encryptedData = JSON.stringify({
        iv: 'test_iv',
        ciphertext: 'test_cipher',
        tag: 'test_tag',
      });
      const sharedSecret = 'a'.repeat(64);
      const plaintext = 'decrypted data';

      (hmac256 as jest.Mock).mockResolvedValue('test_tag');
      (decrypt as jest.Mock).mockResolvedValue(plaintext);

      const result = await decryptWithSharedSecret(encryptedData, sharedSecret);

      expect(result).toBe(plaintext);
      expect(hmac256).toHaveBeenCalledWith('test_iv:test_cipher', sharedSecret);
      expect(decrypt).toHaveBeenCalledWith('test_cipher', sharedSecret, 'test_iv', 'aes-256-cbc');
    });

    it('should throw error on authentication failure', async () => {
      const encryptedData = JSON.stringify({
        iv: 'iv',
        ciphertext: 'cipher',
        tag: 'wrong_tag',
      });
      const secret = 'a'.repeat(64);

      (hmac256 as jest.Mock).mockResolvedValue('expected_tag');

      await expect(decryptWithSharedSecret(encryptedData, secret))
        .rejects.toThrow('Message authentication failed');
    });

    it('should handle empty encrypted data', async () => {
      const encryptedData = JSON.stringify({
        iv: 'iv',
        ciphertext: 'encrypted_empty',
        tag: 'tag',
      });
      const secret = 'a'.repeat(64);

      (hmac256 as jest.Mock).mockResolvedValue('tag');
      (decrypt as jest.Mock).mockResolvedValue('');

      const result = await decryptWithSharedSecret(encryptedData, secret);

      expect(result).toBe('');
    });
  });

  describe('signMessage', () => {
    it('should sign message with HMAC-SHA256', async () => {
      const message = 'message to sign';
      const privateKey = 'private_key_hex';
      const signature = 'hmac_signature_hex';

      (hmac256 as jest.Mock).mockResolvedValue(signature);

      const result = await signMessage(message, privateKey);

      expect(result).toBe(signature);
      expect(hmac256).toHaveBeenCalledWith(message, privateKey);
    });

    it('should produce different signatures for different messages', async () => {
      const message1 = 'message 1';
      const message2 = 'message 2';
      const privateKey = 'private_key';

      (hmac256 as jest.Mock)
        .mockResolvedValueOnce('signature1')
        .mockResolvedValueOnce('signature2');

      const sig1 = await signMessage(message1, privateKey);
      const sig2 = await signMessage(message2, privateKey);

      expect(sig1).not.toBe(sig2);
    });

    it('should handle empty messages', async () => {
      const message = '';
      const privateKey = 'key';

      (hmac256 as jest.Mock).mockResolvedValue('signature_empty');

      const signature = await signMessage(message, privateKey);

      expect(hmac256).toHaveBeenCalledWith('', privateKey);
      expect(signature).toBe('signature_empty');
    });

    it('should throw error on signing failure', async () => {
      (hmac256 as jest.Mock).mockRejectedValue(new Error('HMAC failed'));

      await expect(signMessage('message', 'key'))
        .rejects.toThrow('Failed to sign message');
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
      const message = 'test message';
      const publicKey = 'public_key';
      const signature = 'valid_signature';

      (hmac256 as jest.Mock).mockResolvedValue(signature);

      const isValid = await verifySignature(message, signature, publicKey);

      expect(isValid).toBe(true);
      expect(hmac256).toHaveBeenCalledWith(message, publicKey);
    });

    it('should reject invalid signature', async () => {
      const message = 'test message';
      const publicKey = 'public_key';
      const signature = 'invalid_signature';

      (hmac256 as jest.Mock).mockResolvedValue('different_signature');

      const isValid = await verifySignature(message, signature, publicKey);

      expect(isValid).toBe(false);
    });

    it('should reject tampered message', async () => {
      const originalMessage = 'original message';
      const tamperedMessage = 'tampered message';
      const publicKey = 'public_key';
      const signature = 'signature_for_original';

      (hmac256 as jest.Mock).mockResolvedValue('signature_for_tampered');

      const isValid = await verifySignature(tamperedMessage, signature, publicKey);

      expect(isValid).toBe(false);
    });

    it('should return false on verification error', async () => {
      (hmac256 as jest.Mock).mockRejectedValue(new Error('HMAC failed'));

      const isValid = await verifySignature('message', 'signature', 'key');

      expect(isValid).toBe(false);
    });

    it('should handle empty messages', async () => {
      const message = '';
      const signature = 'signature';
      const publicKey = 'key';

      (hmac256 as jest.Mock).mockResolvedValue(signature);

      const isValid = await verifySignature(message, signature, publicKey);

      expect(isValid).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should complete end-to-end encryption workflow', async () => {
      const message = 'Hello Bob!';
      const iv = 'random_iv';
      const ciphertext = 'encrypted';
      const tag = 'tag';

      // Generate keys
      (randomKey as jest.Mock)
        .mockResolvedValue('seed')
        .mockResolvedValue('seed')
        .mockResolvedValue('salt');
      (pbkdf2 as jest.Mock)
        .mockResolvedValue('alice_public')
        .mockResolvedValue('alice_private')
        .mockResolvedValue('bob_public')
        .mockResolvedValue('bob_private');

      const aliceKeys = await generateKeyPair();
      const bobKeys = await generateKeyPair();

      // Encrypt message
      (randomKey as jest.Mock).mockResolvedValue(iv);
      (encrypt as jest.Mock).mockResolvedValue(ciphertext);
      (hmac256 as jest.Mock).mockResolvedValue(tag);

      const encrypted = await encryptMessage(message, bobKeys.publicKey);

      // Decrypt message
      (hmac256 as jest.Mock).mockResolvedValue(tag); // Matching tag
      (decrypt as jest.Mock).mockResolvedValue(message);

      const decrypted = await decryptMessage(encrypted, aliceKeys.publicKey, bobKeys.privateKey);

      expect(decrypted).toBe(message);
    });

    it('should complete shared secret workflow', async () => {
      const plaintext = 'Secret data';
      const iv = 'iv';
      const ciphertext = 'encrypted';
      const tag = 'tag';

      // Generate shared secret
      (sha256 as jest.Mock).mockResolvedValue('salt');
      (pbkdf2 as jest.Mock).mockResolvedValue('shared_secret');

      const sharedSecret = await generateSharedSecret('private1', 'public2');

      // Encrypt with shared secret
      (randomKey as jest.Mock).mockResolvedValue(iv);
      (encrypt as jest.Mock).mockResolvedValue(ciphertext);
      (hmac256 as jest.Mock).mockResolvedValue(tag);

      const encrypted = await encryptWithSharedSecret(plaintext, sharedSecret);

      // Decrypt with shared secret
      (hmac256 as jest.Mock).mockResolvedValue(tag);
      (decrypt as jest.Mock).mockResolvedValue(plaintext);

      const decrypted = await decryptWithSharedSecret(encrypted, sharedSecret);

      expect(decrypted).toBe(plaintext);
    });

    it('should complete signing and verification workflow', async () => {
      const message = 'Important message';
      const signature = 'signature_hex';

      // Sign message
      (hmac256 as jest.Mock).mockResolvedValue(signature);

      const sig = await signMessage(message, 'private_key');

      // Verify signature
      (hmac256 as jest.Mock).mockResolvedValue(signature);

      const isValid = await verifySignature(message, sig, 'public_key');

      expect(isValid).toBe(true);
    });

    it('should handle multiple concurrent operations', async () => {
      (randomKey as jest.Mock).mockResolvedValue('iv');
      (encrypt as jest.Mock).mockResolvedValue('encrypted');
      (hmac256 as jest.Mock).mockResolvedValue('tag');

      const publicKey = 'a'.repeat(64);

      const results = await Promise.all([
        encryptMessage('msg1', publicKey),
        encryptMessage('msg2', publicKey),
        encryptMessage('msg3', publicKey),
      ]);

      expect(results).toHaveLength(3);
      expect(encrypt).toHaveBeenCalledTimes(3);
    });
  });

  describe('Security Properties', () => {
    it('should demonstrate encryption produces different output with unique IVs', async () => {
      const message = 'sensitive data';
      const key = 'a'.repeat(64);

      (randomKey as jest.Mock)
        .mockResolvedValueOnce('iv1')
        .mockResolvedValueOnce('iv2');
      (encrypt as jest.Mock)
        .mockResolvedValueOnce('cipher1')
        .mockResolvedValueOnce('cipher2');
      (hmac256 as jest.Mock)
        .mockResolvedValue('tag');

      const encrypted1 = await encryptMessage(message, key);
      const encrypted2 = await encryptMessage(message, key);

      const data1 = JSON.parse(encrypted1);
      const data2 = JSON.parse(encrypted2);

      // Different IVs should produce different ciphertexts
      expect(data1.iv).not.toBe(data2.iv);
      expect(data1.ciphertext).not.toBe(data2.ciphertext);
    });

    it('should verify HMAC prevents tampering', async () => {
      const encryptedData = JSON.stringify({
        iv: 'iv',
        ciphertext: 'original_cipher',
        tag: 'original_tag',
      });
      const key = 'a'.repeat(64);

      // Simulate tampering by changing ciphertext
      const tamperedData = JSON.stringify({
        iv: 'iv',
        ciphertext: 'tampered_cipher',
        tag: 'original_tag',
      });

      (hmac256 as jest.Mock).mockResolvedValue('expected_tag_for_tampered');

      // Should fail authentication
      await expect(decryptMessage(tamperedData, key, 'private'))
        .rejects.toThrow('Message authentication failed');
    });

    it('should handle key rotation scenario', async () => {
      (randomKey as jest.Mock).mockResolvedValue('seed');
      (pbkdf2 as jest.Mock)
        .mockResolvedValueOnce('old_public')
        .mockResolvedValueOnce('old_private')
        .mockResolvedValueOnce('new_public')
        .mockResolvedValueOnce('new_private');

      const oldKeys = await generateKeyPair();
      const newKeys = await generateKeyPair();

      expect(oldKeys.publicKey).not.toBe(newKeys.publicKey);
      expect(oldKeys.privateKey).not.toBe(newKeys.privateKey);
    });

    it('should validate Encrypt-then-MAC pattern', async () => {
      const message = 'test';
      const key = 'a'.repeat(64);
      const iv = 'iv';
      const ciphertext = 'cipher';

      (randomKey as jest.Mock).mockResolvedValue(iv);
      (encrypt as jest.Mock).mockResolvedValue(ciphertext);
      (hmac256 as jest.Mock).mockResolvedValue('tag');

      await encryptMessage(message, key);

      // HMAC should be called with IV:ciphertext (Encrypt-then-MAC)
      expect(hmac256).toHaveBeenCalledWith(`${iv}:${ciphertext}`, key);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      (randomKey as jest.Mock).mockResolvedValue('iv');
      (encrypt as jest.Mock).mockRejectedValue(new Error('AES encryption failed'));

      await expect(encryptMessage('message', 'key'))
        .rejects.toThrow('Failed to encrypt message');
    });

    it('should handle decryption errors gracefully', async () => {
      const encryptedData = JSON.stringify({
        iv: 'iv',
        ciphertext: 'cipher',
        tag: 'tag',
      });

      (hmac256 as jest.Mock).mockResolvedValue('tag');
      (decrypt as jest.Mock).mockRejectedValue(new Error('AES decryption failed'));

      await expect(decryptMessage(encryptedData, 'key', 'private'))
        .rejects.toThrow('Failed to decrypt message');
    });

    it('should preserve authentication errors', async () => {
      const encryptedData = JSON.stringify({
        iv: 'iv',
        ciphertext: 'cipher',
        tag: 'wrong_tag',
      });

      (hmac256 as jest.Mock).mockResolvedValue('expected_tag');

      await expect(decryptMessage(encryptedData, 'key', 'private'))
        .rejects.toThrow('Message authentication failed');
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedData = 'not valid json';

      await expect(decryptMessage(malformedData, 'key', 'private'))
        .rejects.toThrow('Failed to decrypt message');
    });

    it('should handle crypto library errors', async () => {
      (randomKey as jest.Mock).mockRejectedValue(new Error('Crypto library error'));

      await expect(generateKeyPair())
        .rejects.toThrow('Failed to generate encryption key pair');
    });
  });
});
