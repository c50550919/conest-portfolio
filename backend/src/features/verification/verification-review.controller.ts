/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Verification Review Controller
 *
 * Handles admin verification review operations.
 * Extracted from adminController for better separation of concerns.
 *
 * Features:
 * - Review queue for flagged verifications
 * - Manual approval/rejection
 * - Verification statistics
 * - User lookup and history
 *
 * Security:
 * - All endpoints require admin role
 * - All actions are logged with admin user ID
 * - 48-hour SLA tracking for reviews
 *
 * Created: 2025-12-08
 */

import { Response } from 'express';
import { VerificationModel } from '../../models/Verification';
import { UserModel } from '../../models/User';
import { VerificationPaymentModel } from '../../models/VerificationPayment';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import logger from '../../config/logger';
import { db } from '../../config/database';
import {
  HUDIndividualizedAssessment,
  OffenseNature,
  OffenseSeverity,
  AssessmentDecision,
} from '../../types/entities/verification.entity';

/**
 * Calculate SLA hours remaining
 * 48-hour SLA for admin review
 */
export function calculateSLARemaining(checkDate: Date | undefined): number {
  if (!checkDate) return 48;

  const slaHours = parseInt(process.env.ADMIN_REVIEW_SLA_HOURS || '48');
  const elapsed = (Date.now() - new Date(checkDate).getTime()) / (1000 * 60 * 60);
  const remaining = Math.max(0, slaHours - elapsed);

  return Math.round(remaining * 10) / 10;
}

/**
 * CMP-14: Validate HUD individualized assessment structure
 *
 * Ensures all required factors are present per HUD OGC guidance (2016):
 * - Nature of criminal conduct
 * - Severity classification
 * - Time elapsed since offense
 * - Rehabilitation evidence
 * - Nexus to housing safety
 * - Decision with rationale
 */
const VALID_OFFENSE_NATURES: OffenseNature[] = [
  'violent_felony', 'non_violent_felony', 'misdemeanor',
  'drug_related', 'property_crime', 'fraud_financial', 'other',
];
const VALID_SEVERITIES: OffenseSeverity[] = ['high', 'medium', 'low'];
const VALID_DECISIONS: AssessmentDecision[] = ['approve', 'deny', 'request_more_info'];

function validateHUDAssessment(assessment: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!assessment || typeof assessment !== 'object') {
    return { valid: false, errors: ['hudAssessment must be an object'] };
  }

  // Factor 1: Nature of criminal conduct
  if (!VALID_OFFENSE_NATURES.includes(assessment.offenseNature)) {
    errors.push(`offenseNature must be one of: ${VALID_OFFENSE_NATURES.join(', ')}`);
  }
  if (!assessment.offenseDescription || typeof assessment.offenseDescription !== 'string' || assessment.offenseDescription.trim().length < 10) {
    errors.push('offenseDescription must be a string with at least 10 characters');
  }

  // Factor 2: Severity
  if (!VALID_SEVERITIES.includes(assessment.offenseSeverity)) {
    errors.push(`offenseSeverity must be one of: ${VALID_SEVERITIES.join(', ')}`);
  }

  // Factor 3: Time elapsed
  if (typeof assessment.yearsSinceOffense !== 'number' || assessment.yearsSinceOffense < 0) {
    errors.push('yearsSinceOffense must be a non-negative number');
  }
  if (typeof assessment.sentenceCompleted !== 'boolean') {
    errors.push('sentenceCompleted must be a boolean');
  }

  // Factor 4: Rehabilitation evidence
  if (!assessment.rehabilitationEvidence || typeof assessment.rehabilitationEvidence !== 'object') {
    errors.push('rehabilitationEvidence must be an object');
  } else {
    const rehab = assessment.rehabilitationEvidence;
    if (typeof rehab.hasCompletedPrograms !== 'boolean') {
      errors.push('rehabilitationEvidence.hasCompletedPrograms must be a boolean');
    }
    if (typeof rehab.hasStableEmployment !== 'boolean') {
      errors.push('rehabilitationEvidence.hasStableEmployment must be a boolean');
    }
    if (typeof rehab.hasCharacterReferences !== 'boolean') {
      errors.push('rehabilitationEvidence.hasCharacterReferences must be a boolean');
    }
  }

  // Factor 5: Nexus to housing safety
  if (!assessment.nexusToHousingSafety || typeof assessment.nexusToHousingSafety !== 'string' || assessment.nexusToHousingSafety.trim().length < 10) {
    errors.push('nexusToHousingSafety must be a string with at least 10 characters');
  }

  // Decision
  if (!VALID_DECISIONS.includes(assessment.decision)) {
    errors.push(`decision must be one of: ${VALID_DECISIONS.join(', ')}`);
  }
  if (!assessment.decisionRationale || typeof assessment.decisionRationale !== 'string' || assessment.decisionRationale.trim().length < 10) {
    errors.push('decisionRationale must be a string with at least 10 characters');
  }

  return { valid: errors.length === 0, errors };
}

export const verificationReviewController = {
  /**
   * Get verification review queue
   * Returns verifications requiring manual admin review
   * Sorted by oldest first (SLA compliance)
   */
  getReviewQueue: asyncHandler(async (req: AuthRequest, res: Response) => {
    const queue = await VerificationModel.getAdminReviewQueue();

    const enrichedQueue = await Promise.all(
      queue.map(async (verification) => {
        if (!verification.user_id) return { ...verification, user: null, payment_status: null, sla_hours_remaining: null };
        const user = await UserModel.findById(verification.user_id);
        const payment = await VerificationPaymentModel.findByUserId(verification.user_id, 1);

        return {
          ...verification,
          user: {
            id: user?.id,
            email: user?.email,
            phone: user?.phone,
            created_at: user?.created_at,
          },
          payment_status: payment[0]?.status,
          sla_hours_remaining: calculateSLARemaining(verification.background_check_date),
        };
      }),
    );

    res.json({
      success: true,
      data: {
        queue: enrichedQueue,
        total: enrichedQueue.length,
        sla_48h: process.env.ADMIN_REVIEW_SLA_HOURS || 48,
      },
    });
  }),

  /**
   * Get verification details for review
   */
  getVerificationDetails: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    const verification = await VerificationModel.findByUserId(userId);
    if (!verification) {
      res.status(404).json({ error: 'Verification not found' });
      return;
    }

    const user = await UserModel.findById(userId);
    const payments = await VerificationPaymentModel.findByUserId(userId);

    res.json({
      success: true,
      data: {
        verification,
        user: {
          id: user?.id,
          email: user?.email,
          phone: user?.phone,
          created_at: user?.created_at,
          last_login: user?.last_login,
        },
        payments,
        flagged_records: verification.flagged_records,
        id_verification_data: verification.id_verification_data
          ? JSON.parse(verification.id_verification_data as any)
          : null,
      },
    });
  }),

  /**
   * Approve verification after manual review
   *
   * CMP-14: Accepts optional HUD individualized assessment.
   * For approvals, assessment is recommended but not required.
   */
  approveVerification: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { notes, hudAssessment } = req.body;
    const adminUserId = req.userId!;

    // CMP-14: Validate HUD assessment if provided
    let validatedAssessment: HUDIndividualizedAssessment | undefined;
    if (hudAssessment) {
      const validation = validateHUDAssessment(hudAssessment);
      if (!validation.valid) {
        res.status(400).json({
          error: 'Invalid HUD individualized assessment',
          details: validation.errors,
        });
        return;
      }
      validatedAssessment = {
        ...hudAssessment,
        assessedAt: new Date().toISOString(),
        assessedBy: adminUserId,
      };
    }

    const verification = await VerificationModel.adminApprove(
      userId, adminUserId, notes, validatedAssessment,
    );

    logger.info('Admin approved verification', {
      userId,
      adminUserId,
      hasHUDAssessment: !!validatedAssessment,
    });

    res.json({
      success: true,
      data: verification,
      message: 'Verification approved successfully',
    });
  }),

  /**
   * Reject verification after manual review
   * Triggers automatic 100% refund
   *
   * CMP-14: REQUIRES structured HUD individualized assessment for all denials.
   * Per HUD OGC guidance (2016), housing denials based on criminal history
   * without documented individualized assessment are legally vulnerable to
   * disparate impact claims under the Fair Housing Act.
   */
  rejectVerification: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { notes, hudAssessment } = req.body;
    const adminUserId = req.userId!;

    // CMP-14: HUD assessment is REQUIRED for rejections
    if (!hudAssessment) {
      res.status(400).json({
        error: 'HUD individualized assessment required for denials',
        message: 'Per HUD guidance, all housing denials based on criminal history must include a documented individualized assessment considering: nature of offense, severity, recency, rehabilitation evidence, and nexus to housing safety.',
      });
      return;
    }

    const validation = validateHUDAssessment(hudAssessment);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid HUD individualized assessment',
        details: validation.errors,
      });
      return;
    }

    const validatedAssessment: HUDIndividualizedAssessment = {
      ...hudAssessment,
      assessedAt: new Date().toISOString(),
      assessedBy: adminUserId,
    };

    const verification = await VerificationModel.adminReject(
      userId, adminUserId, notes, validatedAssessment,
    );

    // Process automatic refund for rejection
    const payments = await VerificationPaymentModel.findByUserId(userId, 1);
    if (payments[0] && payments[0].status === 'succeeded') {
      await VerificationPaymentModel.processRefund(payments[0].id, {
        reason: 'automated_fail',
        amount: payments[0].amount,
      });
    }

    logger.info('Admin rejected verification with HUD assessment', {
      userId,
      adminUserId,
      assessmentDecision: validatedAssessment.decision,
      offenseNature: validatedAssessment.offenseNature,
      offenseSeverity: validatedAssessment.offenseSeverity,
      yearsSinceOffense: validatedAssessment.yearsSinceOffense,
      refund_processed: !!payments[0],
    });

    res.json({
      success: true,
      data: verification,
      message: 'Verification rejected with HUD individualized assessment. Refund processed.',
    });
  }),

  /**
   * Get overall verification statistics
   */
  getVerificationStats: asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await db('verifications')
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN fully_verified THEN 1 END) as fully_verified'),
        db.raw("COUNT(CASE WHEN background_check_status = 'approved' THEN 1 END) as bg_approved"),
        db.raw("COUNT(CASE WHEN background_check_status = 'rejected' THEN 1 END) as bg_rejected"),
        db.raw("COUNT(CASE WHEN background_check_status = 'consider' THEN 1 END) as bg_consider"),
        db.raw('COUNT(CASE WHEN admin_review_required THEN 1 END) as pending_review'),
        db.raw('AVG(verification_score) as avg_score'),
      )
      .first();

    const paymentStats = await db('verification_payments')
      .select(
        db.raw('COUNT(*) as total_payments'),
        db.raw("SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as total_revenue"),
        db.raw('SUM(refund_amount) as total_refunded'),
        db.raw("COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments"),
      )
      .first();

    res.json({
      success: true,
      data: {
        verifications: {
          total: parseInt(stats.total) || 0,
          fully_verified: parseInt(stats.fully_verified) || 0,
          bg_approved: parseInt(stats.bg_approved) || 0,
          bg_rejected: parseInt(stats.bg_rejected) || 0,
          bg_consider: parseInt(stats.bg_consider) || 0,
          pending_review: parseInt(stats.pending_review) || 0,
          avg_score: parseFloat(stats.avg_score) || 0,
        },
        payments: {
          total_payments: parseInt(paymentStats.total_payments) || 0,
          total_revenue: parseInt(paymentStats.total_revenue) || 0,
          total_refunded: parseInt(paymentStats.total_refunded) || 0,
          successful_payments: parseInt(paymentStats.successful_payments) || 0,
          refund_rate:
            paymentStats.successful_payments > 0
              ? (parseInt(paymentStats.total_refunded) / parseInt(paymentStats.total_revenue)) * 100
              : 0,
        },
      },
    });
  }),

  /**
   * Get verifications by status
   */
  getVerificationsByStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const verifications = await VerificationModel.getByStatus(status, limit);

    const enrichedVerifications = await Promise.all(
      verifications.map(async (verification) => {
        const user = await UserModel.findById(verification.user_id);
        return {
          ...verification,
          user: {
            email: user?.email,
            phone: user?.phone,
          },
        };
      }),
    );

    res.json({
      success: true,
      data: {
        verifications: enrichedVerifications,
        total: enrichedVerifications.length,
        status,
      },
    });
  }),

  /**
   * Search users by email or ID
   */
  searchUsers: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Search query required' });
      return;
    }

    const users = await db('users')
      .where('email', 'ilike', `%${query}%`)
      .orWhere('id', 'ilike', `%${query}%`)
      .limit(20)
      .select('id', 'email', 'phone', 'account_status', 'created_at');

    res.json({
      success: true,
      data: users,
    });
  }),

  /**
   * Get user verification history
   */
  getUserVerificationHistory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    const verification = await VerificationModel.findByUserId(userId);
    const payments = await VerificationPaymentModel.findByUserId(userId);
    const user = await UserModel.findById(userId);

    res.json({
      success: true,
      data: {
        user: {
          id: user?.id,
          email: user?.email,
          phone: user?.phone,
          created_at: user?.created_at,
        },
        verification,
        payments,
      },
    });
  }),
};

export default verificationReviewController;
