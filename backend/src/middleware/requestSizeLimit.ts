/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Request Size Limit Middleware
 * Prevents DoS attacks through oversized payloads
 */

import { Request, Response, NextFunction } from 'express';
import { securityConfig } from '../config/security';

/**
 * Parse size string to bytes (e.g., "10mb" -> 10485760)
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * (units[unit] || 1));
}

/**
 * Middleware to enforce request body size limits
 */
export function requestSizeLimit(maxSize: string = securityConfig.request.maxBodySize) {
  const maxBytes = parseSize(maxSize);

  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxBytes) {
      res.status(413).json({
        error: 'Request payload too large',
        code: 'PAYLOAD_TOO_LARGE',
        maxSize,
        receivedSize: contentLength,
      });
      return;
    }

    // Track actual bytes received
    let receivedBytes = 0;

    req.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;

      if (receivedBytes > maxBytes) {
        req.pause();
        res.status(413).json({
          error: 'Request payload too large',
          code: 'PAYLOAD_TOO_LARGE',
          maxSize,
        });
        req.socket.destroy();
      }
    });

    next();
  };
}

/**
 * Middleware to enforce file upload size limits
 */
export function fileUploadSizeLimit(maxSize: number = securityConfig.request.maxFileSize) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // This works with multer middleware
    const file = (req as any).file;
    const files = (req as any).files;

    if (file && file.size > maxSize) {
      res.status(413).json({
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
        maxSize,
        receivedSize: file.size,
      });
      return;
    }

    if (files) {
      const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
      const oversizedFile = fileArray.find((f: any) => f.size > maxSize);

      if (oversizedFile) {
        res.status(413).json({
          error: 'File too large',
          code: 'FILE_TOO_LARGE',
          maxSize,
          receivedSize: oversizedFile.size,
          filename: oversizedFile.originalname,
        });
        return;
      }
    }

    next();
  };
}

/**
 * Middleware to enforce request timeout
 */
export function requestTimeout(timeout: number = securityConfig.request.timeout) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          code: 'REQUEST_TIMEOUT',
          timeout,
        });
      }
    }, timeout);

    // Clear timeout on response finish
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}
