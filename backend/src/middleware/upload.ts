/**
 * File Upload Middleware
 *
 * Purpose: Secure multipart form data handling for file uploads
 * Constitution: Principle II (Security - file validation, size limits)
 *
 * Security Features:
 * - Memory storage (no disk writes)
 * - File type validation (MIME type whitelist)
 * - File size limits (5MB images, 10MB documents)
 * - File count limits (1 per request)
 * - Error handling for malformed requests
 *
 * Created: 2025-12-07
 */

import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

// Extend Express Request to include file property from multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

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

// File size limits
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Create file filter for specific allowed types
 */
const createFileFilter = (allowedTypes: Set<string>) => {
  return (
    _req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ): void => {
    // Check MIME type against whitelist
    if (allowedTypes.has(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed types: ${Array.from(allowedTypes).join(', ')}`,
        ),
      );
    }
  };
};

/**
 * Multer configuration for profile photo uploads
 * - Max 5MB
 * - Only images (jpeg, png, webp, gif)
 * - Single file per request
 */
const profilePhotoStorage = multer.memoryStorage();

export const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1,
  },
  fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES),
});

/**
 * Multer configuration for document uploads (verification)
 * - Max 10MB
 * - Images and PDFs
 * - Single file per request
 */
const documentStorage = multer.memoryStorage();

export const uploadDocument = multer({
  storage: documentStorage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 1,
  },
  fileFilter: createFileFilter(ALLOWED_DOCUMENT_TYPES),
});

/**
 * Error handler middleware for multer errors
 * Must be used after multer middleware
 */
export const handleUploadError = (
  err: Error & { code?: string; field?: string },
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Check if it's a multer error by looking for the code property
  if (err.code) {
    // Multer-specific errors
    logger.warn('Multer upload error', {
      code: err.code,
      message: err.message,
      field: err.field,
      path: req.path,
    });

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(413).json({
          success: false,
          error: 'File too large. Maximum size is 5MB for images, 10MB for documents.',
        });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({
          success: false,
          error: 'Too many files. Only one file per upload is allowed.',
        });
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({
          success: false,
          error: 'Unexpected field name. Use "photo" for profile photos or "document" for verification docs.',
        });
        return;
      default:
        res.status(400).json({
          success: false,
          error: 'File upload failed. Please try again.',
        });
        return;
    }
  }

  if (err.message && err.message.includes('Invalid file type')) {
    // Custom file type validation error
    res.status(415).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Pass other errors to the global error handler
  next(err);
};

/**
 * Middleware to validate that a file was actually uploaded
 */
export const requireFile = (fieldName: string = 'file') => {
  return (req: MulterRequest, res: Response, next: NextFunction): void => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: `No file uploaded. Please provide a ${fieldName}.`,
      });
      return;
    }
    next();
  };
};

/**
 * Middleware to add file metadata to request for logging
 */
export const logUploadMetadata = (
  req: MulterRequest,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.file) {
    logger.info('File upload received', {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      userId: (req as MulterRequest & { userId?: string }).userId,
      path: req.path,
    });
  }
  next();
};
