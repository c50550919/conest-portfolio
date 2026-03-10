/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Discovery Feature Module
 *
 * Barrel file exporting all discovery feature components.
 */

export { DiscoveryService, default as discoveryService } from './discovery.service';
export { DiscoveryController, default as discoveryController } from './discovery.controller';
export { default as discoveryRoutes } from './discovery.routes';

// Cache service exports
export {
  DiscoveryCacheService,
  default as discoveryCacheService,
} from './cache/discovery-cache.service';
