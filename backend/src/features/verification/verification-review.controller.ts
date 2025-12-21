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
   */
  approveVerification: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { notes } = req.body;
    const adminUserId = req.userId!;

    const verification = await VerificationModel.adminApprove(adminUserId, userId, notes);

    logger.info('Admin approved verification', {
      userId,
      adminUserId,
      notes,
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
   */
  rejectVerification: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { notes } = req.body;
    const adminUserId = req.userId!;

    const verification = await VerificationModel.adminReject(adminUserId, userId, notes);

    // Process automatic refund for rejection
    const payments = await VerificationPaymentModel.findByUserId(userId, 1);
    if (payments[0] && payments[0].status === 'succeeded') {
      await VerificationPaymentModel.processRefund(payments[0].id, {
        reason: 'automated_fail',
        amount: payments[0].amount,
      });
    }

    logger.info('Admin rejected verification', {
      userId,
      adminUserId,
      notes,
      refund_processed: !!payments[0],
    });

    res.json({
      success: true,
      data: verification,
      message: 'Verification rejected and refund processed',
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
