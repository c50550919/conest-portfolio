/**
 * Matching Feature Module
 *
 * FHA-compliant pairing/matching service with neutral compatibility scoring.
 * Uses preference-based factors only (no family composition scoring).
 */

export { PairingService, MatchingService } from './matching.service';
export { matchController } from './matching.controller';
export { default as matchRoutes } from './matching.routes';
