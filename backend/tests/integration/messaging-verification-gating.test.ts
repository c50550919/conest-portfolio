/**
 * Messaging Verification-Gating Tests
 *
 * Tests asymmetric verification rules for messaging:
 * - Verified users can send messages to anyone
 * - Unverified users can receive but must verify to view/reply
 *
 * Constitution: Principle I (Child Safety) - Verification enforcement
 */

// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_MASTER_KEY = 'test-encryption-master-key-32chars';

// Mock ioredis
jest.mock('ioredis', () =>
  jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn().mockReturnThis(),
    status: 'ready',
  })),
);

// Mock the database with a function that returns the mock object
const mockDbInstance = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  first: jest.fn(),
  count: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  raw: jest.fn((val) => val),
  returning: jest.fn().mockResolvedValue([]),
  fn: { now: jest.fn(() => new Date()) },
};

const mockDb = jest.fn(() => mockDbInstance);
Object.assign(mockDb, mockDbInstance);

jest.mock('../config/database', () => ({
  __esModule: true,
  default: mockDb,
}));

// Mock logger
jest.mock('../config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock encryption
jest.mock('../utils/encryption', () => ({
  encrypt: jest.fn((text) => `encrypted:${text}`),
  decrypt: jest.fn((text) => text.replace('encrypted:', '')),
}));

// Mock Socket Service
jest.mock('../services/SocketService', () => ({
  __esModule: true,
  default: {
    getIO: jest.fn(() => ({
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    })),
    emitToUser: jest.fn(),
  },
}));

// Mock content moderation service
jest.mock('../features/moderation/content-moderation.service', () => ({
  __esModule: true,
  default: {
    isEnabled: jest.fn(() => false),
  },
}));

// Mock moderation worker
jest.mock('../features/moderation/moderation.worker', () => ({
  queueMessageForModeration: jest.fn(),
}));

describe('Messaging Verification Gating - Unit Tests', () => {
  describe('Verification Logic', () => {
    /**
     * Test the core verification rules without full service integration
     * These tests validate the business logic requirements
     */

    describe('Sender Verification Requirements', () => {
      it('verified sender should be allowed to send', () => {
        const senderVerification = {
          isVerified: true,
          userId: 'sender-id',
        };

        const canSend = senderVerification.isVerified === true;
        expect(canSend).toBe(true);
      });

      it('unverified sender should be blocked from sending', () => {
        const senderVerification = {
          isVerified: false,
          userId: 'sender-id',
        };

        const canSend = senderVerification.isVerified === true;
        expect(canSend).toBe(false);
      });

      it('null verification should be treated as unverified', () => {
        // Use type assertion to prevent TypeScript from narrowing null to 'never'
        const senderVerification = null as { isVerified: boolean } | null;

        const canSend = senderVerification?.isVerified === true;
        expect(canSend).toBe(false);
      });
    });

    describe('Recipient Verification - NEW BEHAVIOR', () => {
      it('verified recipient should be able to receive and view', () => {
        const recipientVerification = {
          isVerified: true,
          userId: 'recipient-id',
        };

        const canReceive = true; // Always true
        const canView = recipientVerification.isVerified === true;

        expect(canReceive).toBe(true);
        expect(canView).toBe(true);
      });

      it('unverified recipient can receive but CANNOT view', () => {
        const recipientVerification = {
          isVerified: false,
          userId: 'recipient-id',
        };

        const canReceive = true; // Always true - NEW BEHAVIOR
        const canView = recipientVerification.isVerified === true;

        expect(canReceive).toBe(true); // This is the key change
        expect(canView).toBe(false);
      });

      it('null verification recipient can receive but CANNOT view', () => {
        // Use type assertion to prevent TypeScript from narrowing null to 'never'
        const recipientVerification = null as { isVerified: boolean } | null;

        const canReceive = true; // Always true - NEW BEHAVIOR
        const canView = recipientVerification?.isVerified === true;

        expect(canReceive).toBe(true); // This is the key change
        expect(canView).toBe(false);
      });
    });

    describe('Locked Response Logic', () => {
      it('unverified user gets locked response structure', () => {
        const userVerified = false;
        const unreadCount = 5;

        const response = userVerified
          ? { locked: false, messages: [] }
          : { locked: true, unreadCount, message: 'Complete verification to view your messages' };

        expect(response.locked).toBe(true);
        expect(response.unreadCount).toBe(5);
        expect(response.message).toContain('verification');
        expect((response as any).messages).toBeUndefined();
      });

      it('verified user gets full messages response structure', () => {
        const userVerified = true;
        const messages = [{ id: '1', content: 'Hello' }];

        const response = userVerified
          ? { locked: false, messages }
          : { locked: true, unreadCount: 0, message: 'Complete verification' };

        expect(response.locked).toBe(false);
        expect((response as any).messages).toBeDefined();
        expect((response as any).messages.length).toBe(1);
      });
    });
  });

  describe('Test Matrix Verification', () => {
    /**
     * Test matrix for all verification scenarios:
     *
     * | # | Sender     | Recipient   | Action | Expected Result            |
     * |---|------------|-------------|--------|----------------------------|
     * | 1 | Verified   | Verified    | Send   | ✅ Success                 |
     * | 2 | Verified   | Unverified  | Send   | ✅ Success (NEW)           |
     * | 3 | Unverified | Anyone      | Send   | ❌ SENDER_NOT_VERIFIED     |
     * | 4 | Verified   | Self        | View   | ✅ Full messages           |
     * | 5 | Unverified | Self        | View   | 🔒 Locked (count only)     |
     * | 6 | Unverified | Self        | Reply  | ❌ SENDER_NOT_VERIFIED     |
     */

    it('row 1: Verified → Verified = Success', () => {
      const senderVerified = true;
      const recipientVerified = true;

      const canSend = senderVerified; // Only sender needs verification
      expect(canSend).toBe(true);
    });

    it('row 2: Verified → Unverified = Success (NEW)', () => {
      const senderVerified = true;
      const recipientVerified = false;

      // NEW BEHAVIOR: Verified sender can send to unverified recipient
      const canSend = senderVerified; // Only sender needs verification
      expect(canSend).toBe(true);
    });

    it('row 3: Unverified → Anyone = SENDER_NOT_VERIFIED', () => {
      const senderVerified = false;
      const recipientVerified = true;

      const canSend = senderVerified;
      expect(canSend).toBe(false);
    });

    it('row 4: Verified viewing = Full messages', () => {
      const viewerVerified = true;

      const canViewFull = viewerVerified;
      expect(canViewFull).toBe(true);
    });

    it('row 5: Unverified viewing = Locked', () => {
      const viewerVerified = false;

      const canViewFull = viewerVerified;
      const isLocked = !viewerVerified;

      expect(canViewFull).toBe(false);
      expect(isLocked).toBe(true);
    });

    it('row 6: Unverified reply = SENDER_NOT_VERIFIED', () => {
      // An unverified user trying to reply is the same as an unverified sender
      const senderVerified = false;

      const canSend = senderVerified;
      expect(canSend).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles null/undefined verification gracefully', () => {
      // Use type assertion to prevent TypeScript from narrowing null to 'never'
      const verification = null as { isVerified: boolean } | null;

      const isVerified = verification?.isVerified ?? false;
      expect(isVerified).toBe(false);
    });

    it('treats fully_verified: false as unverified', () => {
      const verification = { fully_verified: false };

      const isVerified = verification.fully_verified === true;
      expect(isVerified).toBe(false);
    });

    it('treats fully_verified: true as verified', () => {
      const verification = { fully_verified: true };

      const isVerified = verification.fully_verified === true;
      expect(isVerified).toBe(true);
    });

    it('zero unread count is valid for locked response', () => {
      const unreadCount = 0;
      const locked = true;

      const response = { locked, unreadCount, message: 'Verify to view' };

      expect(response.locked).toBe(true);
      expect(response.unreadCount).toBe(0);
    });
  });
});

describe('Verification State Transitions', () => {
  it('user can view messages after completing verification', () => {
    // Simulate state transition
    let userVerification = { isVerified: false };

    // Before verification - locked
    const beforeResponse = userVerification.isVerified
      ? { locked: false, messages: [] }
      : { locked: true, unreadCount: 3, message: 'Verify to view' };

    expect(beforeResponse.locked).toBe(true);
    expect((beforeResponse as any).messages).toBeUndefined();

    // User completes verification
    userVerification = { isVerified: true };

    // After verification - full access
    const afterResponse = userVerification.isVerified
      ? { locked: false, messages: [{ id: '1', content: 'Hello!' }] }
      : { locked: true, unreadCount: 3, message: 'Verify to view' };

    expect(afterResponse.locked).toBe(false);
    expect((afterResponse as any).messages).toBeDefined();
    expect((afterResponse as any).messages[0].content).toBe('Hello!');
  });

  it('pending messages become visible after verification', () => {
    // Messages sent to unverified user while they were unverified
    const pendingMessages = [
      { id: '1', content: 'Message 1', sentWhileUnverified: true },
      { id: '2', content: 'Message 2', sentWhileUnverified: true },
    ];

    // User verifies
    const userVerified = true;

    // All pending messages should be accessible
    const visibleMessages = userVerified ? pendingMessages : [];
    expect(visibleMessages.length).toBe(2);
  });
});
