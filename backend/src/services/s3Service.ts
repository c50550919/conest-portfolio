/**
 * Storage Service (S3 + Local Development Fallback)
 *
 * Purpose: Secure file upload with S3 for production and local storage for development
 * Constitution: Principle II (Security - encrypted storage, signed URLs)
 *
 * Security Features:
 * - File type validation (whitelist approach)
 * - File size limits (5MB for images)
 * - Content-Type verification
 * - Signed URLs with expiration (S3 mode)
 * - Unique file naming to prevent enumeration
 * - Server-side encryption (AES-256) in S3 mode
 *
 * Development Mode:
 * - Files stored locally in ./uploads directory
 * - Served via /api/uploads/:key route
 * - No AWS credentials required
 *
 * Created: 2025-12-07
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger';
import { getEnv } from '../config/env';

// Allowed MIME types for profile photos
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Allowed MIME types for documents (verification)
const ALLOWED_DOCUMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

// File size limits in bytes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Signed URL expiration times (in seconds)
const UPLOAD_URL_EXPIRY = 300; // 5 minutes for uploads
const DOWNLOAD_URL_EXPIRY = 3600; // 1 hour for downloads

// Local storage directory (relative to project root)
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * File upload options
 */
export interface UploadOptions {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  userId: string;
  category: 'profile-photos' | 'verification-docs' | 'id-documents';
}

/**
 * Upload result
 */
export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  contentType: string;
}

/**
 * Presigned URL result
 */
export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  expiresAt: Date;
}

/**
 * Storage Service - supports both S3 and local file storage
 */
class StorageService {
  private client: S3Client | null = null;
  private bucket: string = '';
  private initialized: boolean = false;
  private useLocalStorage: boolean = false;

  constructor() {
    // Defer initialization until first use
  }

  /**
   * Initialize storage (S3 or local based on configuration)
   */
  private initialize(): void {
    if (this.initialized) return;

    const env = getEnv();

    // Use local storage if:
    // 1. SECURITY_MODE is development/testing
    // 2. OR AWS credentials are not configured
    const isDevMode = env.SECURITY_MODE === 'development' || env.SECURITY_MODE === 'testing';
    const hasS3Config = env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_S3_BUCKET !== 'conest-dev-uploads';

    if (isDevMode && !hasS3Config) {
      this.useLocalStorage = true;
      this.ensureLocalUploadDir();
      logger.info('Storage Service initialized in LOCAL mode', {
        uploadDir: LOCAL_UPLOAD_DIR,
        mode: 'local',
      });
    } else {
      this.useLocalStorage = false;
      this.bucket = env.AWS_S3_BUCKET;

      const config: {
        region: string;
        credentials?: { accessKeyId: string; secretAccessKey: string };
      } = {
        region: env.AWS_REGION,
      };

      if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        };
      }

      this.client = new S3Client(config);
      logger.info('Storage Service initialized in S3 mode', {
        bucket: this.bucket,
        region: env.AWS_REGION,
      });
    }

    this.initialized = true;
  }

  /**
   * Ensure local upload directory exists
   */
  private ensureLocalUploadDir(): void {
    const dirs = [
      LOCAL_UPLOAD_DIR,
      path.join(LOCAL_UPLOAD_DIR, 'profile-photos'),
      path.join(LOCAL_UPLOAD_DIR, 'verification-docs'),
      path.join(LOCAL_UPLOAD_DIR, 'id-documents'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info('Created local upload directory', { dir });
      }
    }
  }

  /**
   * Sanitize and validate a file key to prevent path traversal attacks
   * Security: Ensures the resolved path stays within LOCAL_UPLOAD_DIR
   */
  private sanitizeKey(key: string): string {
    // Remove any null bytes
    const cleanKey = key.replace(/\0/g, '');

    // Normalize path separators
    const normalizedKey = cleanKey.replace(/\\/g, '/');

    // Remove any leading slashes or dots
    const trimmedKey = normalizedKey.replace(/^[./\\]+/, '');

    // Resolve the full path and verify it's within LOCAL_UPLOAD_DIR
    const fullPath = path.resolve(LOCAL_UPLOAD_DIR, trimmedKey);
    const normalizedUploadDir = path.resolve(LOCAL_UPLOAD_DIR);

    // Security check: ensure resolved path starts with upload directory
    if (!fullPath.startsWith(normalizedUploadDir + path.sep) && fullPath !== normalizedUploadDir) {
      logger.warn('Path traversal attempt detected', { key, resolvedPath: fullPath });
      throw new Error('Invalid file path');
    }

    return trimmedKey;
  }

  /**
   * Generate a secure, unique file key
   */
  private generateKey(
    userId: string,
    category: string,
    _originalName: string,
    mimeType: string,
  ): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const extension = this.getExtensionFromMimeType(mimeType);

    // Sanitize userId to prevent path traversal
    const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, '');

    return `${category}/${safeUserId}/${timestamp}-${randomBytes}${extension}`;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
    };
    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Validate file type against allowed types
   */
  private validateFileType(
    mimeType: string,
    category: UploadOptions['category'],
  ): boolean {
    if (category === 'profile-photos') {
      return ALLOWED_IMAGE_TYPES.has(mimeType);
    }
    return ALLOWED_DOCUMENT_TYPES.has(mimeType);
  }

  /**
   * Validate file size against limits
   */
  private validateFileSize(
    size: number,
    category: UploadOptions['category'],
  ): boolean {
    const maxSize = category === 'profile-photos' ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
    return size <= maxSize;
  }

  /**
   * Upload file (routes to S3 or local based on configuration)
   */
  async uploadFile(options: UploadOptions): Promise<UploadResult> {
    this.initialize();

    const { buffer, mimeType, originalName, userId, category } = options;

    // Validate file type (security: whitelist approach)
    if (!this.validateFileType(mimeType, category)) {
      throw new Error(
        `Invalid file type: ${mimeType}. Allowed types: ${
          category === 'profile-photos'
            ? Array.from(ALLOWED_IMAGE_TYPES).join(', ')
            : Array.from(ALLOWED_DOCUMENT_TYPES).join(', ')
        }`,
      );
    }

    // Validate file size
    if (!this.validateFileSize(buffer.length, category)) {
      const maxSize = category === 'profile-photos' ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
      throw new Error(
        `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
      );
    }

    // Generate unique key
    const key = this.generateKey(userId, category, originalName, mimeType);

    if (this.useLocalStorage) {
      return this.uploadFileLocal(key, buffer, mimeType, userId);
    } else {
      return this.uploadFileS3(key, buffer, mimeType, originalName, userId);
    }
  }

  /**
   * Upload file to local storage (development mode)
   */
  private async uploadFileLocal(
    key: string,
    buffer: Buffer,
    mimeType: string,
    userId: string,
  ): Promise<UploadResult> {
    const sanitizedKey = this.sanitizeKey(key);
    // nosemgrep: path-join-resolve-traversal - sanitizedKey is validated by sanitizeKey() to prevent path traversal
    const filePath = path.join(LOCAL_UPLOAD_DIR, sanitizedKey);
    const fileDir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Write file to disk
    fs.writeFileSync(filePath, buffer);

    // Generate local URL (served via static route)
    const url = `/api/uploads/${key}`;

    logger.info('File uploaded to local storage', {
      key,
      path: filePath,
      size: buffer.length,
      contentType: mimeType,
      userId,
    });

    return {
      key,
      url,
      bucket: 'local',
      size: buffer.length,
      contentType: mimeType,
    };
  }

  /**
   * Upload file to S3 (production mode)
   */
  private async uploadFileS3(
    key: string,
    buffer: Buffer,
    mimeType: string,
    originalName: string,
    userId: string,
  ): Promise<UploadResult> {
    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'original-name': encodeURIComponent(originalName),
          'uploaded-by': userId,
          'upload-timestamp': new Date().toISOString(),
        },
      });

      await this.client.send(command);

      logger.info('File uploaded to S3', {
        key,
        bucket: this.bucket,
        size: buffer.length,
        contentType: mimeType,
        userId,
      });

      const url = await this.getSignedDownloadUrl(key);

      return {
        key,
        url,
        bucket: this.bucket,
        size: buffer.length,
        contentType: mimeType,
      };
    } catch (error) {
      logger.error('S3 upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
        userId,
      });
      throw new Error('Failed to upload file. Please try again.');
    }
  }

  /**
   * Generate presigned URL for direct client upload (S3 only)
   */
  async getPresignedUploadUrl(
    userId: string,
    mimeType: string,
    category: UploadOptions['category'],
  ): Promise<PresignedUrlResult> {
    this.initialize();

    if (this.useLocalStorage) {
      throw new Error('Presigned URLs not available in local storage mode. Use direct upload.');
    }

    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    if (!this.validateFileType(mimeType, category)) {
      throw new Error(`Invalid file type: ${mimeType}`);
    }

    const key = this.generateKey(userId, category, 'upload', mimeType);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'uploaded-by': userId,
        'upload-timestamp': new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: UPLOAD_URL_EXPIRY,
    });

    const expiresAt = new Date(Date.now() + UPLOAD_URL_EXPIRY * 1000);

    logger.info('Generated presigned upload URL', {
      key,
      userId,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      uploadUrl,
      key,
      expiresAt,
    };
  }

  /**
   * Generate signed download URL (S3) or local URL
   */
  async getSignedDownloadUrl(key: string): Promise<string> {
    this.initialize();

    if (this.useLocalStorage) {
      return `/api/uploads/${key}`;
    }

    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: DOWNLOAD_URL_EXPIRY,
    });
  }

  /**
   * Delete file
   */
  async deleteFile(key: string): Promise<void> {
    this.initialize();

    if (this.useLocalStorage) {
      const sanitizedKey = this.sanitizeKey(key);
      // nosemgrep: path-join-resolve-traversal - sanitizedKey is validated by sanitizeKey() to prevent path traversal
      const filePath = path.join(LOCAL_UPLOAD_DIR, sanitizedKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('File deleted from local storage', { key });
      }
      return;
    }

    if (!this.client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      logger.info('File deleted from S3', { key, bucket: this.bucket });
    } catch (error) {
      logger.error('S3 delete failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      throw new Error('Failed to delete file.');
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    this.initialize();

    if (this.useLocalStorage) {
      const sanitizedKey = this.sanitizeKey(key);
      // nosemgrep: path-join-resolve-traversal - sanitizedKey is validated by sanitizeKey() to prevent path traversal
      const filePath = path.join(LOCAL_UPLOAD_DIR, sanitizedKey);
      return fs.existsSync(filePath);
    }

    if (!this.client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
  } | null> {
    this.initialize();

    if (this.useLocalStorage) {
      const sanitizedKey = this.sanitizeKey(key);
      // nosemgrep: path-join-resolve-traversal - sanitizedKey is validated by sanitizeKey() to prevent path traversal
      const filePath = path.join(LOCAL_UPLOAD_DIR, sanitizedKey);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const ext = path.extname(key).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.gif': 'image/gif',
          '.pdf': 'application/pdf',
        };
        return {
          size: stats.size,
          contentType: mimeTypes[ext] || 'application/octet-stream',
          lastModified: stats.mtime,
        };
      }
      return null;
    }

    if (!this.client) {
      return null;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the local upload directory path (for serving files)
   */
  getLocalUploadDir(): string {
    return LOCAL_UPLOAD_DIR;
  }

  /**
   * Check if using local storage mode
   */
  isLocalStorageMode(): boolean {
    this.initialize();
    return this.useLocalStorage;
  }
}

export default new StorageService();
