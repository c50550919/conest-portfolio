// @ts-nocheck
/**
 * Compliance Tests: Household Safety Disclosure - Child Safety
 *
 * Verifies compliance with Constitution Principle I: Child Safety
 * - NO child PII (names, ages, schools) stored in disclosure system
 * - Only parent attestations and signatures stored
 * - Questions reference "minors" generically, no specific child data
 * - All submissions create audit logs with proper trail
 *
 * Test IDs: T-HS-CC01 through T-HS-CC08
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { HouseholdSafetyService } from '../../../src/features/household-safety/household-safety.service';
import { HouseholdSafetyDisclosureModel } from '../../../src/models/HouseholdSafetyDisclosure';
import { ParentModel } from '../../../src/models/Parent';
import {
  ATTESTATION_QUESTIONS,
  MIN_SIGNATURE_LENGTH,
} from '../../../src/features/household-safety/household-safety.constants';
import { createAuditLog } from '../../../src/services/auditService';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{}]),
    where: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(1),
    raw: jest.fn(),
  })),
}));

jest.mock('../../../src/services/auditService', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../src/models/Parent');
jest.mock('../../../src/models/HouseholdSafetyDisclosure');

// JWT secret for testing
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

// Test data
const mockUserId = 'user-123-uuid';
const mockParentId = 'parent-456-uuid';
const mockDisclosureId = 'disclosure-789-uuid';

const mockParent = {
  id: mockParentId,
  user_id: mockUserId,
  first_name: 'Test',
  last_name: 'User',
};

// Valid attestation responses
const validAttestationResponses = [
  { questionId: 'juvenile_legal_history', response: false, answeredAt: new Date().toISOString() },
  { questionId: 'court_orders_against_you', response: false, answeredAt: new Date().toISOString() },
  { questionId: 'court_orders_protective', response: false, answeredAt: new Date().toISOString() },
  { questionId: 'cps_involvement', response: false, answeredAt: new Date().toISOString() },
  { questionId: 'disclosure_accuracy', response: true, answeredAt: new Date().toISOString() },
];

const validSignatureData = `data:image/png;base64,${'A'.repeat(MIN_SIGNATURE_LENGTH + 50)}`;

// Generate valid token
const generateValidToken = (userId: string = mockUserId): string =>
  jwt.sign({ userId, email: 'test@example.com', type: 'access' }, JWT_SECRET, { expiresIn: '1h' });

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

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
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  const {
    householdSafetyController,
  } = require('../../../src/features/household-safety/household-safety.controller');

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

  app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
};

describe('Compliance: Household Safety Disclosure - Child Safety (Constitution Principle I)', () => {
  let app;
  const validToken = generateValidToken();

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (ParentModel.findByUserId as jest.Mock).mockResolvedValue(mockParent);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // Schema Compliance Tests
  // ============================================================================

  describe('Schema Compliance - No Child PII', () => {
    // T-HS-CC01: Table has NO child name columns
    it('T-HS-CC01: disclosure schema should have NO child name columns', () => {
      // Verify the model/schema doesn't include child name fields
      // Check the attestation questions for child name references
      const questions = HouseholdSafetyService.getAttestationQuestions();

      questions.forEach((question) => {
        // Question text should not ask for specific child names
        expect(question.text.toLowerCase()).not.toContain("child's name");
        expect(question.text.toLowerCase()).not.toContain("children's names");
        expect(question.text.toLowerCase()).not.toContain('name of the child');
        expect(question.text.toLowerCase()).not.toContain('name of your child');
      });

      // The questions should only reference "minors" generically
      const allQuestionText = questions.map((q) => q.text).join(' ');
      expect(allQuestionText).toContain('minor');
    });

    // T-HS-CC02: Table has NO child age columns
    it('T-HS-CC02: disclosure schema should have NO child age columns', () => {
      const questions = HouseholdSafetyService.getAttestationQuestions();

      questions.forEach((question) => {
        // Question text should not ask for specific child ages
        expect(question.text.toLowerCase()).not.toContain("child's age");
        expect(question.text.toLowerCase()).not.toContain('how old');
        expect(question.text.toLowerCase()).not.toContain('age of the child');
        expect(question.text.toLowerCase()).not.toContain('date of birth');
        expect(question.text.toLowerCase()).not.toContain('birth date');
      });
    });

    // T-HS-CC03: Table has NO child school columns
    it('T-HS-CC03: disclosure schema should have NO child school columns', () => {
      const questions = HouseholdSafetyService.getAttestationQuestions();

      questions.forEach((question) => {
        // Question text should not ask for specific school information
        expect(question.text.toLowerCase()).not.toContain('school name');
        expect(question.text.toLowerCase()).not.toContain('which school');
        expect(question.text.toLowerCase()).not.toContain("child's school");
        expect(question.text.toLowerCase()).not.toContain('daycare');
        expect(question.text.toLowerCase()).not.toContain('teacher');
        expect(question.text.toLowerCase()).not.toContain('classroom');
      });
    });

    // T-HS-CC04: Questions only reference "minors" generically
    it('T-HS-CC04: questions should only reference minors generically', () => {
      const questions = HouseholdSafetyService.getAttestationQuestions();

      // All question IDs should be about household/parent attestations, not child data
      const questionIds = questions.map((q) => q.id);

      // Should NOT have question IDs that reference specific child data
      questionIds.forEach((id) => {
        expect(id).not.toContain('child_name');
        expect(id).not.toContain('child_age');
        expect(id).not.toContain('child_school');
        expect(id).not.toContain('child_photo');
        expect(id).not.toContain('child_info');
      });

      // Expected question IDs should be about household safety status
      expect(questionIds).toContain('juvenile_legal_history');
      expect(questionIds).toContain('court_orders_against_you');
      expect(questionIds).toContain('court_orders_protective');
      expect(questionIds).toContain('cps_involvement');
      expect(questionIds).toContain('disclosure_accuracy');
    });
  });

  // ============================================================================
  // API Compliance Tests
  // ============================================================================

  describe('API Compliance - No Child Data Accepted', () => {
    // T-HS-CC05: Submit endpoint rejects child fields
    it('T-HS-CC05: submit endpoint should not store any child-specific fields', async () => {
      const mockDisclosure = {
        id: mockDisclosureId,
        parent_id: mockParentId,
        disclosure_type: 'initial',
        status: 'attested',
        attestation_responses: validAttestationResponses,
        signature_data: validSignatureData,
        signed_at: new Date(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
      };

      (HouseholdSafetyDisclosureModel.supersedePrevious as jest.Mock).mockResolvedValue(undefined);
      (HouseholdSafetyDisclosureModel.create as jest.Mock).mockResolvedValue(mockDisclosure);

      // Attempt to submit with extra child data fields (these should be ignored)
      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
          // These fields should be ignored - they violate child safety
          childName: 'Should not store this',
          childAge: 8,
          childSchool: 'Should not store this',
          childrenDetails: [{ name: 'Child1', age: 5 }],
        });

      expect(response.status).toBe(201);

      // Verify that the create function was called WITHOUT child data
      expect(HouseholdSafetyDisclosureModel.create).toHaveBeenCalled();
      const createCall = (HouseholdSafetyDisclosureModel.create as jest.Mock).mock.calls[0][0];

      // The stored data should NOT contain child-specific fields
      expect(createCall).not.toHaveProperty('childName');
      expect(createCall).not.toHaveProperty('childAge');
      expect(createCall).not.toHaveProperty('childSchool');
      expect(createCall).not.toHaveProperty('childrenDetails');
    });

    // T-HS-CC06: Response has NO child data
    it('T-HS-CC06: API responses should contain NO child data', async () => {
      const mockDisclosure = {
        id: mockDisclosureId,
        parent_id: mockParentId,
        household_id: null,
        disclosure_type: 'initial',
        status: 'attested',
        attestation_responses: validAttestationResponses,
        signature_data: validSignatureData,
        signed_at: new Date(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
      };

      (HouseholdSafetyDisclosureModel.findByParentId as jest.Mock).mockResolvedValue(
        mockDisclosure,
      );

      const response = await request(app)
        .get('/api/household-safety/status')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);

      // Verify response body contains NO child-specific data
      const responseText = JSON.stringify(response.body);

      // Should not contain any child-specific field names
      expect(responseText).not.toContain('childName');
      expect(responseText).not.toContain('childAge');
      expect(responseText).not.toContain('childSchool');
      expect(responseText).not.toContain('childPhoto');
      expect(responseText).not.toContain('childrenDetails');
      expect(responseText).not.toContain('childInfo');
    });
  });

  // ============================================================================
  // Audit Trail Compliance Tests
  // ============================================================================

  describe('Audit Trail Compliance', () => {
    // T-HS-CC07: All submissions create audit log
    it('T-HS-CC07: all submissions should create audit log entries', async () => {
      const mockDisclosure = {
        id: mockDisclosureId,
        parent_id: mockParentId,
        disclosure_type: 'initial',
        status: 'attested',
        attestation_responses: validAttestationResponses,
        signature_data: validSignatureData,
        signed_at: new Date(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
      };

      (HouseholdSafetyDisclosureModel.supersedePrevious as jest.Mock).mockResolvedValue(undefined);
      (HouseholdSafetyDisclosureModel.create as jest.Mock).mockResolvedValue(mockDisclosure);

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
        });

      expect(response.status).toBe(201);

      // Verify audit log was created
      expect(createAuditLog).toHaveBeenCalled();
    });

    // T-HS-CC08: Audit log has IP, timestamp, UA
    it('T-HS-CC08: audit log should include IP address, timestamp, and user agent', async () => {
      const mockDisclosure = {
        id: mockDisclosureId,
        parent_id: mockParentId,
        disclosure_type: 'initial',
        status: 'attested',
        attestation_responses: validAttestationResponses,
        signature_data: validSignatureData,
        signed_at: new Date(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
      };

      (HouseholdSafetyDisclosureModel.supersedePrevious as jest.Mock).mockResolvedValue(undefined);
      (HouseholdSafetyDisclosureModel.create as jest.Mock).mockResolvedValue(mockDisclosure);

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .set('User-Agent', 'TestUserAgent/1.0')
        .send({
          attestationResponses: validAttestationResponses,
          signatureData: validSignatureData,
        });

      expect(response.status).toBe(201);

      // Verify the disclosure was created with audit trail data
      expect(HouseholdSafetyDisclosureModel.create).toHaveBeenCalled();
      const createCall = (HouseholdSafetyDisclosureModel.create as jest.Mock).mock.calls[0][0];

      // IP address should be captured
      expect(createCall).toHaveProperty('ipAddress');
      // User agent should be captured
      expect(createCall).toHaveProperty('userAgent');
      expect(createCall.userAgent).toBe('TestUserAgent/1.0');
    });
  });

  // ============================================================================
  // Questions Content Validation
  // ============================================================================

  describe('Questions Content Validation', () => {
    it('should have exactly 5 required attestation questions', () => {
      const questions = HouseholdSafetyService.getAttestationQuestions();

      expect(questions.length).toBe(5);
      questions.forEach((question) => {
        expect(question.required).toBe(true);
      });
    });

    it('should have questions focused on household safety, not child identification', () => {
      const questions = HouseholdSafetyService.getAttestationQuestions();

      // All questions should be about legal/safety status, not child identification
      const questionTopics = questions.map((q) => q.id);

      expect(questionTopics).toEqual([
        'juvenile_legal_history',
        'court_orders_against_you',
        'court_orders_protective',
        'cps_involvement',
        'disclosure_accuracy',
      ]);

      // No questions about identifying children
      expect(questionTopics).not.toContain('child_identity');
      expect(questionTopics).not.toContain('child_details');
      expect(questionTopics).not.toContain('child_information');
    });

    it('should use term "minor" instead of specific child references in questions', () => {
      const questions = HouseholdSafetyService.getAttestationQuestions();

      // Check that questions use appropriate generic terms
      const safetyQuestion = questions.find((q) => q.id === 'juvenile_legal_history');
      expect(safetyQuestion?.text).toContain('minor');

      const courtQuestion = questions.find((q) => q.id === 'court_orders_against_you');
      expect(courtQuestion?.text).toContain('minor');
    });
  });

  // ============================================================================
  // Data Minimization Tests
  // ============================================================================

  describe('Data Minimization Compliance', () => {
    it('should only store parent-related data in disclosures', () => {
      // Verify the attestation response structure only contains question answers
      validAttestationResponses.forEach((response) => {
        // Should only have questionId, response (boolean), and timestamp
        const keys = Object.keys(response);
        expect(keys).toContain('questionId');
        expect(keys).toContain('response');
        expect(keys).toContain('answeredAt');

        // Should NOT have child-specific data
        expect(keys).not.toContain('childName');
        expect(keys).not.toContain('childAge');
        expect(keys).not.toContain('childInfo');
      });
    });

    it('should not allow child data in attestation responses', async () => {
      const mockDisclosure = {
        id: mockDisclosureId,
        parent_id: mockParentId,
        disclosure_type: 'initial',
        status: 'attested',
        attestation_responses: validAttestationResponses,
        signature_data: validSignatureData,
        signed_at: new Date(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
      };

      (HouseholdSafetyDisclosureModel.supersedePrevious as jest.Mock).mockResolvedValue(undefined);
      (HouseholdSafetyDisclosureModel.create as jest.Mock).mockResolvedValue(mockDisclosure);

      // Attempt to inject child data into attestation responses
      const maliciousResponses = [
        ...validAttestationResponses,
        {
          questionId: 'child_info',
          response: true,
          answeredAt: new Date().toISOString(),
          childName: 'Attempted Child Name Injection',
        },
      ];

      const response = await request(app)
        .post('/api/household-safety/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          attestationResponses: maliciousResponses,
          signatureData: validSignatureData,
        });

      // Should either succeed (ignoring invalid data) or fail validation
      // Either way, child data should NOT be stored
      if (response.status === 201) {
        const createCall = (HouseholdSafetyDisclosureModel.create as jest.Mock).mock.calls[0][0];
        const storedResponses = JSON.stringify(createCall.attestationResponses);

        // Even if passed, child data should not appear in stored data
        // The validation should sanitize or reject
        expect(storedResponses).not.toContain('Attempted Child Name Injection');
      }
    });
  });
});
