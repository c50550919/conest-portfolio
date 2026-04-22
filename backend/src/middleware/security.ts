/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import helmet from 'helmet';
import cors from 'cors';
import { Express } from 'express';

/**
 * Parse a CORS-origin env var into the `origin` option cors() expects.
 *
 * Supports a comma-delimited explicit allowlist (e.g.,
 * "https://app.placd.io,https://admin.placd.io") so multi-origin setups
 * work without code changes. Exact-match only; no regex. Empty entries
 * after trimming are filtered out.
 *
 * In development, falls back to http://localhost:19006 when the named env
 * var is unset so native mobile dev workflow keeps working out of the box.
 * In any non-development environment, throws if the var is unset.
 *
 * @param envVarName Defaults to CORS_ORIGIN. Socket.io initializers that
 *   read CLIENT_URL can pass that name to reuse the same behavior.
 */
export function parseCorsOrigin(envVarName: string = 'CORS_ORIGIN'): string | string[] {
  const raw = process.env[envVarName]?.trim();
  if (raw) {
    const origins = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return origins.length === 1 ? origins[0] : origins;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:19006';
  }
  throw new Error(
    `${envVarName} environment variable is required outside development. ` +
      'Set to a single origin or comma-delimited explicit allowlist.',
  );
}

export const setupSecurity = (app: Express): void => {
  // Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // CORS configuration
  const corsOptions = {
    origin: parseCorsOrigin(),
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));

  // Disable X-Powered-By header
  app.disable('x-powered-by');
};
