/**
 * Templates API Service
 *
 * Purpose: API client for household document templates
 * Constitution: Principle I (Child Safety - templates include safety agreement)
 *
 * Endpoints:
 * - GET /api/households/templates - List all templates
 * - GET /api/households/templates/:templateId - Get template details
 * - GET /api/households/templates/:templateId/download - Get download URL
 *
 * Created: 2026-01-21
 */

import apiClient from '../../config/api';
import {
  Template,
  TemplateCategory,
  TemplatesListResponse,
  TemplateResponse,
  TemplateDownloadResponse,
} from '../../types/templates';

/**
 * Templates API Client
 * Handles all template-related API interactions
 */
class TemplatesAPI {
  /**
   * Get all available templates
   *
   * @param options - Optional filters
   * @returns List of templates
   */
  async getTemplates(options?: {
    category?: TemplateCategory;
    featured?: boolean;
  }): Promise<Template[]> {
    const params = new URLSearchParams();

    if (options?.category) {
      params.append('category', options.category);
    }
    if (options?.featured) {
      params.append('featured', 'true');
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/households/templates?${queryString}`
      : '/api/households/templates';

    const response = await apiClient.get<TemplatesListResponse>(url);
    return response.data.templates;
  }

  /**
   * Get featured templates only
   *
   * @returns List of featured templates
   */
  async getFeaturedTemplates(): Promise<Template[]> {
    return this.getTemplates({ featured: true });
  }

  /**
   * Get templates by category
   *
   * @param category - Template category to filter by
   * @returns List of templates in the category
   */
  async getTemplatesByCategory(category: TemplateCategory): Promise<Template[]> {
    return this.getTemplates({ category });
  }

  /**
   * Get a specific template's details
   *
   * @param templateId - Template identifier
   * @returns Template metadata
   */
  async getTemplate(templateId: string): Promise<Template> {
    const response = await apiClient.get<TemplateResponse>(
      `/api/households/templates/${templateId}`
    );
    return response.data.template;
  }

  /**
   * Get signed download URL for a template
   *
   * @param templateId - Template identifier
   * @returns Download URL and template metadata
   */
  async getDownloadUrl(templateId: string): Promise<TemplateDownloadResponse> {
    const response = await apiClient.get<TemplateDownloadResponse>(
      `/api/households/templates/${templateId}/download`
    );
    return response.data;
  }
}

// Export singleton instance
export const templatesAPI = new TemplatesAPI();
export default templatesAPI;
