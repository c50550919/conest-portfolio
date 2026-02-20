/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Document Templates Type Definitions
 *
 * Purpose: Types for household document templates
 * Constitution: Principle I (Child Safety - templates include safety agreement)
 *
 * Templates are static PDF files provided by CoNest for household documentation.
 * The Child Safety Agreement is a platform differentiator.
 *
 * Created: 2026-01-21
 */

// ============================================================================
// Template Types
// ============================================================================

/**
 * Template category
 */
export type TemplateCategory = 'legal' | 'living' | 'safety' | 'inventory';

/**
 * Document template metadata
 */
export interface Template {
  /** Unique template identifier (e.g., 'child-safety-agreement') */
  id: string;

  /** Display name */
  name: string;

  /** Detailed description */
  description: string;

  /** Template category */
  category: TemplateCategory;

  /** S3 file key (internal use) */
  fileKey: string;

  /** Template version */
  version: string;

  /** Number of pages in the PDF */
  pages: number;

  /** Whether this is a featured/highlighted template */
  featured?: boolean;
}

/**
 * API response for templates list
 */
export interface TemplatesListResponse {
  success: boolean;
  templates: Template[];
  count: number;
}

/**
 * API response for single template
 */
export interface TemplateResponse {
  success: boolean;
  template: Template;
}

/**
 * API response for template download URL
 */
export interface TemplateDownloadResponse {
  success: boolean;
  downloadUrl: string;
  template: Template;
  expiresIn: number; // Seconds until URL expires (typically 3600)
}

// ============================================================================
// Redux State Types
// ============================================================================

/**
 * Templates slice state
 */
export interface TemplatesState {
  /** List of available templates */
  templates: Template[];

  /** Loading state for templates list */
  loading: boolean;

  /** Error message if fetch failed */
  error: string | null;

  /** Currently downloading template ID (null if not downloading) */
  downloadingTemplateId: string | null;
}

// ============================================================================
// Category Labels and Icons
// ============================================================================

/**
 * Category display configuration
 */
export const TEMPLATE_CATEGORY_CONFIG: Record<
  TemplateCategory,
  {
    label: string;
    icon: string; // MaterialCommunityIcons name
    color: string; // Theme color key or hex
  }
> = {
  safety: {
    label: 'Safety',
    icon: 'shield-check',
    color: '#4CAF50', // Green for safety
  },
  legal: {
    label: 'Legal',
    icon: 'file-document',
    color: '#2196F3', // Blue for legal
  },
  living: {
    label: 'Living',
    icon: 'home-heart',
    color: '#FF9800', // Orange for living
  },
  inventory: {
    label: 'Inventory',
    icon: 'clipboard-list',
    color: '#9C27B0', // Purple for inventory
  },
};
