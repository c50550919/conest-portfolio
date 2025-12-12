import { Router } from 'express';
import connectionRequestController from '../controllers/connectionRequestController';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation';
import {
  createConnectionRequestSchema,
  getReceivedRequestsSchema,
  getSentRequestsSchema,
  acceptRequestSchema,
  declineRequestSchema,
  cancelRequestSchema,
} from '../validators/connectionRequestValidator';

/**
 * ConnectionRequest Routes
 *
 * Feature: 003-complete-3-critical (Connection Requests)
 * All routes require authentication
 * Rate limiting: 5 requests/day, 15 requests/week (enforced in model)
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/connection-requests
 * @desc    Send a connection request
 * @access  Private
 * @rate_limit 5/day, 15/week
 */
router.post(
  '/',
  validate(createConnectionRequestSchema),
  connectionRequestController.sendRequest,
);

/**
 * @route   GET /api/connection-requests/received
 * @desc    Get connection requests received by current user
 * @access  Private
 * @query   status - Optional status filter (pending, accepted, declined, expired)
 */
router.get(
  '/received',
  validate(getReceivedRequestsSchema),
  connectionRequestController.getReceivedRequests,
);

/**
 * @route   GET /api/connection-requests/sent
 * @desc    Get connection requests sent by current user
 * @access  Private
 * @query   status - Optional status filter (pending, accepted, declined, expired, cancelled)
 */
router.get(
  '/sent',
  validate(getSentRequestsSchema),
  connectionRequestController.getSentRequests,
);

/**
 * @route   GET /api/connection-requests/rate-limit-status
 * @desc    Get rate limit status for current user
 * @access  Private
 */
router.get(
  '/rate-limit-status',
  connectionRequestController.getRateLimitStatus,
);

/**
 * @route   GET /api/connection-requests/statistics
 * @desc    Get connection request statistics for current user
 * @access  Private
 */
router.get(
  '/statistics',
  connectionRequestController.getStatistics,
);

/**
 * @route   GET /api/connection-requests/:id/message
 * @desc    Get decrypted message for a connection request
 * @access  Private
 */
router.get(
  '/:id/message',
  connectionRequestController.getMessage,
);

/**
 * @route   GET /api/connection-requests/:id/response-message
 * @desc    Get decrypted response message for a connection request
 * @access  Private
 */
router.get(
  '/:id/response-message',
  connectionRequestController.getResponseMessage,
);

/**
 * @route   PATCH /api/connection-requests/:id/accept
 * @desc    Accept a connection request
 * @access  Private
 */
router.patch(
  '/:id/accept',
  validate(acceptRequestSchema),
  connectionRequestController.acceptRequest,
);

/**
 * @route   PATCH /api/connection-requests/:id/decline
 * @desc    Decline a connection request
 * @access  Private
 */
router.patch(
  '/:id/decline',
  validate(declineRequestSchema),
  connectionRequestController.declineRequest,
);

/**
 * @route   PATCH /api/connection-requests/:id/cancel
 * @desc    Cancel a sent connection request (sender only)
 * @access  Private
 */
router.patch(
  '/:id/cancel',
  validate(cancelRequestSchema),
  connectionRequestController.cancelRequest,
);

export default router;
