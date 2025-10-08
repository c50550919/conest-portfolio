"use strict";
/**
 * T018: Integration Test - Token Refresh Flow
 *
 * End-to-end token refresh workflow test:
 * 1. Login to get initial tokens
 * 2. Wait/simulate token expiration
 * 3. Refresh using refresh token
 * 4. Access protected endpoint with new access token
 *
 * Constitution Principle III: Security
 * - Token rotation, refresh token invalidation, secure token management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
const database_1 = require("../../src/config/database");
const redis_1 = __importDefault(require("../../src/config/redis"));
const User_1 = require("../../src/models/User");
const jwt_1 = require("../../src/utils/jwt");
const password_1 = require("../../src/utils/password");
const jwt = __importStar(require("jsonwebtoken"));
describe('Integration Test: Token Refresh Flow', () => {
    let testUser;
    let testUserId;
    // Create a test user before each test
    beforeEach(async () => {
        // Clean up test database tables
        await (0, database_1.db)('verifications').del();
        await (0, database_1.db)('users').del();
        await redis_1.default.flushdb();
        // Create test user
        const password_hash = await (0, password_1.hashPassword)('SecurePass123!');
        const [user] = await (0, database_1.db)('users').insert({
            email: 'refresh-test@example.com',
            password_hash,
            phone_number: '+14155552671',
            phone_verified: false,
            email_verified: false,
            two_factor_enabled: false,
            status: 'active',
        }).returning('*');
        testUser = user;
        testUserId = user.id;
        // Create verification record
        await (0, database_1.db)('verifications').insert({
            user_id: testUserId,
            id_verification_status: 'pending',
            background_check_status: 'pending',
            phone_verified: false,
            email_verified: false,
            verification_score: 0,
            fully_verified: false,
        });
    });
    afterEach(async () => {
        // Clean up after each test
        await (0, database_1.db)('verifications').del();
        await (0, database_1.db)('users').del();
        await redis_1.default.flushdb();
    });
    afterAll(async () => {
        // Close connections
        await database_1.db.destroy();
        await redis_1.default.quit();
    });
    describe('Complete Token Refresh Flow', () => {
        it('should login � wait � refresh � access with new token', async () => {
            // STEP 1: Login to get initial tokens
            const loginResponse = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'refresh-test@example.com',
                password: 'SecurePass123!',
            });
            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.data).toHaveProperty('tokens');
            const { tokens: initialTokens } = loginResponse.body.data;
            // Verify initial access token is valid
            const initialTokenResult = (0, jwt_1.verifyToken)(initialTokens.accessToken);
            expect(initialTokenResult.valid).toBe(true);
            // Verify refresh token is stored in Redis
            const storedRefreshToken = await redis_1.default.get(`refresh_token:${testUserId}`);
            expect(storedRefreshToken).toBe(initialTokens.refreshToken);
            // STEP 2: Simulate token usage (optional - can wait for expiration in real scenario)
            // In a real scenario, you would wait 15 minutes for access token to expire
            // For testing, we proceed directly to refresh
            // STEP 3: Refresh using refresh token
            const refreshResponse = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: initialTokens.refreshToken,
            });
            expect(refreshResponse.status).toBe(200);
            expect(refreshResponse.body.success).toBe(true);
            expect(refreshResponse.body.data).toHaveProperty('accessToken');
            expect(refreshResponse.body.data).toHaveProperty('refreshToken');
            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.body.data;
            // Verify new tokens are different from initial tokens (token rotation)
            expect(newAccessToken).not.toBe(initialTokens.accessToken);
            expect(newRefreshToken).not.toBe(initialTokens.refreshToken);
            // Verify new access token is valid
            const newTokenResult = (0, jwt_1.verifyToken)(newAccessToken);
            expect(newTokenResult.valid).toBe(true);
            expect(newTokenResult.payload?.userId).toBe(testUserId);
            // Verify new refresh token is stored in Redis (rotation)
            const newStoredRefreshToken = await redis_1.default.get(`refresh_token:${testUserId}`);
            expect(newStoredRefreshToken).toBe(newRefreshToken);
            // STEP 4: Access protected endpoint with new access token
            const protectedResponse = await (0, supertest_1.default)(app_1.app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${newAccessToken}`);
            // Should either return 200 (if profile exists) or 404 (if profile not created yet)
            // Both are valid - the important thing is NOT 401 Unauthorized
            expect([200, 404]).toContain(protectedResponse.status);
            if (protectedResponse.status === 401) {
                throw new Error('Protected endpoint returned 401 - new token authentication failed');
            }
        });
        it('should reject old refresh token after rotation', async () => {
            // Login to get initial tokens
            const loginResponse = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'refresh-test@example.com',
                password: 'SecurePass123!',
            });
            const { tokens: initialTokens } = loginResponse.body.data;
            // Refresh once (token rotation)
            const firstRefreshResponse = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: initialTokens.refreshToken,
            });
            expect(firstRefreshResponse.status).toBe(200);
            // Try to use old refresh token again (should fail)
            const secondRefreshResponse = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: initialTokens.refreshToken, // Old token
            });
            expect(secondRefreshResponse.status).toBe(401);
            expect(secondRefreshResponse.body.error).toContain('Invalid or expired refresh token');
        });
    });
    describe('Token Expiration Handling', () => {
        it('should reject expired access token', async () => {
            // Create an expired access token (expired 1 second ago)
            const expiredToken = jwt.sign({ userId: testUserId, email: testUser.email }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '-1s' });
            // Try to access protected endpoint with expired token
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${expiredToken}`);
            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Invalid or expired token');
        });
        it('should reject expired refresh token', async () => {
            // Create an expired refresh token
            const expiredRefreshToken = jwt.sign({ userId: testUserId, email: testUser.email }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '-1s' });
            // Try to refresh with expired token
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: expiredRefreshToken,
            });
            expect(response.status).toBe(401);
            expect(response.body.error).toContain('Invalid or expired refresh token');
        });
    });
    describe('Security Requirements', () => {
        it('should reject refresh token for inactive user', async () => {
            // Login to get tokens
            const loginResponse = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'refresh-test@example.com',
                password: 'SecurePass123!',
            });
            const { tokens } = loginResponse.body.data;
            // Suspend user account
            await User_1.UserModel.update(testUserId, { status: 'suspended' });
            // Try to refresh (should fail)
            const refreshResponse = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: tokens.refreshToken,
            });
            expect(refreshResponse.status).toBe(401);
            expect(refreshResponse.body.error).toContain('Invalid or expired refresh token');
        });
        it('should reject refresh token for deleted user', async () => {
            // Login to get tokens
            const loginResponse = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .send({
                email: 'refresh-test@example.com',
                password: 'SecurePass123!',
            });
            const { tokens } = loginResponse.body.data;
            // Delete user
            await User_1.UserModel.delete(testUserId);
            // Try to refresh (should fail)
            const refreshResponse = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/refresh')
                .send({
                refreshToken: tokens.refreshToken,
            });
            expect(refreshResponse.status).toBe(401);
            expect(refreshResponse.body.error).toContain('Invalid or expired refresh token');
        });
    });
});
//# sourceMappingURL=auth-token-refresh.integration.test.js.map