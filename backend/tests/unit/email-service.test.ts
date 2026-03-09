/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * Unit tests for EmailService (SendGrid integration).
 * Verifies email content, FCRA compliance, and fire-and-forget error handling.
 */

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

jest.mock('../../src/config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import sgMail from '@sendgrid/mail';
import logger from '../../src/config/logger';
import { EmailService, FCRAAdverseActionData } from '../../src/services/emailService';

describe('EmailService', () => {
  let emailService: EmailService;

  const testConfig = {
    apiKey: 'SG.test-api-key',
    fromEmail: 'noreply@conest.app',
    fromName: 'CoNest',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    emailService = new EmailService(testConfig);
  });

  const getSentMessage = (): Record<string, any> => {
    expect(sgMail.send).toHaveBeenCalledTimes(1);
    return (sgMail.send as jest.Mock).mock.calls[0][0];
  };

  describe('sendWelcomeEmail', () => {
    it('sends with correct to, from, subject containing "Welcome", and html containing firstName', async () => {
      await emailService.sendWelcomeEmail('jane@example.com', 'Jane');

      const msg = getSentMessage();
      expect(msg.to).toBe('jane@example.com');
      expect(msg.from).toEqual({ email: 'noreply@conest.app', name: 'CoNest' });
      expect(msg.subject).toContain('Welcome');
      expect(msg.html).toContain('Jane');
    });
  });

  describe('sendEmailVerification', () => {
    it('html contains token and "verify-email"', async () => {
      const token = 'abc123-verification-token';
      await emailService.sendEmailVerification('user@example.com', token);

      const msg = getSentMessage();
      expect(msg.html).toContain(token);
      expect(msg.html).toContain('verify-email');
    });
  });

  describe('sendAccountDeletionConfirmation', () => {
    it('subject contains "deleted"', async () => {
      await emailService.sendAccountDeletionConfirmation('user@example.com');

      const msg = getSentMessage();
      // Subject should indicate the account has been deleted
      expect(msg.subject.toLowerCase()).toContain('deleted');
    });
  });

  describe('sendFCRAPreAdverseNotice', () => {
    const fcraData: FCRAAdverseActionData = {
      firstName: 'John',
      reportAgency: 'Certn Inc.',
      reportAgencyPhone: '1-888-123-4567',
      reportAgencyAddress: '123 Report St, Suite 100, Vancouver, BC V6B 1A1',
      adverseReason: 'Criminal record found',
    };

    it('html contains "pre-adverse", agency name, "dispute", and "rights"', async () => {
      await emailService.sendFCRAPreAdverseNotice('john@example.com', fcraData);

      const msg = getSentMessage();
      const htmlLower = msg.html.toLowerCase();

      expect(htmlLower).toContain('pre-adverse');
      expect(msg.html).toContain('Certn Inc.');
      expect(htmlLower).toContain('dispute');
      expect(htmlLower).toContain('rights');
    });
  });

  describe('sendFCRAFinalAdverseNotice', () => {
    const fcraData: FCRAAdverseActionData = {
      firstName: 'Jane',
      reportAgency: 'Certn Inc.',
      reportAgencyPhone: '1-888-123-4567',
      reportAgencyAddress: '123 Report St, Suite 100, Vancouver, BC V6B 1A1',
    };

    it('html contains "adverse action", "reinvestigation", and "free copy"', async () => {
      await emailService.sendFCRAFinalAdverseNotice('jane@example.com', fcraData);

      const msg = getSentMessage();
      const htmlLower = msg.html.toLowerCase();

      expect(htmlLower).toContain('adverse action');
      expect(htmlLower).toContain('reinvestigation');
      expect(htmlLower).toContain('free copy');
    });
  });

  describe('error handling', () => {
    it('logs error but does NOT throw when sgMail.send rejects', async () => {
      (sgMail.send as jest.Mock).mockRejectedValueOnce(new Error('SendGrid API error'));

      // Should NOT throw
      await expect(
        emailService.sendWelcomeEmail('user@example.com', 'Test'),
      ).resolves.toBeUndefined();

      // Should log the error
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send email',
        expect.objectContaining({
          to: 'user@example.com',
          error: 'SendGrid API error',
        }),
      );
    });
  });
});
