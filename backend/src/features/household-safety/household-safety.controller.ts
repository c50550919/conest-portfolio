/**
 * Household Safety Disclosure Controller
 *
 * Handles HTTP requests for the household safety disclosure system.
 * All routes require authentication.
 */

import { Response } from 'express';
import { HouseholdSafetyService } from './household-safety.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import { ParentModel } from '../../models/Parent';

export const householdSafetyController = {
  /**
   * GET /api/household-safety/questions
   * Get the attestation questions to display to the user
   */
  getQuestions: asyncHandler(async (req: AuthRequest, res: Response) => {
    const questions = HouseholdSafetyService.getAttestationQuestions();

    res.json({
      success: true,
      data: { questions },
    });
  }),

  /**
   * GET /api/household-safety/status
   * Get the current disclosure status for the authenticated user
   */
  getStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Look up parent by user ID
    const parent = await ParentModel.findByUserId(req.userId);
    if (!parent) {
      res.status(404).json({
        error: 'Parent profile not found',
        message: 'Please complete your profile setup first',
      });
      return;
    }

    const status = await HouseholdSafetyService.getDisclosureStatus(parent.id);

    res.json({
      success: true,
      data: status,
    });
  }),

  /**
   * POST /api/household-safety/submit
   * Submit a signed attestation
   */
  submitAttestation: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Look up parent by user ID
    const parent = await ParentModel.findByUserId(req.userId);
    if (!parent) {
      res.status(404).json({
        error: 'Parent profile not found',
        message: 'Please complete your profile setup first',
      });
      return;
    }

    const { attestationResponses, signatureData, householdId } = req.body;

    // Validate required fields
    if (!attestationResponses || !Array.isArray(attestationResponses)) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Attestation responses are required',
      });
      return;
    }

    if (!signatureData) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Signature is required',
      });
      return;
    }

    // Get IP and User Agent for audit trail
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const result = await HouseholdSafetyService.submitAttestation(
      parent.id,
      { attestationResponses, signatureData, householdId },
      ipAddress,
      userAgent,
    );

    if (!result.success) {
      res.status(400).json({
        error: 'Submission failed',
        message: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Household safety disclosure submitted successfully',
      data: { disclosure: result.disclosure },
    });
  }),
};
