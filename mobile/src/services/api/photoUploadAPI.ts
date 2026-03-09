/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Photo Upload API Service
 *
 * Purpose: Dedicated API client for profile photo uploads using the shared apiClient
 * Constitution: Principle I (Child Safety - parent photos ONLY), Principle III (Security)
 *
 * Endpoints:
 * - POST /api/profiles/photo - Upload profile photo (multipart/form-data)
 *
 * Backend Reference:
 * - Route: backend/src/features/profile/profile.routes.ts
 * - Controller: backend/src/features/profile/profile.controller.ts (uploadPhoto)
 * - Multer middleware validates file type and size server-side
 * - S3 service handles storage; old photos are auto-deleted
 *
 * Security:
 * - Uses shared apiClient with JWT auto-refresh interceptors
 * - Client-side MIME type validation before upload
 * - Server-side validation is authoritative (client validation is advisory)
 * - No child photos permitted (Constitution Principle I)
 *
 * Created: 2026-03-06
 */

import apiClient from '../../config/api';
import { Platform } from 'react-native';

// Maximum file size for profile photos (5MB) - advisory, server enforces
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

// Allowed MIME types for profile photos
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PhotoFile {
  uri: string;
  type: string;
  fileName: string;
  fileSize?: number;
}

export interface PhotoUploadResult {
  success: boolean;
  message: string;
  data: {
    profile_image_url: string;
    profile: Record<string, unknown>;
  };
}

class PhotoUploadAPI {
  /**
   * Validate photo file before upload (client-side, advisory only)
   * Server-side validation is authoritative
   */
  private validatePhoto(photo: PhotoFile): void {
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      throw new Error(
        `Invalid file type "${photo.type}". Allowed types: ${ALLOWED_PHOTO_TYPES.join(', ')}`,
      );
    }

    if (photo.fileSize && photo.fileSize > MAX_PHOTO_SIZE_BYTES) {
      throw new Error(
        `File too large (${Math.round(photo.fileSize / 1024 / 1024)}MB). Maximum size: 5MB`,
      );
    }
  }

  /**
   * Upload a profile photo
   * POST /api/profiles/photo
   *
   * Uses the shared apiClient which includes:
   * - JWT auto-attach from Keychain
   * - 401 auto-refresh flow
   * - Certificate pinning checks
   *
   * @param photo - Photo file with uri, type, and fileName
   * @returns Upload result with the new profile_image_url
   */
  async uploadProfilePhoto(photo: PhotoFile): Promise<PhotoUploadResult> {
    // Client-side validation (advisory)
    this.validatePhoto(photo);

    const formData = new FormData();

    // Platform-specific URI handling:
    // iOS file URIs need the file:// prefix stripped for FormData
    const uri = Platform.OS === 'ios' ? photo.uri.replace('file://', '') : photo.uri;

    formData.append('photo', {
      uri,
      type: photo.type,
      name: photo.fileName,
    } as unknown as Blob);

    const response = await apiClient.post<PhotoUploadResult>(
      '/api/profiles/photo',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // Extended timeout for file uploads
      },
    );

    return response.data;
  }
}

export const photoUploadAPI = new PhotoUploadAPI();
export default photoUploadAPI;
