/**
 * Connections Feature Module
 *
 * Feature: 003-complete-3-critical (Connection Requests)
 * Handles connection requests between users with:
 * - Rate limiting (5/day, 15/week)
 * - Encrypted messages at rest
 * - Real-time notifications via Socket.io
 * - Match creation on acceptance
 */

export { ConnectionRequestService, default as connectionRequestService } from './connection-request.service';
export { ConnectionRequestController, default as connectionRequestController } from './connection-request.controller';
export { default as connectionRequestRoutes } from './connection-request.routes';
