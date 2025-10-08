"use strict";
/**
 * Encryption Utilities Unit Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const encryption_1 = require("../../src/utils/encryption");
describe('Encryption Utilities', () => {
    describe('encrypt and decrypt', () => {
        it('should encrypt and decrypt data successfully', () => {
            const plaintext = 'sensitive data';
            const encrypted = (0, encryption_1.encrypt)(plaintext);
            const decrypted = (0, encryption_1.decrypt)(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it('should produce different ciphertext for same plaintext', () => {
            const plaintext = 'test data';
            const encrypted1 = (0, encryption_1.encrypt)(plaintext);
            const encrypted2 = (0, encryption_1.encrypt)(plaintext);
            // Should be different due to random IV
            expect(encrypted1).not.toBe(encrypted2);
            // But should decrypt to same value
            expect((0, encryption_1.decrypt)(encrypted1)).toBe(plaintext);
            expect((0, encryption_1.decrypt)(encrypted2)).toBe(plaintext);
        });
        it('should handle special characters', () => {
            const plaintext = 'Test!@#$%^&*()_+-={}[]|:";\'<>?,./';
            const encrypted = (0, encryption_1.encrypt)(plaintext);
            const decrypted = (0, encryption_1.decrypt)(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it('should handle unicode characters', () => {
            const plaintext = 'Hello 世界 🌍';
            const encrypted = (0, encryption_1.encrypt)(plaintext);
            const decrypted = (0, encryption_1.decrypt)(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it('should handle long strings', () => {
            const plaintext = 'a'.repeat(10000);
            const encrypted = (0, encryption_1.encrypt)(plaintext);
            const decrypted = (0, encryption_1.decrypt)(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it('should throw error for invalid encrypted data', () => {
            expect(() => {
                (0, encryption_1.decrypt)('invalid:encrypted:data');
            }).toThrow();
        });
        it('should include key version in encrypted data', () => {
            const plaintext = 'test';
            const encrypted = (0, encryption_1.encrypt)(plaintext, 'v2');
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
            const encrypted = (0, encryption_1.encryptFields)(obj, ['ssn']);
            expect(encrypted.name).toBe('John');
            expect(encrypted.email).toBe('john@example.com');
            expect(encrypted.ssn).not.toBe('123-45-6789');
            expect(encrypted.ssn).toContain(':'); // Encrypted format
        });
        it('should decrypt specified fields only', () => {
            const obj = {
                name: 'John',
                ssn: (0, encryption_1.encrypt)('123-45-6789'),
            };
            const decrypted = (0, encryption_1.decryptFields)(obj, ['ssn']);
            expect(decrypted.name).toBe('John');
            expect(decrypted.ssn).toBe('123-45-6789');
        });
        it('should handle missing fields gracefully', () => {
            const obj = { name: 'John' };
            const encrypted = (0, encryption_1.encryptFields)(obj, ['ssn']);
            expect(encrypted).toEqual(obj);
        });
        it('should not modify original object', () => {
            const obj = { ssn: '123-45-6789' };
            const original = { ...obj };
            (0, encryption_1.encryptFields)(obj, ['ssn']);
            expect(obj).toEqual(original);
        });
    });
    describe('generateSecureToken', () => {
        it('should generate token of correct length', () => {
            const token = (0, encryption_1.generateSecureToken)(32);
            const buffer = Buffer.from(token, 'hex');
            expect(buffer.length).toBe(32);
        });
        it('should generate unique tokens', () => {
            const token1 = (0, encryption_1.generateSecureToken)();
            const token2 = (0, encryption_1.generateSecureToken)();
            expect(token1).not.toBe(token2);
        });
        it('should generate hex-encoded strings', () => {
            const token = (0, encryption_1.generateSecureToken)();
            expect(/^[0-9a-f]+$/.test(token)).toBe(true);
        });
    });
    describe('hash and verifyHash', () => {
        it('should hash data consistently', () => {
            const data = 'test data';
            const hash1 = (0, encryption_1.hash)(data);
            const hash2 = (0, encryption_1.hash)(data);
            expect(hash1).toBe(hash2);
        });
        it('should produce different hashes for different data', () => {
            const hash1 = (0, encryption_1.hash)('data1');
            const hash2 = (0, encryption_1.hash)('data2');
            expect(hash1).not.toBe(hash2);
        });
        it('should verify matching hashes', () => {
            const data = 'test data';
            const hashed = (0, encryption_1.hash)(data);
            expect((0, encryption_1.verifyHash)(data, hashed)).toBe(true);
        });
        it('should reject non-matching hashes', () => {
            const data = 'test data';
            const hashed = (0, encryption_1.hash)(data);
            expect((0, encryption_1.verifyHash)('wrong data', hashed)).toBe(false);
        });
        it('should produce 64-character hex hashes', () => {
            const hashed = (0, encryption_1.hash)('test');
            expect(hashed).toHaveLength(64);
            expect(/^[0-9a-f]+$/.test(hashed)).toBe(true);
        });
    });
});
//# sourceMappingURL=encryption.test.js.map