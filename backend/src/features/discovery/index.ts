/**
 * Discovery Feature Module
 *
 * Barrel file exporting all discovery feature components.
 */

export { DiscoveryService, default as discoveryService } from './discovery.service';
export { DiscoveryController, default as discoveryController } from './discovery.controller';
export { default as discoveryRoutes } from './discovery.routes';

// Cache service exports
export { DiscoveryCacheService, default as discoveryCacheService } from './cache/discovery-cache.service';
