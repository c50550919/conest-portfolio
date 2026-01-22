/**
 * Household Invitations Controller
 *
 * Purpose: HTTP handlers for household invitations
 * Constitution: Principle I (Child Safety - NO child PII in responses)
 *
 * Endpoints:
 * - POST /api/households/:id/invitations - Send invitation
 * - GET /api/households/invitations/received - Get received invitations
 * - GET /api/households/:id/invitations/sent - Get sent invitations
 * - GET /api/households/invitations/:inviteId - Get invitation details
 * - PATCH /api/households/invitations/:inviteId/accept - Accept invitation
 * - PATCH /api/households/invitations/:inviteId/decline - Decline invitation
 * - DELETE /api/households/invitations/:inviteId - Cancel invitation
 *
 * Created: 2026-01-22
 */

import { Response } from 'express';
import { InvitationsService } from './invitations.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import logger from '../../config/logger';

export const InvitationsController = {
  /**
   * POST /api/households/:id/invitations
   * Send a household invitation
   *
   * Body:
   * - inviteeId: UUID of user to invite
   * - proposedRentShare?: number (in cents)
   * - message?: string (optional encrypted message)
   */
  sendInvitation: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const householdId = req.params.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });
      return;
    }

    const { inviteeId, proposedRentShare, message } = req.body;

    if (!inviteeId) {
      res.status(400).json({
        success: false,
        error: 'inviteeId is required',
        statusCode: 400,
      });
      return;
    }

    // Validate inviteeId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(inviteeId)) {
      res.status(400).json({
        success: false,
        error: 'inviteeId must be a valid UUID',
        statusCode: 400,
      });
      return;
    }

    try {
      const invitation = await InvitationsService.sendInvitation({
        householdId,
        inviterId: userId,
        inviteeId,
        proposedRentShare,
        message,
      });

      logger.info('Invitation sent via API', {
        invitationId: invitation.id,
        householdId,
        inviterId: userId,
        inviteeId,
      });

      res.status(201).json({
        success: true,
        invitation,
      });
    } catch (error: any) {
      logger.warn('Failed to send invitation', {
        householdId,
        inviterId: userId,
        inviteeId,
        error: error.message,
      });

      res.status(400).json({
        success: false,
        error: error.message,
        statusCode: 400,
      });
    }
  }),

  /**
   * GET /api/households/invitations/received
   * Get all pending invitations received by the current user
   */
  getReceivedInvitations: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });
      return;
    }

    const invitations = await InvitationsService.getReceivedInvitations(userId);

    res.status(200).json({
      success: true,
      invitations,
      count: invitations.length,
    });
  }),

  /**
   * GET /api/households/:id/invitations/sent
   * Get all invitations sent from a household
   */
  getSentInvitations: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const householdId = req.params.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });
      return;
    }

    try {
      const invitations = await InvitationsService.getSentInvitations(householdId, userId);

      res.status(200).json({
        success: true,
        invitations,
        count: invitations.length,
      });
    } catch (error: any) {
      res.status(403).json({
        success: false,
        error: error.message,
        statusCode: 403,
      });
    }
  }),

  /**
   * GET /api/households/invitations/:inviteId
   * Get a single invitation by ID
   */
  getInvitation: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { inviteId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });
      return;
    }

    try {
      const invitation = await InvitationsService.getInvitation(inviteId, userId);

      if (!invitation) {
        res.status(404).json({
          success: false,
          error: 'Invitation not found',
          statusCode: 404,
        });
        return;
      }

      res.status(200).json({
        success: true,
        ...invitation,
      });
    } catch (error: any) {
      res.status(403).json({
        success: false,
        error: error.message,
        statusCode: 403,
      });
    }
  }),

  /**
   * PATCH /api/households/invitations/:inviteId/accept
   * Accept an invitation
   */
  acceptInvitation: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { inviteId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });
      return;
    }

    try {
      const invitation = await InvitationsService.acceptInvitation(inviteId, userId);

      logger.info('Invitation accepted via API', {
        invitationId: inviteId,
        householdId: invitation.householdId,
        userId,
      });

      res.status(200).json({
        success: true,
        invitation,
        message: 'You have been added to the household',
      });
    } catch (error: any) {
      logger.warn('Failed to accept invitation', {
        invitationId: inviteId,
        userId,
        error: error.message,
      });

      res.status(400).json({
        success: false,
        error: error.message,
        statusCode: 400,
      });
    }
  }),

  /**
   * PATCH /api/households/invitations/:inviteId/decline
   * Decline an invitation
   */
  declineInvitation: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { inviteId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });
      return;
    }

    try {
      const invitation = await InvitationsService.declineInvitation(inviteId, userId);

      logger.info('Invitation declined via API', {
        invitationId: inviteId,
        householdId: invitation.householdId,
        userId,
      });

      res.status(200).json({
        success: true,
        invitation,
        message: 'Invitation declined',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        statusCode: 400,
      });
    }
  }),

  /**
   * DELETE /api/households/invitations/:inviteId
   * Cancel an invitation (inviter or admin only)
   */
  cancelInvitation: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { inviteId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });
      return;
    }

    try {
      const invitation = await InvitationsService.cancelInvitation(inviteId, userId);

      logger.info('Invitation cancelled via API', {
        invitationId: inviteId,
        householdId: invitation.householdId,
        cancelledBy: userId,
      });

      res.status(200).json({
        success: true,
        invitation,
        message: 'Invitation cancelled',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        statusCode: 400,
      });
    }
  }),
};
