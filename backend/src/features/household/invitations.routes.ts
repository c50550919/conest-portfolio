/**
 * Household Invitations Routes
 *
 * Purpose: API routes for household invitations
 * Constitution: Principle I (Child Safety - NO child PII exposed)
 *
 * Routes:
 * - POST /api/households/:id/invitations - Send invitation (household member)
 * - GET /api/households/invitations/received - Get received invitations (auth)
 * - GET /api/households/:id/invitations/sent - Get sent invitations (household member)
 * - GET /api/households/invitations/:inviteId - Get invitation details (auth)
 * - PATCH /api/households/invitations/:inviteId/accept - Accept invitation (invitee)
 * - PATCH /api/households/invitations/:inviteId/decline - Decline invitation (invitee)
 * - DELETE /api/households/invitations/:inviteId - Cancel invitation (inviter/admin)
 *
 * Created: 2026-01-22
 */

import { Router } from 'express';
import { InvitationsController } from './invitations.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/households/invitations/received:
 *   get:
 *     summary: Get received invitations
 *     description: Get all pending household invitations for the authenticated user
 *     tags: [Household Invitations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of received invitations
 *       401:
 *         description: Unauthorized
 */
router.get('/invitations/received', InvitationsController.getReceivedInvitations);

/**
 * @swagger
 * /api/households/invitations/{inviteId}:
 *   get:
 *     summary: Get invitation details
 *     description: Get details of a specific invitation (must be invitee or household member)
 *     tags: [Household Invitations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: inviteId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invitation details
 *       403:
 *         description: Not authorized to view this invitation
 *       404:
 *         description: Invitation not found
 */
router.get('/invitations/:inviteId', InvitationsController.getInvitation);

/**
 * @swagger
 * /api/households/invitations/{inviteId}/accept:
 *   patch:
 *     summary: Accept invitation
 *     description: Accept a pending household invitation (invitee only)
 *     tags: [Household Invitations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: inviteId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invitation accepted, user added to household
 *       400:
 *         description: Invalid invitation status or user not invitee
 *       404:
 *         description: Invitation not found
 */
router.patch('/invitations/:inviteId/accept', InvitationsController.acceptInvitation);

/**
 * @swagger
 * /api/households/invitations/{inviteId}/decline:
 *   patch:
 *     summary: Decline invitation
 *     description: Decline a pending household invitation (invitee only)
 *     tags: [Household Invitations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: inviteId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invitation declined
 *       400:
 *         description: Invalid invitation status or user not invitee
 *       404:
 *         description: Invitation not found
 */
router.patch('/invitations/:inviteId/decline', InvitationsController.declineInvitation);

/**
 * @swagger
 * /api/households/invitations/{inviteId}:
 *   delete:
 *     summary: Cancel invitation
 *     description: Cancel a pending household invitation (inviter or household admin only)
 *     tags: [Household Invitations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: inviteId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invitation cancelled
 *       400:
 *         description: Invalid invitation status
 *       403:
 *         description: Not authorized to cancel this invitation
 *       404:
 *         description: Invitation not found
 */
router.delete('/invitations/:inviteId', InvitationsController.cancelInvitation);

/**
 * @swagger
 * /api/households/{id}/invitations:
 *   post:
 *     summary: Send invitation
 *     description: Send a household invitation to another user (must be household member)
 *     tags: [Household Invitations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Household ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteeId
 *             properties:
 *               inviteeId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of user to invite
 *               proposedRentShare:
 *                 type: integer
 *                 description: Proposed rent share in cents (optional)
 *               message:
 *                 type: string
 *                 description: Optional message to include with invitation
 *     responses:
 *       201:
 *         description: Invitation sent
 *       400:
 *         description: Invalid request or user already in household
 *       403:
 *         description: Not a member of this household
 */
router.post('/:id/invitations', InvitationsController.sendInvitation);

/**
 * @swagger
 * /api/households/{id}/invitations/sent:
 *   get:
 *     summary: Get sent invitations
 *     description: Get all invitations sent from a household (must be household member)
 *     tags: [Household Invitations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Household ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of sent invitations
 *       403:
 *         description: Not a member of this household
 */
router.get('/:id/invitations/sent', InvitationsController.getSentInvitations);

export default router;
