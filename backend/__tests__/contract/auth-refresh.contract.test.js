"use strict";
/**
 * T015: Contract Test - POST /api/auth/refresh
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
const User_1 = require("../../src/models/User");
const redis_1 = __importDefault(require("../../src/config/redis"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/config/redis');
describe('POST /api/auth/refresh - Contract Tests', () => {
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Success Cases', () => {
        it('should refresh access token with valid refresh token and return 200', async () => {
            const userId = 'user-123';
            const refreshToken = jsonwebtoken_1.default.sign({ userId, email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            redis_1.default.get.mockResolvedValue(refreshToken);
            User_1.UserModel.findById.mockResolvedValue(mockUser);
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken,
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
            expect(response.body.data).toHaveProperty('expiresIn');
        });
        it('should implement refresh token rotation (return new refresh token)', async () => {
            const userId = 'user-123';
            const oldRefreshToken = jsonwebtoken_1.default.sign({ userId, email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            redis_1.default.get.mockResolvedValue(oldRefreshToken);
            User_1.UserModel.findById.mockResolvedValue(mockUser);
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: oldRefreshToken,
            });
            // New refresh token should be different from old one
            expect(response.body.data.refreshToken).not.toBe(oldRefreshToken);
            // Should store new refresh token in Redis
            expect(redis_1.default.setex).toHaveBeenCalled();
        });
    });
    describe('Validation Error Cases', () => {
        it('should return 400 for missing refresh token', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for empty refresh token', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: '',
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('Authentication Error Cases', () => {
        it('should return 401 for invalid refresh token format', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: 'invalid.token.format',
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid or expired refresh token');
        });
        it('should return 401 for expired refresh token', async () => {
            const expiredToken = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '-1s' });
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: expiredToken,
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid or expired refresh token');
        });
        it('should return 401 for token signed with wrong secret', async () => {
            const invalidToken = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com' }, 'wrong-secret', { expiresIn: '7d' });
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: invalidToken,
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 401 for token not found in Redis', async () => {
            const validToken = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            redis_1.default.get.mockResolvedValue(null);
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: validToken,
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid or expired refresh token');
        });
        it('should return 401 for token mismatch in Redis', async () => {
            const clientToken = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            const differentToken = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            redis_1.default.get.mockResolvedValue(differentToken);
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: clientToken,
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 401 for non-existent user', async () => {
            const validToken = jsonwebtoken_1.default.sign({ userId: 'user-nonexistent', email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            redis_1.default.get.mockResolvedValue(validToken);
            User_1.UserModel.findById.mockResolvedValue(null);
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: validToken,
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid or expired refresh token');
        });
        it('should return 401 for inactive user', async () => {
            const validToken = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            const inactiveUser = {
                id: 'user-123',
                email: 'test@example.com',
                status: 'suspended',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
            };
            redis_1.default.get.mockResolvedValue(validToken);
            User_1.UserModel.findById.mockResolvedValue(inactiveUser);
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: validToken,
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('Response Schema Validation', () => {
        it('should return correct response structure on success', async () => {
            const userId = 'user-123';
            const refreshToken = jsonwebtoken_1.default.sign({ userId, email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            redis_1.default.get.mockResolvedValue(refreshToken);
            User_1.UserModel.findById.mockResolvedValue(mockUser);
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken,
            });
            expect(response.body).toMatchObject({
                success: expect.any(Boolean),
                data: {
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String),
                    expiresIn: expect.any(String),
                },
            });
        });
        it('should not include user data in response (only tokens)', async () => {
            const userId = 'user-123';
            const refreshToken = jsonwebtoken_1.default.sign({ userId, email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                password_hash: 'should_not_appear',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            redis_1.default.get.mockResolvedValue(refreshToken);
            User_1.UserModel.findById.mockResolvedValue(mockUser);
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken,
            });
            expect(response.body.data).not.toHaveProperty('user');
            expect(response.body.data).not.toHaveProperty('password_hash');
        });
    });
    describe('Security Requirements', () => {
        it('should invalidate old refresh token after rotation', async () => {
            const userId = 'user-123';
            const oldRefreshToken = jsonwebtoken_1.default.sign({ userId, email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            redis_1.default.get.mockResolvedValue(oldRefreshToken);
            User_1.UserModel.findById.mockResolvedValue(mockUser);
            redis_1.default.setex.mockResolvedValue('OK');
            await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: oldRefreshToken,
            });
            // Verify Redis setex was called to store new token
            expect(redis_1.default.setex).toHaveBeenCalled();
            const setexCall = redis_1.default.setex.mock.calls[0];
            expect(setexCall[0]).toContain(`refresh_token:${userId}`);
            // The new token should be different from old token
            const newTokenFromRedis = setexCall[2];
            expect(newTokenFromRedis).not.toBe(oldRefreshToken);
        });
        it('should set proper TTL for refresh token in Redis', async () => {
            const userId = 'user-123';
            const refreshToken = jsonwebtoken_1.default.sign({ userId, email: 'test@example.com' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            redis_1.default.get.mockResolvedValue(refreshToken);
            User_1.UserModel.findById.mockResolvedValue(mockUser);
            redis_1.default.setex.mockResolvedValue('OK');
            await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken,
            });
            // Verify Redis setex was called with proper TTL (7 days = 604800 seconds)
            expect(redis_1.default.setex).toHaveBeenCalled();
            const setexCall = redis_1.default.setex.mock.calls[0];
            expect(setexCall[1]).toBe(604800); // 7 days in seconds
        });
    });
});
//# sourceMappingURL=auth-refresh.contract.test.js.map