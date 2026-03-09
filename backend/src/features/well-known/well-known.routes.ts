/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */

/**
 * Well-Known Routes
 *
 * Serves the Apple App Site Association (AASA) file for iOS Universal Links
 * and the Digital Asset Links file for Android App Links.
 *
 * These endpoints are unauthenticated and served at /.well-known/ as required
 * by the respective platform specifications.
 *
 * Reference: https://developer.apple.com/documentation/xcode/supporting-associated-domains
 * Reference: https://developer.android.com/training/app-links/verify-android-applinks
 */

import { Router, Request, Response } from 'express';

const router = Router();

// iOS Universal Links - Apple App Site Association
// Served at: /.well-known/apple-app-site-association
router.get('/apple-app-site-association', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: 'TEAM_ID.com.conest.app', // TODO: Replace TEAM_ID with Apple Team ID
          paths: [
            '/verify-email/*',
            '/verification',
            '/verify-phone',
            '/verify-id',
            '/background-check',
            '/messages/*',
            '/connections',
            '/household/*',
            '/discover',
            '/profile/*',
          ],
        },
      ],
    },
  });
});

// Android App Links - Digital Asset Links
// Served at: /.well-known/assetlinks.json
router.get('/assetlinks.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.conest.app',
        sha256_cert_fingerprints: [
          // TODO: Replace with actual SHA-256 certificate fingerprint
          // Generate with: keytool -list -v -keystore your-keystore.jks
          'REPLACE_WITH_SHA256_FINGERPRINT',
        ],
      },
    },
  ]);
});

export default router;
