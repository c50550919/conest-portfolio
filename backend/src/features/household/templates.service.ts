/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Templates Service
 *
 * Purpose: Business logic for household document templates
 * Constitution: Principle I (Child Safety - templates include safety agreement)
 *
 * Templates are stored as static PDF files in S3 under the templates/ prefix.
 * Metadata is hardcoded here for simplicity (Phase 1 - static templates).
 *
 * Created: 2026-01-21
 */

import s3Service from '../../services/s3Service';
import logger from '../../config/logger';

/**
 * Template category types
 */
export type TemplateCategory = 'legal' | 'living' | 'safety' | 'inventory';

/**
 * Template metadata interface
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  fileKey: string;
  version: string;
  pages: number;
  featured?: boolean;
}

/**
 * Available document templates
 *
 * IMPORTANT: These templates are designed for co-living primary parents.
 * The Child Safety Agreement is a platform differentiator - no competitor has this.
 */
const TEMPLATES: Template[] = [
  {
    id: 'child-safety-agreement',
    name: 'Child Safety Agreement',
    description:
      'CoNest exclusive agreement for child safety commitments between co-living parents. Covers guest policies, supervision, quiet hours, and emergency protocols.',
    category: 'safety',
    fileKey: 'templates/child-safety-agreement-v1.pdf',
    version: '1.0',
    pages: 3,
    featured: true,
  },
  {
    id: 'roommate-agreement',
    name: 'Roommate Agreement',
    description:
      'Comprehensive agreement covering rent splits, utilities, move-out terms, deposit handling, and dispute resolution procedures.',
    category: 'legal',
    fileKey: 'templates/roommate-agreement-v1.pdf',
    version: '1.0',
    pages: 4,
  },
  {
    id: 'house-rules',
    name: 'House Rules Template',
    description:
      'Customizable house rules covering cleaning schedules, guest policies, quiet hours, shared spaces, and daily living expectations.',
    category: 'living',
    fileKey: 'templates/house-rules-v1.pdf',
    version: '1.0',
    pages: 2,
  },
  {
    id: 'move-in-checklist',
    name: 'Move-In/Move-Out Checklist',
    description:
      'Document household inventory, appliance conditions, and room states for smooth transitions and deposit protection.',
    category: 'inventory',
    fileKey: 'templates/move-in-checklist-v1.pdf',
    version: '1.0',
    pages: 2,
  },
];

/**
 * Templates Service
 *
 * Provides access to household document templates.
 * Templates are stored in S3 and served via signed URLs.
 */
export class TemplatesService {
  /**
   * Get all available templates
   *
   * @returns Array of template metadata (sorted: featured first, then by category)
   */
  static getTemplates(): Template[] {
    // Sort: featured first, then by category priority
    const categoryOrder: Record<TemplateCategory, number> = {
      safety: 1,
      legal: 2,
      living: 3,
      inventory: 4,
    };

    return [...TEMPLATES].sort((a, b) => {
      // Featured templates first
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      // Then by category order
      return categoryOrder[a.category] - categoryOrder[b.category];
    });
  }

  /**
   * Get a specific template by ID
   *
   * @param templateId - Template identifier
   * @returns Template metadata or undefined if not found
   */
  static getTemplate(templateId: string): Template | undefined {
    return TEMPLATES.find((t) => t.id === templateId);
  }

  /**
   * Get signed download URL for a template
   *
   * @param templateId - Template identifier
   * @returns Signed URL for downloading the template PDF
   * @throws Error if template not found
   */
  static async getDownloadUrl(templateId: string): Promise<string> {
    const template = this.getTemplate(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    logger.info('Generating template download URL', {
      templateId,
      fileKey: template.fileKey,
    });

    // Generate signed URL from S3 service
    const signedUrl = await s3Service.getSignedDownloadUrl(template.fileKey);

    return signedUrl;
  }

  /**
   * Check if a template exists in storage
   *
   * @param templateId - Template identifier
   * @returns true if the template PDF exists in storage
   */
  static async templateExists(templateId: string): Promise<boolean> {
    const template = this.getTemplate(templateId);

    if (!template) {
      return false;
    }

    return await s3Service.fileExists(template.fileKey);
  }

  /**
   * Get templates by category
   *
   * @param category - Template category to filter by
   * @returns Array of templates in the specified category
   */
  static getTemplatesByCategory(category: TemplateCategory): Template[] {
    return TEMPLATES.filter((t) => t.category === category);
  }

  /**
   * Get featured templates
   *
   * @returns Array of featured templates
   */
  static getFeaturedTemplates(): Template[] {
    return TEMPLATES.filter((t) => t.featured === true);
  }
}
