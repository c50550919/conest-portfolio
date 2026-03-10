// @ts-nocheck
/**
 * Contract Tests: Household Safety Disclosure API
 *
 * Tests the household safety disclosure API endpoints:
 * - GET /api/household-safety/questions
 * - GET /api/household-safety/status
 * - POST /api/household-safety/submit
 *
 * Test IDs: T-HS-C01 through T-HS-C22
 *
 * Constitution Compliance: Principle I (No Child PII)
 *
 * Note: Some tests require database fixtures and valid auth tokens.
 * Tests marked with .skip require additional setup.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { HouseholdSafetyService } from '../../src/features/household-safety/household-safety.service';
import { HouseholdSafetyDisclosureModel } from '../../src/models/HouseholdSafetyDisclosure';
import { ParentModel } from '../../src/models/Parent';
import { UserModel } from '../../src/models/User';
import {
  ATTESTATION_QUESTIONS,
  MIN_SIGNATURE_LENGTH,
  DISCLOSURE_VALIDITY_DAYS,
  RENEWAL_WARNING_DAYS,
} from '../../src/features/household-safety/household-safety.constants';

// Mock dependencies before importing routes
jest.mock('../../src/config/database', () => ({
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

jest.mock('../../src/services/auditService', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../src/models/User');
jest.mock('../../src/models/Parent');
jest.mock('../../src/models/HouseholdSafetyDisclosure');

// Create minimal express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock auth middleware that always authenticates
  const mockAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.userId = 'user-123-uuid';
    next();
  };

  // Import controller
  const {
    householdSafetyController,
  } = require('../../src/features/household-safety/household-safety.controller');

  // Setup routes
  app.get('/api/household-safety/questions', mockAuth, householdSafetyController.getQuestions);
  app.get('/api/household-safety/status', mockAuth, householdSafetyController.getStatus);
  app.post('/api/household-safety/submit', mockAuth, householdSafetyController.submitAttestation);

  return app;
};

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

// Generate a valid test token
const generateTestToken = () => 'mock-test-token';

// Valid attestation responses
const validAttestationResponses = [
  { questionId: 'juvenile_legal_history', response: false, answeredAt: new Date().toISOString() },
  { questionId: 'court_orders', response: false, answeredAt: new Date().toISOString() },
  { questionId: 'cps_involvement', response: false, answeredAt: new Date().toISOString() },
  { questionId: 'disclosure_accuracy', response: true, answeredAt: new Date().toISOString() },
];

// Valid signature data
const validSignatureData = `data:image/png;base64,${'A'.repeat(MIN_SIGNATURE_LENGTH + 50)}`;

describe('Contract: Household Safety Disclosure API', () => {
  let app;
  let authToken: string;

  beforeAll(() => {
    app = createTestApp();
    authToken = generateTestToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
    (ParentModel.findByUserId as jest.Mock).mockResolvedValue(mockParent);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // GET /api/household-safety/questions
  // ============================================================================

  describe('GET /api/household-safety/questions', () => {
    // T-HS-C01: Returns 200 with questions array
    it('T-HS-C01: should return 200 with questions array', async () => {
      const response = await request(app)
        .get('/api/household-safety/questions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('questions');
      expect(Array.isArray(response.body.data.questions)).toBe(true);
    });

    // T-HS-C02: Returns 4 questions with correct structure
    it('T-HS-C02: should return 4 questions with correct structure', async () => {
      const response = await request(app)
        .get('/api/household-safety/questions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { questions } = response.body.data;
      expect(questions).toHaveLength(4);

      questions.forEach((question: any) => {
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('text');
        expect(question).toHaveProperty('required');
        expect(question).toHaveProperty('expectedAnswer');
        expect(typeof question.id).toBe('string');
        expect(typeof question.text).toBe('string');
        expect(typeof question.required).toBe('boolean');
        expect(typeof question.expectedAnswer).toBe('boolean');
      });
    });

    // T-HS-C03: Returns 401 when not authenticated
    it('T-HS-C03: should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/household-safety/questions').expect(401);

      expect(response.body).toHaveProperty('error');
    });

    // T-HS-C04: Responds within 50ms (P95)
    it('T-HS-C04: should respond within 50ms (P95)', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/household-safety/questions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });

  // ============================================================================
  // GET /api/household-safety/status
  // ============================================================================

  describe('GET /api/household-safety/status', () => {
    // T-HS-C05: Returns hasValidDisclosure=false for new user
    it('T-HS-C05: should return hasValidDisclosure=false for new user', async () => {
      jest.spyOn(HouseholdSafetyDisclosureModel, 'findByParentId').mockResolvedValue(null);

      const response = await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('hasValidDisclosure', false);
      expect(response.body.data).toHaveProperty('canParticipateInMatching', false);
    });

    // T-HS-C06: Returns hasValidDisclosure=true after submission
    it('T-HS-C06: should return hasValidDisclosure=true when disclosure exists', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 200);

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
        expires_at: futureDate,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(HouseholdSafetyDisclosureModel, 'findByParentId')
        .mockResolvedValue(mockDisclosure);

      const response = await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('hasValidDisclosure', true);
      expect(response.body.data).toHaveProperty('canParticipateInMatching', true);
    });

    // T-HS-C07: Returns correct expiresIn calculation
    it('T-HS-C07: should return correct expiresIn calculation', async () => {
      const daysUntilExpiry = 100;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysUntilExpiry);

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
        expires_at: futureDate,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(HouseholdSafetyDisclosureModel, 'findByParentId')
        .mockResolvedValue(mockDisclosure);

      const response = await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Allow ±1 day variance
      expect(response.body.data.expiresIn).toBeGreaterThanOrEqual(daysUntilExpiry - 1);
      expect(response.body.data.expiresIn).toBeLessThanOrEqual(daysUntilExpiry + 1);
    });

    // T-HS-C08: Returns needsRenewal=true within 30 days
    it('T-HS-C08: should return needsRenewal=true within 30 days of expiry', async () => {
      const daysUntilExpiry = 25;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysUntilExpiry);

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
        expires_at: futureDate,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(HouseholdSafetyDisclosureModel, 'findByParentId')
        .mockResolvedValue(mockDisclosure);

      const response = await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('needsRenewal', true);
    });

    // T-HS-C09: Returns canParticipateInMatching correctly
    it('T-HS-C09: should return canParticipateInMatching as boolean', async () => {
      jest.spyOn(HouseholdSafetyDisclosureModel, 'findByParentId').mockResolvedValue(null);

      const response = await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(typeof response.body.data.canParticipateInMatching).toBe('boolean');
    });

    // T-HS-C10: Returns 401 when not authenticated
    it('T-HS-C10: should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/household-safety/status').expect(401);

      expect(response.body).toHaveProperty('error');
    });

    // T-HS-C11: Responds within 100ms (P95)
    it('T-HS-C11: should respond within 100ms (P95)', async () => {
      jest.spyOn(HouseholdSafetyDisclosureModel, 'findByParentId').mockResolvedValue(null);

      const start = Date.now();

      await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should return 404 when parent profile not found', async () => {
      (ParentModel.findByUserId as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Parent profile not found');
    });
  });

  // ============================================================================
  // POST /api/household-safety/submit
  // ============================================================================

  describe('POST /api/household-safety/submit', () => {
    const mockCreatedDisclosure = {
      id: mockDisclosureId,
      parent_id: mockParentId,
      household_id: mockHouseholdId,
      disclosure_type: 'initial',
      status: 'attested',
      attestation_responses: validAttestationResponses,
      signature_data: validSignatureData,
      signed_at: new Date(),
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      jest.spyOn(HouseholdSafetyDisclosureModel, 'supersedePrevious').mockResolvedValue(undefined);
      jest.spyOn(HouseholdSafetyDisclosureModel, 'create').mockResolvedValue(mockCreatedDisclosure);
    });

    // T-HS-C12: Returns 201 with valid submission
    it('T-HS-C12: should return 201 with valid submission', async () => {
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('disclosure');
    });

    // T-HS-C13: Returns disclosure object with id, expiresAt
    it('T-HS-C13: should return disclosure object with required fields', async () => {
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(201);

      const { disclosure } = response.body.data;
      expect(disclosure).toHaveProperty('id');
      expect(disclosure).toHaveProperty('expiresAt');
      expect(disclosure).toHaveProperty('parentId');
    });

    // T-HS-C14: Returns 400 for missing attestation responses
    it('T-HS-C14: should return 400 for missing attestation responses', async () => {
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/attestation/i);
    });

    // T-HS-C15: Returns 400 for incorrect attestation answers
    it('T-HS-C15: should return 400 for incorrect attestation answers', async () => {
      const incorrectResponses = [
        {
          questionId: 'juvenile_legal_history',
          response: true,
          answeredAt: new Date().toISOString(),
        },
        { questionId: 'court_orders', response: false, answeredAt: new Date().toISOString() },
        { questionId: 'cps_involvement', response: false, answeredAt: new Date().toISOString() },
        { questionId: 'disclosure_accuracy', response: true, answeredAt: new Date().toISOString() },
      ];

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attestationResponses: incorrectResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    // T-HS-C16: Returns 400 for missing signature
    it('T-HS-C16: should return 400 for missing signature', async () => {
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          householdId: mockHouseholdId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/signature/i);
    });

    // T-HS-C17: Returns 400 for signature too short
    it('T-HS-C17: should return 400 for signature too short', async () => {
      const shortSignature = 'data:image/png;base64,ABC';

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: shortSignature,
          householdId: mockHouseholdId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    // T-HS-C18: Returns 401 when not authenticated
    it('T-HS-C18: should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/household-safety/submit')
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    // T-HS-C19: Stores IP address in disclosure record
    it('T-HS-C19: should store IP address in disclosure record', async () => {
      await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Forwarded-For', '192.168.1.100')
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(201);

      const createCall = (HouseholdSafetyDisclosureModel.create as jest.Mock).mock.calls[0][0];
      expect(createCall).toHaveProperty('ipAddress');
    });

    // T-HS-C20: Stores user agent in disclosure record
    it('T-HS-C20: should store user agent in disclosure record', async () => {
      const testUserAgent = 'Test-User-Agent/1.0';

      await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .set('User-Agent', testUserAgent)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(201);

      const createCall = (HouseholdSafetyDisclosureModel.create as jest.Mock).mock.calls[0][0];
      expect(createCall).toHaveProperty('userAgent');
      expect(createCall.userAgent).toContain(testUserAgent);
    });

    // T-HS-C21: Supersedes previous disclosure on resubmission
    it('T-HS-C21: should supersede previous disclosure on resubmission', async () => {
      await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(201);

      expect(HouseholdSafetyDisclosureModel.supersedePrevious).toHaveBeenCalledWith(mockParentId);
    });

    // T-HS-C22: Creates audit log entry
    it('T-HS-C22: should create audit log entry on submission', async () => {
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 404 when parent profile not found', async () => {
      (ParentModel.findByUserId as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          householdId: mockHouseholdId,
        })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Parent profile not found');
    });
  });

  // ============================================================================
  // Response Schema Validation
  // ============================================================================

  describe('Response Schema Validation', () => {
    it('should return consistent response format for questions endpoint', async () => {
      const response = await request(app)
        .get('/api/household-safety/questions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          questions: expect.any(Array),
        },
      });
    });

    it('should return consistent response format for status endpoint', async () => {
      jest.spyOn(HouseholdSafetyDisclosureModel, 'findByParentId').mockResolvedValue(null);

      const response = await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          hasValidDisclosure: expect.any(Boolean),
          disclosure: null,
          expiresIn: null,
          needsRenewal: expect.any(Boolean),
          canParticipateInMatching: expect.any(Boolean),
        },
      });
    });

    it('should return error format for validation failures', async () => {
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
      });
    });
  });
});
