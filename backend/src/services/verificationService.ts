import { VerificationModel } from '../models/Verification';
import { UserModel } from '../models/User';
import logger from '../config/logger';

// MOCK Checkr API
const mockCheckrBackgroundCheck = async (userId: string): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  logger.info(`[MOCK] Checkr background check initiated for user: ${userId}`);

  // Always return "clear" for development
  return 'clear';
};

// MOCK Jumio API
const mockJumioIDVerification = async (userId: string): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  logger.info(`[MOCK] Jumio ID verification initiated for user: ${userId}`);

  // Always return "approved" for development
  return 'approved';
};

// MOCK Twilio SMS
const mockTwilioSendSMS = async (phone: string, code: string): Promise<void> => {
  logger.info(`[MOCK] SMS sent to ${phone}: Your verification code is ${code}`);
  console.log(`\n📱 MOCK SMS to ${phone}: Verification code is ${code}\n`);
};

export const VerificationService = {
  // Phone verification
  async sendPhoneVerification(userId: string): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user || !user.phone_number) {
      throw new Error('User or phone number not found');
    }

    // Generate 6-digit code
    const code = '123456'; // MOCK: Always use this code for development

    // In production, store code in Redis with expiration
    // await redisClient.setEx(`phone_verify:${userId}`, 600, code);

    // MOCK: Send SMS via Twilio
    await mockTwilioSendSMS(user.phone_number, code);
  },

  async verifyPhoneCode(userId: string, code: string): Promise<boolean> {
    // MOCK: Accept "123456" as valid code
    if (code !== '123456') {
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

    // MOCK: Log verification link
    const verificationLink = `${process.env.API_URL}/verify-email?token=${token}`;
    logger.info(`[MOCK] Email verification link for ${user.email}: ${verificationLink}`);
    console.log(`\n📧 MOCK Email to ${user.email}: Click to verify: ${verificationLink}\n`);
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

  // ID Verification (Jumio - MOCK)
  async initiateIDVerification(userId: string): Promise<{ verificationUrl: string }> {
    logger.info(`Initiating ID verification for user: ${userId}`);

    // MOCK: Return a fake verification URL
    const mockUrl = `https://mock-jumio.example.com/verify/${userId}`;

    // Update verification status to pending
    await VerificationModel.update(userId, {
      id_verification_status: 'pending',
    });

    return { verificationUrl: mockUrl };
  },

  async completeIDVerification(userId: string): Promise<void> {
    // MOCK: Simulate Jumio webhook callback
    const result = await mockJumioIDVerification(userId);

    await VerificationModel.update(userId, {
      id_verification_status: result === 'approved' ? 'approved' : 'rejected',
      id_verification_date: new Date(),
    });

    // Recalculate verification score
    await VerificationModel.updateVerificationScore(userId);

    logger.info(`ID verification completed for user ${userId}: ${result}`);
  },

  // Background Check (Checkr - MOCK)
  async initiateBackgroundCheck(userId: string): Promise<void> {
    logger.info(`Initiating background check for user: ${userId}`);

    // Update verification status to pending
    await VerificationModel.update(userId, {
      background_check_status: 'pending',
    });

    // MOCK: Simulate async background check
    setTimeout(async () => {
      try {
        const result = await mockCheckrBackgroundCheck(userId);

        await VerificationModel.update(userId, {
          background_check_status: result as any,
          background_check_date: new Date(),
          background_check_report_id: `mock_report_${userId}`,
        });

        // Recalculate verification score
        await VerificationModel.updateVerificationScore(userId);

        logger.info(`Background check completed for user ${userId}: ${result}`);
      } catch (error) {
        logger.error(`Background check failed for user ${userId}:`, error);
      }
    }, 3000); // 3 second delay to simulate async processing
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
    if (!verification) {
      throw new Error('Verification record not found');
    }

    return {
      email_verified: verification.email_verified,
      phone_verified: verification.phone_verified,
      id_verification_status: verification.id_verification_status,
      background_check_status: verification.background_check_status,
      income_verification_status: verification.income_verification_status,
      verification_score: verification.verification_score,
      fully_verified: verification.fully_verified,
    };
  },
};
