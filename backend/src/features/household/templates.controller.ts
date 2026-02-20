/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Templates Controller
 *
 * Purpose: HTTP request handlers for household document templates
 * Constitution: Principle I (Child Safety - templates include safety agreement)
 *
 * Endpoints:
 * - GET /api/households/templates - List all templates
 * - GET /api/households/templates/:templateId - Get template details
 * - GET /api/households/templates/:templateId/download - Get download URL
 *
 * Created: 2026-01-21
 */

import { Response } from 'express';
import { TemplatesService, TemplateCategory } from './templates.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import logger from '../../config/logger';

export const TemplatesController = {
  /**
   * GET /api/households/templates
   * List all available document templates
   *
   * Query params (optional):
   * - category: Filter by category (legal, living, safety, inventory)
   * - featured: Filter featured templates only (true/false)
   *
   * Response:
   * - templates: Array of template metadata objects
   * - count: Total number of templates returned
   *
   * Authorization: Authenticated users only
   */
  getTemplates: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });
      return;
    }

    const { category, featured } = req.query;

    let templates;

    if (featured === 'true') {
      templates = TemplatesService.getFeaturedTemplates();
    } else if (category) {
      // Validate category
      const validCategories: TemplateCategory[] = ['legal', 'living', 'safety', 'inventory'];
      if (!validCategories.includes(category as TemplateCategory)) {
        res.status(400).json({
          success: false,
          error: `Invalid category. Valid categories: ${validCategories.join(', ')}`,
          statusCode: 400,
        });
        return;
      }
      templates = TemplatesService.getTemplatesByCategory(category as TemplateCategory);
    } else {
      templates = TemplatesService.getTemplates();
    }

    logger.info('Templates fetched', {
      userId,
      count: templates.length,
      category: category || 'all',
      featured: featured === 'true',
    });

    res.status(200).json({
      success: true,
      templates,
      count: templates.length,
    });
  }),

  /**
   * GET /api/households/templates/:templateId
   * Get a specific template's metadata
   *
   * Params:
   * - templateId: Template identifier (e.g., 'child-safety-agreement')
   *
   * Response:
   * - template: Template metadata object
   *
   * Authorization: Authenticated users only
   */
  getTemplate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });
      return;
    }

    const { templateId } = req.params;

    const template = TemplatesService.getTemplate(templateId);

    if (!template) {
      res.status(404).json({
        success: false,
        error: `Template not found: ${templateId}`,
        statusCode: 404,
      });
      return;
    }

    logger.info('Template fetched', {
      userId,
      templateId,
    });

    res.status(200).json({
      success: true,
      template,
    });
  }),

  /**
   * GET /api/households/templates/:templateId/download
   * Get signed download URL for a template
   *
   * Params:
   * - templateId: Template identifier (e.g., 'child-safety-agreement')
   *
   * Response:
   * - downloadUrl: Signed URL for downloading the PDF (expires in 1 hour)
   * - template: Template metadata
   * - expiresIn: Seconds until URL expires
   *
   * Authorization: Authenticated users only
   *
   * Note: The signed URL allows direct download without additional auth.
   * URL expiration provides security for shared links.
   */
  getDownloadUrl: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });
      return;
    }

    const { templateId } = req.params;

    const template = TemplatesService.getTemplate(templateId);

    if (!template) {
      res.status(404).json({
        success: false,
        error: `Template not found: ${templateId}`,
        statusCode: 404,
      });
      return;
    }

    try {
      const downloadUrl = await TemplatesService.getDownloadUrl(templateId);

      logger.info('Template download URL generated', {
        userId,
        templateId,
        templateName: template.name,
      });

      res.status(200).json({
        success: true,
        downloadUrl,
        template,
        expiresIn: 3600, // 1 hour (matches s3Service DOWNLOAD_URL_EXPIRY)
      });
    } catch (error) {
      // Handle case where template exists in metadata but not in S3
      if (error instanceof Error && error.message.includes('not found')) {
        logger.error('Template file not found in storage', {
          templateId,
          fileKey: template.fileKey,
        });

        res.status(503).json({
          success: false,
          error: 'Template file temporarily unavailable. Please try again later.',
          statusCode: 503,
        });
        return;
      }

      throw error;
    }
  }),
};
