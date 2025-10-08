"use strict";
/**
 * T014: Contract Test - POST /api/auth/login
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
const User_1 = require("../../src/models/User");
const redis_1 = __importDefault(require("../../src/config/redis"));
const bcrypt_1 = __importDefault(require("bcrypt"));
// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/config/redis');
jest.mock('bcrypt');
describe('POST /api/auth/login - Contract Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Success Cases', () => {
        it('should login user with valid credentials and return 200', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                phone: '+12345678901',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                status: 'active',
                last_login_at: new Date(),
                created_at: new Date(),
                updated_at: new Date(),
            };
            User_1.UserModel.findByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            User_1.UserModel.updateLastLogin.mockResolvedValue(undefined);
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('tokens');
            expect(response.body.data.tokens).toHaveProperty('accessToken');
            expect(response.body.data.tokens).toHaveProperty('refreshToken');
            expect(response.body.data.tokens).toHaveProperty('expiresIn');
            expect(response.body.data.user).not.toHaveProperty('password_hash');
        });
        it('should update last_login_at on successful login', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            User_1.UserModel.findByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            User_1.UserModel.updateLastLogin.mockResolvedValue(undefined);
            redis_1.default.setex.mockResolvedValue('OK');
            await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
            });
            expect(User_1.UserModel.updateLastLogin).toHaveBeenCalledWith('user-123');
        });
    });
    describe('Validation Error Cases', () => {
        it('should return 400 for invalid email format', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'invalid-email',
                password: 'SecurePass123!',
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for missing email', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                password: 'SecurePass123!',
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for missing password', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for empty password', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: '',
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('Authentication Error Cases', () => {
        it('should return 401 for non-existent user', async () => {
            User_1.UserModel.findByEmail.mockResolvedValue(null);
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@example.com',
                password: 'SecurePass123!',
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid credentials');
        });
        it('should return 401 for incorrect password', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
            };
            User_1.UserModel.findByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(false);
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'WrongPassword123!',
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid credentials');
        });
        it('should not reveal whether email exists in error message', async () => {
            User_1.UserModel.findByEmail.mockResolvedValue(null);
            const response1 = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@example.com',
                password: 'SecurePass123!',
            });
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                status: 'active',
            };
            User_1.UserModel.findByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(false);
            const response2 = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'WrongPassword123!',
            });
            // Both should return same generic error message
            expect(response1.body.error).toBe(response2.body.error);
        });
    });
    describe('Account Status Error Cases', () => {
        it('should return 403 for suspended account', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                status: 'suspended',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
            };
            User_1.UserModel.findByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
            });
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('not active');
        });
        it('should return 403 for deactivated account', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                status: 'deactivated',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
            };
            User_1.UserModel.findByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
            });
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('not active');
        });
    });
    describe('Response Schema Validation', () => {
        it('should return correct response structure on success', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                phone: '+12345678901',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            User_1.UserModel.findByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            User_1.UserModel.updateLastLogin.mockResolvedValue(undefined);
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
            });
            expect(response.body).toMatchObject({
                success: expect.any(Boolean),
                message: expect.any(String),
                data: {
                    user: {
                        id: expect.any(String),
                        email: expect.any(String),
                        status: expect.any(String),
                    },
                    tokens: {
                        accessToken: expect.any(String),
                        refreshToken: expect.any(String),
                        expiresIn: expect.any(String),
                    },
                },
            });
        });
        it('should never expose password_hash in response', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'secret_hashed_password_should_not_appear',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            User_1.UserModel.findByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            User_1.UserModel.updateLastLogin.mockResolvedValue(undefined);
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
            });
            const responseString = JSON.stringify(response.body);
            expect(responseString).not.toContain('password_hash');
            expect(responseString).not.toContain('secret_hashed_password_should_not_appear');
        });
    });
    describe('Token Generation', () => {
        it('should generate valid JWT tokens on successful login', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            User_1.UserModel.findByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            User_1.UserModel.updateLastLogin.mockResolvedValue(undefined);
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
            });
            expect(response.body.data.tokens.accessToken).toBeTruthy();
            expect(response.body.data.tokens.refreshToken).toBeTruthy();
            expect(response.body.data.tokens.accessToken).not.toBe(response.body.data.tokens.refreshToken);
        });
        it('should store refresh token in Redis', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                status: 'active',
                phone_verified: true,
                email_verified: true,
                two_factor_enabled: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            User_1.UserModel.findByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            User_1.UserModel.updateLastLogin.mockResolvedValue(undefined);
            redis_1.default.setex.mockResolvedValue('OK');
            await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
            });
            expect(redis_1.default.setex).toHaveBeenCalled();
            const setexCall = redis_1.default.setex.mock.calls[0];
            expect(setexCall[0]).toContain('refresh_token:user-123');
        });
    });
});
//# sourceMappingURL=auth-login.contract.test.js.map