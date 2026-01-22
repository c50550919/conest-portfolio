import { VerificationModel } from '../../models/Verification';
import { UserModel } from '../../models/User';
import { VerificationPaymentModel } from '../../models/VerificationPayment';
import logger from '../../config/logger';
import VeriffClient from './veriff/VeriffClient';
import CertnClient from './certn/CertnClient';
import TelnyxVerifyClient from './telnyx/TelnyxVerifyClient';

/**
 * Phone Verification Configuration
 *
 * Uses Telnyx Verify API in production (40% cheaper than Twilio)
 * Falls back to mock mode ONLY in development/test environments
 *
 * SECURITY: Mock mode is BLOCKED in production even if Telnyx isn't configured
 * This prevents accidental deployment with mock verification enabled
 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.SECURITY_MODE === 'production';
const TELNYX_CONFIGURED = TelnyxVerifyClient.isConfigured();

// In production, Telnyx MUST be configured - no mock fallback allowed
const USE_MOCK_PHONE = !TELNYX_CONFIGURED && !IS_PRODUCTION;

if (IS_PRODUCTION && !TELNYX_CONFIGURED) {
  logger.error('CRITICAL: Telnyx not configured in production mode. Phone verification will fail.');
} else if (USE_MOCK_PHONE) {
  logger.warn('⚠️  Development mode: Using mock phone verification (code: 123456)');
}

export const VerificationService = {
  /**
   * Send phone verification code
   *
   * Production: Uses Telnyx Verify API (manages code generation internally)
   * Development: Logs mock code "123456" to console
   *
   * @param userId - User ID to verify
   * @returns Verification metadata (verificationId in production)
   */
  async sendPhoneVerification(userId: string): Promise<{ verificationId?: string; expiresIn?: number }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const phoneNumber = user.phone || (user as any).phone_number;
    if (!phoneNumber) {
      throw new Error('Phone number not found for user');
    }

    // Use Telnyx in production, mock in development
    if (USE_MOCK_PHONE) {
      logger.info('[MOCK] Phone verification code sent', {
        userId,
        phone: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        mockCode: '123456',
        event: 'phone_verification_sent',
        mode: 'mock',
      });
      // Note: In development, check logs for the mock code (123456)
      return { expiresIn: 300 };
    }

    // Production: Use Telnyx Verify API
    const result = await TelnyxVerifyClient.sendCode(phoneNumber);

    logger.info('Phone verification code sent via Telnyx', {
      userId,
      phone: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      verificationId: result.verificationId,
      expiresIn: result.expiresInSeconds,
      event: 'phone_verification_sent',
      mode: 'telnyx',
    });

    return {
      verificationId: result.verificationId,
      expiresIn: result.expiresInSeconds,
    };
  },

  /**
   * Send phone verification code via voice call
   *
   * Fallback option for users who cannot receive SMS.
   * Production: Uses Telnyx Verify API voice call feature
   * Development: Logs mock code "123456" to console
   *
   * @param userId - User ID to verify
   * @returns Verification metadata (verificationId in production)
   */
  async sendPhoneVerificationVoice(userId: string): Promise<{ verificationId?: string; expiresIn?: number }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const phoneNumber = user.phone || (user as any).phone_number;
    if (!phoneNumber) {
      throw new Error('Phone number not found for user');
    }

    // Use mock in development
    if (USE_MOCK_PHONE) {
      logger.info('[MOCK] Phone verification voice call initiated', {
        userId,
        phone: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        mockCode: '123456',
        event: 'phone_verification_voice_sent',
        mode: 'mock',
      });
      // Note: In development, check logs for the mock code (123456)
      return { expiresIn: 300 };
    }

    // Production: Use Telnyx Verify API voice call
    const result = await TelnyxVerifyClient.sendVoiceCode(phoneNumber);

    logger.info('Phone verification voice call initiated via Telnyx', {
      userId,
      phone: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      verificationId: result.verificationId,
      expiresIn: result.expiresInSeconds,
      event: 'phone_verification_voice_sent',
      mode: 'telnyx',
    });

    return {
      verificationId: result.verificationId,
      expiresIn: result.expiresInSeconds,
    };
  },

  /**
   * Verify phone code
   *
   * Production: Validates via Telnyx Verify API (stateless on our side)
   * Development: Accepts "123456"
   *
   * @param userId - User ID
   * @param code - 6-digit verification code
   * @param phoneNumber - Phone number (required for Telnyx verification)
   * @returns true if code is valid
   */
  async verifyPhoneCode(userId: string, code: string, phoneNumber?: string): Promise<boolean> {
    // Get user for phone number if not provided
    let phone = phoneNumber;
    if (!phone) {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      phone = user.phone || (user as any).phone_number;
    }

    if (!phone) {
      throw new Error('Phone number required for verification');
    }

    let verified = false;

    // Use Telnyx in production, mock in development
    if (USE_MOCK_PHONE) {
      // Mock: Accept "123456" as valid code
      verified = code === '123456';
      logger.info('[MOCK] Phone verification attempt', {
        userId,
        verified,
      });
    } else {
      // Production: Validate via Telnyx
      const result = await TelnyxVerifyClient.verifyCode(phone, code);
      verified = result.verified;

      logger.info('Phone verification via Telnyx', {
        userId,
        status: result.status,
        verified,
      });
    }

    if (!verified) {
      return false;
    }

    // Update verification record
    const verification = await VerificationModel.findByUserId(userId);
    if (!verification) {
      throw new Error('Verification record not found');
    }

    await VerificationModel.update(userId, {
      phone_verified: true,
      phone_verification_date: new Date(),
    });

    // Update user record
    await UserModel.update(userId, { phone_verified: true });

    // Recalculate verification score
    await VerificationModel.updateVerificationScore(userId);

    return true;
  },

  // Email verification
  async sendEmailVerification(userId: string): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate verification token
    const token = Math.random().toString(36).substring(2, 15);

    // In production, store token in Redis
    // await redisClient.setEx(`email_verify:${userId}`, 3600, token);

    // TODO: Integrate with email service (SendGrid/SES) for production
    const verificationLink = `${process.env.API_URL}/verify-email?token=${token}`;

    if (!IS_PRODUCTION) {
      logger.info('[MOCK] Email verification link generated', {
        userId,
        email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        verificationLink,
        event: 'email_verification_sent',
        mode: 'mock',
      });
    } else {
      // In production, this should send via email service
      logger.warn('Email verification attempted but email service not configured', {
        userId,
        event: 'email_verification_failed',
        reason: 'email_service_not_configured',
      });
    }
  },

  async verifyEmail(userId: string): Promise<void> {
    // Update verification record
    await VerificationModel.update(userId, {
      email_verified: true,
      email_verification_date: new Date(),
    });

    // Update user record
    await UserModel.update(userId, { email_verified: true });

    // Recalculate verification score
    await VerificationModel.updateVerificationScore(userId);
  },

  // ID Verification (Veriff)
  async initiateIDVerification(userId: string): Promise<{ verificationUrl: string; sessionId: string }> {
    try {
      logger.info(`Initiating Veriff ID verification for user: ${userId}`);

      // Get user email for Veriff session
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create Veriff session
      const callbackUrl = `${process.env.API_URL}/api/webhooks/veriff`;
      const session = await VeriffClient.createSession(userId, callbackUrl);

      // Update verification status to pending
      await VerificationModel.update(userId, {
        id_verification_status: 'pending',
        id_verification_data: JSON.stringify({
          sessionId: session.verification.id,
          sessionUrl: session.verification.url,
          createdAt: new Date().toISOString(),
        }),
      });

      logger.info(`Veriff session created for user ${userId}`, {
        sessionId: session.verification.id,
      });

      return {
        verificationUrl: session.verification.url,
        sessionId: session.verification.id,
      };
    } catch (error: any) {
      logger.error('Failed to initiate ID verification', {
        userId,
        error: error.message,
      });
      throw new Error(`ID verification initiation failed: ${error.message}`);
    }
  },

  async completeIDVerification(userId: string, sessionId: string): Promise<void> {
    try {
      logger.info(`Processing Veriff decision for user ${userId}`, { sessionId });

      // Get verification decision from Veriff
      const decision = await VeriffClient.getDecision(sessionId);

      // Map Veriff status to our internal status
      let internalStatus: 'approved' | 'rejected' | 'pending';

      switch (decision.verification.status) {
        case 'approved':
          internalStatus = 'approved';
          break;
        case 'declined':
        case 'expired':
        case 'abandoned':
          internalStatus = 'rejected';
          break;
        case 'resubmission_requested':
          internalStatus = 'pending';
          break;
        default:
          internalStatus = 'pending';
      }

      // Update verification record
      await VerificationModel.update(userId, {
        id_verification_status: internalStatus,
        id_verification_date: new Date(),
        id_verification_data: JSON.stringify({
          sessionId,
          status: decision.verification.status,
          reason: decision.verification.reason,
          completedAt: new Date().toISOString(),
        }),
      });

      // Recalculate verification score
      await VerificationModel.updateVerificationScore(userId);

      logger.info(`ID verification completed for user ${userId}`, {
        sessionId,
        status: internalStatus,
      });
    } catch (error: any) {
      logger.error('Failed to complete ID verification', {
        userId,
        sessionId,
        error: error.message,
      });
      throw new Error(`ID verification completion failed: ${error.message}`);
    }
  },

  // Background Check (Certn)
  async initiateBackgroundCheck(userId: string): Promise<void> {
    try {
      logger.info(`Initiating Certn background check for user: ${userId}`);

      // Get user information
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create Certn applicant
      const applicant = await CertnClient.createApplicant({
        email: user.email,
        phone: user.phone,
        custom_id: userId,
      });

      // Create Certn application with basic package
      const application = await CertnClient.createApplication({
        applicant_id: applicant.id,
        package: 'basic', // Can be configured based on requirements
      });

      // Update verification status to pending
      await VerificationModel.update(userId, {
        background_check_status: 'pending',
        certn_applicant_id: applicant.id,
        background_check_report_id: application.id,
      });

      logger.info(`Certn background check initiated for user ${userId}`, {
        applicantId: applicant.id,
        applicationId: application.id,
      });
    } catch (error: any) {
      logger.error('Failed to initiate background check', {
        userId,
        error: error.message,
      });

      // Update status to rejected on failure
      await VerificationModel.update(userId, {
        background_check_status: 'rejected',
      });

      throw new Error(`Background check initiation failed: ${error.message}`);
    }
  },

  /**
   * Process Certn background check completion
   * Called from webhook handler
   */
  async processBackgroundCheckResult(
    userId: string,
    applicationId: string,
  ): Promise<void> {
    try {
      logger.info(`Processing Certn result for user ${userId}`, { applicationId });

      // Get application details from Certn
      const application = await CertnClient.getApplication(applicationId);

      // Parse status
      const internalStatus = CertnClient.parseStatus(application.report_status || 'PENDING');

      // Extract flagged records if status is 'consider'
      let flaggedRecords = null;
      let requiresAdminReview = false;

      if (internalStatus === 'consider') {
        flaggedRecords = CertnClient.extractFlaggedRecords(application);
        requiresAdminReview = true;
      }

      // Update verification record
      if (requiresAdminReview) {
        await VerificationModel.markForAdminReview(userId, flaggedRecords);
      } else {
        await VerificationModel.update(userId, {
          background_check_status: internalStatus,
          background_check_date: new Date(),
        });

        // Only update score if not requiring admin review
        await VerificationModel.updateVerificationScore(userId);
      }

      logger.info(`Background check processed for user ${userId}`, {
        status: internalStatus,
        requiresAdminReview,
      });

      // Handle automatic refund for rejected background checks
      if (internalStatus === 'rejected') {
        await this.processAutomaticRefund(userId);
      }
    } catch (error: any) {
      logger.error('Failed to process background check result', {
        userId,
        applicationId,
        error: error.message,
      });
      throw new Error(`Background check processing failed: ${error.message}`);
    }
  },

  /**
   * Process automatic refund for failed background check
   * 100% refund policy for automated failures
   */
  async processAutomaticRefund(userId: string): Promise<void> {
    try {
      const payments = await VerificationPaymentModel.findByUserId(userId, 1);
      const payment = payments[0];

      if (!payment || payment.status !== 'succeeded') {
        logger.info(`No refundable payment found for user ${userId}`);
        return;
      }

      // Process 100% refund for automated failure
      await VerificationPaymentModel.processRefund(payment.id, {
        reason: 'automated_fail',
        amount: payment.amount, // Full refund
      });

      logger.info(`Automatic refund processed for user ${userId}`, {
        paymentId: payment.id,
        amount: payment.amount,
      });
    } catch (error: any) {
      logger.error('Failed to process automatic refund', {
        userId,
        error: error.message,
      });
      // Don't throw - refund failure shouldn't block verification update
    }
  },

  // Income Verification (Real structure, but simplified)
  async initiateIncomeVerification(userId: string, _documents: any[]): Promise<void> {
    logger.info(`Initiating income verification for user: ${userId}`);

    // In production, this would integrate with Plaid or manual document review
    // For now, we'll just mark it as pending
    await VerificationModel.update(userId, {
      income_verification_status: 'pending',
    });

    // MOCK: Auto-approve after 2 seconds
    setTimeout(async () => {
      await VerificationModel.update(userId, {
        income_verification_status: 'verified',
        income_verification_date: new Date(),
        income_range: '25000-50000', // Mock income range
      });

      // Recalculate verification score
      await VerificationModel.updateVerificationScore(userId);

      logger.info(`Income verification completed for user ${userId}`);
    }, 2000);
  },

  // Get verification status
  async getVerificationStatus(userId: string) {
    const verification = await VerificationModel.findByUserId(userId);

    // Return default values for users without verification records
    // This is expected for new users who haven't started verification
    if (!verification) {
      return {
        email_verified: false,
        phone_verified: false,
        id_verification_status: 'pending',
        background_check_status: 'pending',
        income_verification_status: 'pending',
        verification_score: 0,
        fully_verified: false,
      };
    }

    // Calculate expiration dates for time-limited verifications
    // ID verification: 1 year validity (Veriff standard)
    // Background check: 2 years validity (Certn standard)
    // TODO: Store actual approval timestamps in database for accurate expiration tracking
    let idExpirationDate: string | null = null;
    let bgCheckExpirationDate: string | null = null;

    if (verification.id_verification_status === 'approved' && verification.updated_at) {
      const expiryDate = new Date(verification.updated_at);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      idExpirationDate = expiryDate.toISOString();
    }

    if (verification.background_check_status === 'approved' && verification.updated_at) {
      const expiryDate = new Date(verification.updated_at);
      expiryDate.setFullYear(expiryDate.getFullYear() + 2);
      bgCheckExpirationDate = expiryDate.toISOString();
    }

    return {
      email_verified: verification.email_verified,
      phone_verified: verification.phone_verified,
      id_verification_status: verification.id_verification_status,
      background_check_status: verification.background_check_status,
      income_verification_status: verification.income_verification_status,
      verification_score: verification.verification_score,
      fully_verified: verification.fully_verified,
      id_expiration_date: idExpirationDate,
      bg_check_expiration_date: bgCheckExpirationDate,
    };
  },
};
