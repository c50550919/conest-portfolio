"use strict";
/**
 * T013: Contract Test - POST /api/auth/register
 * Constitution Principle I: Child Safety - 100% compliance testing for child PII rejection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
const User_1 = require("../../src/models/User");
const Verification_1 = require("../../src/models/Verification");
const redis_1 = __importDefault(require("../../src/config/redis"));
// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/models/Verification');
jest.mock('../../src/config/redis');
describe('POST /api/auth/register - Contract Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Success Cases', () => {
        it('should register new user with valid data and return 201', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed_password',
                phone: '+12345678901',
                phone_verified: false,
                email_verified: false,
                two_factor_enabled: false,
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
            };
            const mockVerification = {
                id: 'verification-123',
                user_id: 'user-123',
                id_verification_status: 'pending',
                background_check_status: 'pending',
                income_verification_status: 'pending',
                phone_verified: false,
                email_verified: false,
                verification_score: 0,
                fully_verified: false,
                created_at: new Date(),
                updated_at: new Date(),
            };
            User_1.UserModel.findByEmail.mockResolvedValue(null);
            User_1.UserModel.findByPhone.mockResolvedValue(null);
            User_1.UserModel.create.mockResolvedValue(mockUser);
            Verification_1.VerificationModel.create.mockResolvedValue(mockVerification);
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
                phone: '+12345678901',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
            });
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('tokens');
            expect(response.body.data.tokens).toHaveProperty('accessToken');
            expect(response.body.data.tokens).toHaveProperty('refreshToken');
            expect(response.body.data.tokens).toHaveProperty('expiresIn');
            expect(response.body.data.user).not.toHaveProperty('password_hash');
        });
        it('should register user without optional phone number', async () => {
            const mockUser = {
                id: 'user-124',
                email: 'test2@example.com',
                password_hash: 'hashed_password',
                phone_verified: false,
                email_verified: false,
                two_factor_enabled: false,
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
            };
            User_1.UserModel.findByEmail.mockResolvedValue(null);
            User_1.UserModel.create.mockResolvedValue(mockUser);
            Verification_1.VerificationModel.create.mockResolvedValue({});
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test2@example.com',
                password: 'SecurePass123!',
                firstName: 'Jane',
                lastName: 'Doe',
                dateOfBirth: '1992-05-15',
                city: 'Los Angeles',
                state: 'CA',
                zipCode: '90001',
                childrenCount: 1,
                childrenAgeGroups: ['teen'],
            });
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });
    });
    describe('Validation Error Cases', () => {
        it('should return 400 for invalid email format', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'invalid-email',
                password: 'SecurePass123!',
                phone: '+12345678901',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for password shorter than 8 characters', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'short',
                phone: '+12345678901',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for invalid phone format', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
                phone: '1234567890', // Missing + prefix
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for missing required fields', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
                // Missing firstName, lastName, etc.
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for invalid state code', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
                phone: '+12345678901',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CAL', // Should be 2 characters
                zipCode: '94102',
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for invalid zip code', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
                phone: '+12345678901',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '9410', // Should be 5 digits
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('CRITICAL: Child PII Rejection - 100% Compliance', () => {
        const prohibitedFields = [
            { field: 'childrenNames', value: ['Alice', 'Bob'] },
            { field: 'childrenAges', value: [5, 8] },
            { field: 'childrenPhotos', value: ['photo1.jpg', 'photo2.jpg'] },
            { field: 'childrenSchools', value: ['Lincoln Elementary', 'Wilson High'] },
        ];
        prohibitedFields.forEach(({ field, value }) => {
            it(`should reject registration with prohibited field: ${field}`, async () => {
                const payload = {
                    email: 'test@example.com',
                    password: 'SecurePass123!',
                    phone: '+12345678901',
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: '1990-01-01',
                    city: 'San Francisco',
                    state: 'CA',
                    zipCode: '94102',
                    childrenCount: 2,
                    childrenAgeGroups: ['toddler', 'elementary'],
                };
                payload[field] = value;
                const response = await (0, supertest_1.default)(app_1.app)
                    .post('/api/auth/register')
                    .send(payload);
                expect(response.status).toBe(400);
                expect(response.body).toHaveProperty('error');
                expect(response.body.error).toContain('Prohibited child PII');
            });
        });
        it('should reject registration with multiple prohibited fields', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
                phone: '+12345678901',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
                childrenNames: ['Alice', 'Bob'],
                childrenAges: [5, 8],
                childrenSchools: ['Lincoln Elementary'],
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Prohibited child PII');
        });
    });
    describe('Business Logic Error Cases', () => {
        it('should return 400 when email already exists', async () => {
            const existingUser = {
                id: 'user-existing',
                email: 'existing@example.com',
                password_hash: 'hashed',
                status: 'active',
            };
            User_1.UserModel.findByEmail.mockResolvedValue(existingUser);
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'existing@example.com',
                password: 'SecurePass123!',
                phone: '+12345678901',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('email');
        });
        it('should return 400 when phone number already exists', async () => {
            const existingUser = {
                id: 'user-existing',
                phone: '+12345678901',
                email: 'other@example.com',
                password_hash: 'hashed',
                status: 'active',
            };
            User_1.UserModel.findByEmail.mockResolvedValue(null);
            User_1.UserModel.findByPhone.mockResolvedValue(existingUser);
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
                phone: '+12345678901',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('phone');
        });
    });
    describe('Response Schema Validation', () => {
        it('should return correct response structure on success', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hashed',
                phone: '+12345678901',
                phone_verified: false,
                email_verified: false,
                two_factor_enabled: false,
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
            };
            User_1.UserModel.findByEmail.mockResolvedValue(null);
            User_1.UserModel.findByPhone.mockResolvedValue(null);
            User_1.UserModel.create.mockResolvedValue(mockUser);
            Verification_1.VerificationModel.create.mockResolvedValue({});
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
                phone: '+12345678901',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
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
                password_hash: 'hashed_password_should_not_appear',
                phone: '+12345678901',
                phone_verified: false,
                email_verified: false,
                two_factor_enabled: false,
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
            };
            User_1.UserModel.findByEmail.mockResolvedValue(null);
            User_1.UserModel.findByPhone.mockResolvedValue(null);
            User_1.UserModel.create.mockResolvedValue(mockUser);
            Verification_1.VerificationModel.create.mockResolvedValue({});
            redis_1.default.setex.mockResolvedValue('OK');
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com',
                password: 'SecurePass123!',
                phone: '+12345678901',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                childrenCount: 2,
                childrenAgeGroups: ['toddler', 'elementary'],
            });
            const responseString = JSON.stringify(response.body);
            expect(responseString).not.toContain('password_hash');
            expect(responseString).not.toContain('hashed_password_should_not_appear');
        });
    });
});
//# sourceMappingURL=auth-register.contract.test.js.map