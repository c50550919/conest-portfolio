/**
 * Contract Test: POST /api/auth/register
 *
 * Tests API contract compliance for user registration endpoint.
 * TDD: This test MUST FAIL until AuthController.register is implemented.
 *
 * Constitution Principles:
 * - Principle I: Child Safety (NO child PII in request/response)
 * - Principle III: Security (Zod validation, bcrypt hashing)
 * - Principle V: TDD (Write test before implementation)
 */

import request from 'supertest';
import express, { Express } from 'express';

describe('POST /api/auth/register - Contract Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // TODO: Wire up auth routes when AuthController is implemented
    // app.use('/api/auth', authRoutes);

    // Placeholder to make test fail until implementation
    app.post('/api/auth/register', (_req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });
  });

  describe('Valid Registration', () => {
    it('should return 201 with tokens on successful registration', async () => {
      const validPayload = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(validPayload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Validate response structure
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('email', validPayload.email);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn', 900); // 15min in seconds

      // Ensure tokens are JWTs (basic format check)
      expect(response.body.accessToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      expect(response.body.refreshToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should NOT return password hash in response', async () => {
      const validPayload = {
        email: 'test2@example.com',
        password: 'SecurePassword123!',
        phone: '+1234567891',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '1992-01-01',
        city: 'Oakland',
        state: 'CA',
        zipCode: '94601',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(validPayload)
        .expect(201);

      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password_hash');
    });
  });

  describe('Child Safety Compliance (Constitution Principle I)', () => {
    it('should ACCEPT childrenCount and childrenAgeGroups', async () => {
      const payload = {
        email: 'safe@example.com',
        password: 'SecurePassword123!',
        phone: '+1234567892',
        firstName: 'Safe',
        lastName: 'Parent',
        dateOfBirth: '1988-01-01',
        city: 'Berkeley',
        state: 'CA',
        zipCode: '94704',
        childrenCount: 3,
        childrenAgeGroups: ['toddler', 'elementary', 'teen'],
      };

      await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(201);
    });

    it('should REJECT childrenNames (prohibited child PII)', async () => {
      const payload = {
        email: 'unsafe@example.com',
        password: 'SecurePassword123!',
        phone: '+1234567893',
        firstName: 'Unsafe',
        lastName: 'Parent',
        dateOfBirth: '1988-01-01',
        city: 'Berkeley',
        state: 'CA',
        zipCode: '94704',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
        childrenNames: ['Alice', 'Bob'], // PROHIBITED
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(400);

      expect(response.body.error).toContain('childrenNames');
    });

    it('should REJECT childrenAges (prohibited exact ages)', async () => {
      const payload = {
        email: 'unsafe2@example.com',
        password: 'SecurePassword123!',
        phone: '+1234567894',
        firstName: 'Unsafe',
        lastName: 'Parent',
        dateOfBirth: '1988-01-01',
        city: 'Berkeley',
        state: 'CA',
        zipCode: '94704',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
        childrenAges: [3, 7], // PROHIBITED
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(400);

      expect(response.body.error).toContain('childrenAges');
    });
  });

  describe('Validation Errors (Constitution Principle III)', () => {
    it('should return 400 for missing email', async () => {
      const payload = {
        password: 'SecurePassword123!',
        phone: '+1234567895',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        city: 'SF',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    it('should return 400 for invalid email format', async () => {
      const payload = {
        email: 'not-an-email',
        password: 'SecurePassword123!',
        phone: '+1234567896',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        city: 'SF',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    it('should return 400 for weak password (< 8 chars)', async () => {
      const payload = {
        email: 'weak@example.com',
        password: 'weak',
        phone: '+1234567897',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        city: 'SF',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(400);

      expect(response.body.error).toContain('password');
    });

    it('should return 400 for invalid childrenAgeGroups', async () => {
      const payload = {
        email: 'invalid@example.com',
        password: 'SecurePassword123!',
        phone: '+1234567898',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        city: 'SF',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['invalid-age-group'], // Not toddler/elementary/teen
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(400);

      expect(response.body.error).toContain('childrenAgeGroups');
    });
  });

  describe('Duplicate User Errors', () => {
    it('should return 409 for duplicate email', async () => {
      const payload = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        phone: '+1234567899',
        firstName: 'First',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        city: 'SF',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      // First registration should succeed
      await request(app).post('/api/auth/register').send(payload).expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(409);

      expect(response.body.error).toContain('email');
    });
  });
});
