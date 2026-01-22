/**
 * Templates Routes
 *
 * Purpose: Route definitions for household document templates
 * Constitution: Principle I (Child Safety - templates include safety agreement)
 *
 * All routes require authentication.
 * Templates are available to all authenticated users (not household-specific).
 *
 * Routes:
 * - GET /templates - List all templates
 * - GET /templates/:templateId - Get template details
 * - GET /templates/:templateId/download - Get download URL
 *
 * Created: 2026-01-21
 */

import express from 'express';
import { TemplatesController } from './templates.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = express.Router();

// All template routes require authentication
router.use(authMiddleware);

/**
 * GET /api/households/templates
 * List all available document templates
 *
 * Query params (optional):
 * - category: Filter by category (legal, living, safety, inventory)
 * - featured: Filter featured templates only (true/false)
 *
 * Response:
 * - success: boolean
 * - templates: Array of template metadata
 * - count: Number of templates returned
 *
 * Example: GET /api/households/templates?category=safety
 * Example: GET /api/households/templates?featured=true
 */
router.get('/', TemplatesController.getTemplates);

/**
 * GET /api/households/templates/:templateId
 * Get a specific template's metadata
 *
 * Params:
 * - templateId: Template identifier (e.g., 'child-safety-agreement')
 *
 * Response:
 * - success: boolean
 * - template: Template metadata object
 *
 * Example: GET /api/households/templates/child-safety-agreement
 */
router.get('/:templateId', TemplatesController.getTemplate);

/**
 * GET /api/households/templates/:templateId/download
 * Get signed download URL for a template PDF
 *
 * Params:
 * - templateId: Template identifier (e.g., 'child-safety-agreement')
 *
 * Response:
 * - success: boolean
 * - downloadUrl: Signed URL (expires in 1 hour)
 * - template: Template metadata
 * - expiresIn: Seconds until URL expires (3600)
 *
 * Example: GET /api/households/templates/child-safety-agreement/download
 *
 * Note: The returned URL allows direct download without additional auth.
 * The user must be authenticated to request the URL, but can share it
 * with household members for 1 hour.
 */
router.get('/:templateId/download', TemplatesController.getDownloadUrl);

export default router;
