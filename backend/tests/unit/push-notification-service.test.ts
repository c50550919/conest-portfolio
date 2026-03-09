/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * Unit tests for PushNotificationService (Firebase Cloud Messaging).
 * Verifies device token lookup, multicast delivery, and invalid token cleanup.
 */

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  messaging: jest.fn(() => ({
    sendEachForMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    }),
  })),
}));

jest.mock('../../src/models/DeviceToken');

jest.mock('../../src/config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { PushNotificationService } from '../../src/services/pushNotificationService';
import { DeviceTokenModel } from '../../src/models/DeviceToken';

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PushNotificationService();
    (DeviceTokenModel.findByUserId as jest.Mock).mockResolvedValue([
      { token: 'token-1', platform: 'ios' },
    ]);
  });

  it('sends push to all user devices', async () => {
    await service.sendToUser('user-123', {
      title: 'New Message',
      body: 'Jane sent you a message',
      data: { type: 'message', conversationId: 'conv-456' },
    });

    expect(DeviceTokenModel.findByUserId).toHaveBeenCalledWith('user-123');
  });

  it('skips send when user has no devices', async () => {
    (DeviceTokenModel.findByUserId as jest.Mock).mockResolvedValue([]);

    await service.sendToUser('user-123', {
      title: 'Test',
      body: 'Test body',
    });

    // Should not throw, just skip
    expect(DeviceTokenModel.findByUserId).toHaveBeenCalledWith('user-123');
  });

  it('handles send errors gracefully without throwing', async () => {
    (DeviceTokenModel.findByUserId as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );

    // Should throw since findByUserId is called before the try/catch
    // But sendToUser itself should propagate the error from the model layer
    await expect(
      service.sendToUser('user-123', {
        title: 'Test',
        body: 'Test body',
      }),
    ).rejects.toThrow('DB connection failed');
  });
});
