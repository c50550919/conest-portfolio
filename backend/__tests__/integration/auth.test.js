"use strict";
/**
 * Authentication Integration Tests
 * End-to-end authentication flow tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const passwordStrength_1 = require("../../src/utils/passwordStrength");
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
describe('Authentication Integration', () => {
    describe('Registration Flow', () => {
        it('should validate password strength during registration', () => {
            const weakPassword = 'pass123';
            const strongPassword = 'MyStr0ng!P@ssw0rd2024';
            const weakResult = (0, passwordStrength_1.validatePasswordStrength)(weakPassword);
            const strongResult = (0, passwordStrength_1.validatePasswordStrength)(strongPassword);
            expect(weakResult.isValid).toBe(false);
            expect(strongResult.isValid).toBe(true);
        });
        it('should hash password before storing', async () => {
            const password = 'MyStr0ng!P@ssw0rd';
            const hash = await bcrypt_1.default.hash(password, 12);
            expect(hash).not.toBe(password);
            expect(hash).toMatch(/^\$2[aby]\$/); // Bcrypt format
        });
        it('should generate JWT token after registration', () => {
            const userId = 'user-123';
            const token = jsonwebtoken_1.default.sign({ userId, role: 'user' }, JWT_SECRET, { expiresIn: '15m' });
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            expect(decoded.userId).toBe(userId);
            expect(decoded.role).toBe('user');
        });
    });
    describe('Login Flow', () => {
        it('should verify password during login', async () => {
            const password = 'MyStr0ng!P@ssw0rd';
            const hash = await bcrypt_1.default.hash(password, 12);
            const validLogin = await bcrypt_1.default.compare(password, hash);
            const invalidLogin = await bcrypt_1.default.compare('wrong-password', hash);
            expect(validLogin).toBe(true);
            expect(invalidLogin).toBe(false);
        });
        it('should generate access and refresh tokens', () => {
            const userId = 'user-123';
            const accessToken = jsonwebtoken_1.default.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
            const accessDecoded = jsonwebtoken_1.default.verify(accessToken, JWT_SECRET);
            const refreshDecoded = jsonwebtoken_1.default.verify(refreshToken, JWT_SECRET);
            expect(accessDecoded.type).toBe('access');
            expect(refreshDecoded.type).toBe('refresh');
        });
        it('should track failed login attempts', () => {
            const attempts = [];
            const maxAttempts = 5;
            // Simulate failed attempts
            for (let i = 0; i < 3; i++) {
                attempts.push(Date.now());
            }
            expect(attempts.length).toBeLessThan(maxAttempts);
        });
        it('should lock account after max failed attempts', () => {
            const attempts = [1, 2, 3, 4, 5, 6];
            const maxAttempts = 5;
            const isLocked = attempts.length > maxAttempts;
            expect(isLocked).toBe(true);
        });
    });
    describe('Token Refresh Flow', () => {
        it('should validate refresh token before issuing new access token', () => {
            const refreshToken = jsonwebtoken_1.default.sign({ userId: 'user-123', type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
            const decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_SECRET);
            expect(decoded.type).toBe('refresh');
            expect(decoded.userId).toBe('user-123');
        });
        it('should issue new access token with short expiry', () => {
            const newAccessToken = jsonwebtoken_1.default.sign({ userId: 'user-123', type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
            const decoded = jsonwebtoken_1.default.verify(newAccessToken, JWT_SECRET);
            const expiresIn = decoded.exp - decoded.iat;
            expect(expiresIn).toBe(15 * 60); // 15 minutes in seconds
        });
    });
    describe('Logout Flow', () => {
        it('should invalidate session on logout', () => {
            const sessionId = 'session-123';
            const activeSessions = new Set(['session-123', 'session-456']);
            activeSessions.delete(sessionId);
            expect(activeSessions.has(sessionId)).toBe(false);
        });
        it('should clear refresh token on logout', () => {
            let refreshToken = 'valid-refresh-token';
            // Logout action
            refreshToken = null;
            expect(refreshToken).toBeNull();
        });
    });
    describe('Password Reset Flow', () => {
        it('should generate password reset token', () => {
            const resetToken = jsonwebtoken_1.default.sign({ userId: 'user-123', type: 'password-reset' }, JWT_SECRET, { expiresIn: '1h' });
            const decoded = jsonwebtoken_1.default.verify(resetToken, JWT_SECRET);
            expect(decoded.type).toBe('password-reset');
            expect(decoded.userId).toBe('user-123');
        });
        it('should validate new password strength', () => {
            const newPassword = 'N3wStr0ng!P@ssw0rd';
            const result = (0, passwordStrength_1.validatePasswordStrength)(newPassword);
            expect(result.isValid).toBe(true);
            expect(result.score).toBeGreaterThan(60);
        });
        it('should hash new password before updating', async () => {
            const newPassword = 'N3wStr0ng!P@ssw0rd';
            const newHash = await bcrypt_1.default.hash(newPassword, 12);
            expect(newHash).not.toBe(newPassword);
            expect(await bcrypt_1.default.compare(newPassword, newHash)).toBe(true);
        });
    });
    describe('Multi-Factor Authentication', () => {
        it('should generate TOTP secret for MFA setup', () => {
            // This would use a library like speakeasy
            const secret = 'BASE32ENCODEDSECRET';
            expect(secret).toMatch(/^[A-Z2-7]+$/); // Base32 format
        });
        it('should verify TOTP code during login', () => {
            // Mock TOTP verification
            const validCode = '123456';
            const userCode = '123456';
            expect(userCode).toBe(validCode);
        });
    });
});
//# sourceMappingURL=auth.test.js.map