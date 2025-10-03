import db from '../config/database';

export interface Verification {
  id: string;
  user_id: string;

  // ID Verification (Jumio)
  id_verification_status: 'pending' | 'approved' | 'rejected' | 'expired';
  id_verification_date?: Date;
  id_verification_data?: string; // JSON encrypted data

  // Background Check (Checkr)
  background_check_status: 'pending' | 'clear' | 'consider' | 'suspended';
  background_check_date?: Date;
  background_check_report_id?: string;

  // Income Verification
  income_verification_status: 'pending' | 'verified' | 'rejected';
  income_verification_date?: Date;
  income_range?: string;

  // Phone Verification
  phone_verified: boolean;
  phone_verification_date?: Date;

  // Email Verification
  email_verified: boolean;
  email_verification_date?: Date;

  // Overall verification
  verification_score: number; // 0-100
  fully_verified: boolean;

  created_at: Date;
  updated_at: Date;
}

export interface CreateVerificationData {
  user_id: string;
}

export const VerificationModel = {
  async create(data: CreateVerificationData): Promise<Verification> {
    const verificationData = {
      ...data,
      id_verification_status: 'pending',
      background_check_status: 'pending',
      income_verification_status: 'pending',
      phone_verified: false,
      email_verified: false,
      verification_score: 0,
      fully_verified: false,
    };

    const [verification] = await db('verifications')
      .insert(verificationData)
      .returning('*');
    return verification;
  },

  async findByUserId(userId: string): Promise<Verification | undefined> {
    return await db('verifications').where({ user_id: userId }).first();
  },

  async update(userId: string, data: Partial<Verification>): Promise<Verification> {
    const [verification] = await db('verifications')
      .where({ user_id: userId })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return verification;
  },

  async updateVerificationScore(userId: string): Promise<number> {
    const verification = await this.findByUserId(userId);
    if (!verification) throw new Error('Verification record not found');

    let score = 0;
    if (verification.email_verified) score += 15;
    if (verification.phone_verified) score += 15;
    if (verification.id_verification_status === 'approved') score += 30;
    if (verification.background_check_status === 'clear') score += 30;
    if (verification.income_verification_status === 'verified') score += 10;

    const fullyVerified = score >= 90;

    await this.update(userId, {
      verification_score: score,
      fully_verified: fullyVerified,
    });

    return score;
  },
};
