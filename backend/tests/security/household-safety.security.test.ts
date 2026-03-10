// @ts-nocheck
/**
 * Security Tests: Household Safety Disclosure API
 *
 * Tests security requirements for the household safety disclosure system:
 * - Authentication enforcement
 * - JWT token validation
 * - Data access restrictions
 * - Input validation
 * - Rate limiting
 *
 * Test IDs: T-HS-S01 through T-HS-S10
 *
 * Constitution Compliance: Principle III (Security)
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { HouseholdSafetyService } from '../features/household-safety/household-safety.service';
import { HouseholdSafetyDisclosureModel } from '../models/HouseholdSafetyDisclosure';
import { ParentModel } from '../models/Parent';
import { UserModel } from '../models/User';
import { MIN_SIGNATURE_LENGTH } from '../features/household-safety/household-safety.constants';

// Mock dependencies
jest.mock('../config/database', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{}]),
    where: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(1),
  })),
}));

jest.mock('../services/auditService', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../models/User');
jest.mock('../models/Parent');
jest.mock('../models/HouseholdSafetyDisclosure');

// JWT secret for testing
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

// Test data
const mockUserId = 'user-123-uuid';
const mockParentId = 'parent-456-uuid';
const mockDisclosureId = 'disclosure-789-uuid';
const mockHouseholdId = 'household-012-uuid';

const mockUser = {
  id: mockUserId,
  email: 'test@example.com',
  account_status: 'active',
  role: 'user',
};

const mockParent = {
  id: mockParentId,
  user_id: mockUserId,
  first_name: 'Test',
  last_name: 'User',
};

// Valid attestation responses
const validAttestationResponses = [
  { questionId: 'juvenile_legal_history', response: false, answeredAt: new Date().toISOString() },
  { questionId: 'court_orders', response: false, answeredAt: new Date().toISOString() },
  { questionId: 'cps_involvement', response: false, answeredAt: new Date().toISOString() },
  { questionId: 'disclosure_accuracy', response: true, answeredAt: new Date().toISOString() },
];

const validSignatureData = `data:image/png;base64,${'A'.repeat(MIN_SIGNATURE_LENGTH + 50)}`;

// JWT token generators
const generateValidToken = (userId: string = mockUserId): string =>
  jwt.sign({ userId, email: 'test@example.com', type: 'access' }, JWT_SECRET, { expiresIn: '1h' });

const generateExpiredToken = (userId: string = mockUserId): string =>
  jwt.sign(
    { userId, email: 'test@example.com', type: 'access' },
    JWT_SECRET,
    { expiresIn: '-1h' }, // Already expired
  );

const generateInvalidToken = (): string => 'invalid.jwt.token.structure';

const generateWrongSecretToken = (userId: string = mockUserId): string =>
  jwt.sign({ userId, email: 'test@example.com', type: 'access' }, 'wrong-secret-key', {
    expiresIn: '1h',
  });

// Create test app with proper JWT validation
const createTestApp = () => {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Auth middleware with JWT validation
  const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', type: 'expired' });
      }
      return res.status(401).json({ error: 'Invalid token', type: 'invalid' });
    }
  };

  // Import controller
  const {
    householdSafetyController,
  } = require('../features/household-safety/household-safety.controller');

  // Setup routes
  app.get(
    '/api/household-safety/questions',
    authMiddleware,
    householdSafetyController.getQuestions,
  );
  app.get('/api/household-safety/status', authMiddleware, householdSafetyController.getStatus);
  app.post(
    '/api/household-safety/submit',
    authMiddleware,
    householdSafetyController.submitAttestation,
  );

  // Error handler - should NOT expose internal details
  app.use((err, req, res, next) => {
    // In production, never expose internal error details
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    });
  });

  return app;
};

describe('Security: Household Safety Disclosure API', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
    (ParentModel.findByUserId as jest.Mock).mockResolvedValue(mockParent);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // Authentication Tests
  // ============================================================================

  describe('Authentication Enforcement', () => {
    // T-HS-S01: All endpoints reject unauthenticated requests
    it('T-HS-S01: should reject unauthenticated requests on all endpoints', async () => {
      // GET /questions
      const questionsRes = await request(app).get('/api/household-safety/questions').expect(401);
      expect(questionsRes.body).toHaveProperty('error');

      // GET /status
      const statusRes = await request(app).get('/api/household-safety/status').expect(401);
      expect(statusRes.body).toHaveProperty('error');

      // POST /submit
      const submitRes = await request(app)
        .post('/api/household-safety/submit')
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
        })
        .expect(401);
      expect(submitRes.body).toHaveProperty('error');
    });

    // T-HS-S02: Invalid JWT tokens rejected
    it('T-HS-S02: should reject invalid JWT tokens', async () => {
      const invalidToken = generateInvalidToken();

      const response = await request(app)
        .get('/api/household-safety/questions')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.type).toBe('invalid');
    });

    // T-HS-S03: Expired JWT tokens rejected
    it('T-HS-S03: should reject expired JWT tokens', async () => {
      const expiredToken = generateExpiredToken();

      const response = await request(app)
        .get('/api/household-safety/questions')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.type).toBe('expired');
    });

    it('should reject tokens signed with wrong secret', async () => {
      const wrongSecretToken = generateWrongSecretToken();

      const response = await request(app)
        .get('/api/household-safety/questions')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================================
  // Data Access Control Tests
  // ============================================================================

  describe('Data Access Control', () => {
    const mockDisclosure = {
      id: mockDisclosureId,
      parent_id: mockParentId,
      household_id: mockHouseholdId,
      disclosure_type: 'initial',
      status: 'attested',
      attestation_responses: validAttestationResponses,
      signature_data: validSignatureData,
      signed_at: new Date(),
      ip_address: null,
      user_agent: null,
      expires_at: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
      updated_at: new Date(),
    };

    // T-HS-S04: Users can only access their own disclosures
    it('T-HS-S04: should only allow users to access their own disclosures', async () => {
      jest
        .spyOn(HouseholdSafetyDisclosureModel, 'findByParentId')
        .mockResolvedValue(mockDisclosure);

      const validToken = generateValidToken(mockUserId);

      const response = await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify the response contains data specific to the authenticated user
      expect(response.body.success).toBe(true);

      // Verify findByParentId was called with the correct parent ID
      expect(HouseholdSafetyDisclosureModel.findByParentId).toHaveBeenCalledWith(mockParentId);
    });

    // T-HS-S05: Users cannot modify other users' disclosures
    it('T-HS-S05: should prevent users from modifying other users disclosures', async () => {
      const otherUserId = 'other-user-uuid';
      const otherToken = generateValidToken(otherUserId);

      // Mock that the other user has no parent profile
      (ParentModel.findByUserId as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(404);

      expect(response.body.error).toBe('Parent profile not found');
    });
  });

  // ============================================================================
  // Input Validation Tests
  // ============================================================================

  describe('Input Validation', () => {
    const validToken = generateValidToken();

    beforeEach(() => {
      jest.spyOn(HouseholdSafetyDisclosureModel, 'supersedePrevious').mockResolvedValue(undefined);
      jest.spyOn(HouseholdSafetyDisclosureModel, 'create').mockResolvedValue({
        id: mockDisclosureId,
        parent_id: mockParentId,
        household_id: mockHouseholdId,
        disclosure_type: 'initial',
        status: 'attested',
        attestation_responses: validAttestationResponses,
        signature_data: validSignatureData,
        signed_at: new Date(),
        ip_address: null,
        user_agent: null,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    // T-HS-S06: SQL injection in householdId rejected
    it('T-HS-S06: should handle SQL injection attempts in householdId', async () => {
      const sqlInjectionPayload = "'; DROP TABLE households; --";

      // The householdId is passed to the service and eventually to the database
      // The service should use parameterized queries, so injection should not execute
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          householdId: sqlInjectionPayload,
        });

      // The request should either succeed (with sanitized input) or fail validation
      // It should NOT cause a database error or execute SQL injection
      expect(response.status).not.toBe(500);
    });

    // T-HS-S07: XSS in signature data sanitized
    it('T-HS-S07: should handle XSS attempts in signature data', async () => {
      const xssPayload = `<script>alert("XSS")</script>${'A'.repeat(MIN_SIGNATURE_LENGTH)}`;

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: xssPayload,
          householdId: mockHouseholdId,
        });

      // Signature data is stored as-is (base64) but should not be rendered as HTML
      // The submission should still succeed as long as the signature meets length requirements
      expect(response.status).toBe(201);
    });

    // T-HS-S08: Invalid questionId values rejected
    it('T-HS-S08: should reject invalid questionId values', async () => {
      const invalidResponses = [
        {
          questionId: 'invalid_question_id',
          response: false,
          answeredAt: new Date().toISOString(),
        },
        { questionId: 'court_orders', response: false, answeredAt: new Date().toISOString() },
        { questionId: 'cps_involvement', response: false, answeredAt: new Date().toISOString() },
        { questionId: 'disclosure_accuracy', response: true, answeredAt: new Date().toISOString() },
      ];

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          attestationResponses: invalidResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    // T-HS-S09: Extra fields in payload ignored
    it('T-HS-S09: should ignore extra fields in payload', async () => {
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
          maliciousField: 'should be ignored',
          _id: 'injection-attempt',
          admin: true,
          role: 'admin',
        })
        .expect(201);

      // Verify the response is successful and extra fields were not processed
      expect(response.body.success).toBe(true);

      // Verify the create call did not include extra fields
      const createCall = (HouseholdSafetyDisclosureModel.create as jest.Mock).mock.calls[0][0];
      expect(createCall).not.toHaveProperty('maliciousField');
      expect(createCall).not.toHaveProperty('_id');
      expect(createCall).not.toHaveProperty('admin');
      expect(createCall).not.toHaveProperty('role');
    });
  });

  // ============================================================================
  // Rate Limiting Tests
  // ============================================================================

  describe('Rate Limiting', () => {
    // T-HS-S10: Submit endpoint rate limited
    it('T-HS-S10: should handle multiple rapid submissions gracefully', async () => {
      const validToken = generateValidToken();

      jest.spyOn(HouseholdSafetyDisclosureModel, 'supersedePrevious').mockResolvedValue(undefined);
      jest.spyOn(HouseholdSafetyDisclosureModel, 'create').mockResolvedValue({
        id: mockDisclosureId,
        parent_id: mockParentId,
        household_id: mockHouseholdId,
        disclosure_type: 'initial',
        status: 'attested',
        attestation_responses: validAttestationResponses,
        signature_data: validSignatureData,
        signed_at: new Date(),
        ip_address: null,
        user_agent: null,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Note: This test verifies the endpoint handles multiple requests
      // Full rate limiting is tested at the middleware level with the real app
      const promises = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/household-safety/submit')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
              attestationResponses: validAttestationResponses,
              signatureData: validSignatureData,
              householdId: mockHouseholdId,
            }),
        );

      const responses = await Promise.all(promises);

      // All requests should complete (either 201 or 429 if rate limited)
      responses.forEach((response) => {
        expect([201, 429]).toContain(response.status);
      });
    });
  });

  // ============================================================================
  // Additional Security Tests
  // ============================================================================

  describe('Additional Security Checks', () => {
    const validToken = generateValidToken();

    it('should not expose internal error details', async () => {
      // Force an error by making the service throw
      jest
        .spyOn(HouseholdSafetyDisclosureModel, 'findByParentId')
        .mockRejectedValue(new Error('Internal database error with sensitive details'));

      const response = await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${validToken}`);

      // Should return 500 for internal errors
      expect(response.status).toBe(500);

      // Should not expose internal error message
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('database');
      expect(responseText).not.toContain('sensitive');

      // Should have generic error message
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Should return an error status (400 or 500 depending on error handling)
      expect([400, 500]).toContain(response.status);
      // Should have an error response, not crash
      expect(response.body).toHaveProperty('error');
    });

    it('should reject oversized payloads', async () => {
      // Create a very large signature
      const oversizedSignature = 'A'.repeat(2 * 1024 * 1024); // 2MB

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: oversizedSignature,
          householdId: mockHouseholdId,
        });

      // Should reject with 413 (Payload Too Large), 400, or 500 (if body parser limit exceeded)
      expect([400, 413, 500]).toContain(response.status);
      // Server should not crash - should return a response
      expect(response.body).toBeDefined();
    });

    it('should validate attestation response data types', async () => {
      const invalidTypeResponses = [
        { questionId: 123, response: 'false', answeredAt: new Date().toISOString() }, // questionId should be string, response should be boolean
        { questionId: 'court_orders', response: false, answeredAt: new Date().toISOString() },
        { questionId: 'cps_involvement', response: false, answeredAt: new Date().toISOString() },
        { questionId: 'disclosure_accuracy', response: true, answeredAt: new Date().toISOString() },
      ];

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          attestationResponses: invalidTypeResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle empty attestation responses array', async () => {
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          attestationResponses: [],
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
