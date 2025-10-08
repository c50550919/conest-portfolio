/**
 * Messages Routes (T064)
 *
 * Updated for Wave 4: Real-time Messaging System
 * - GET /api/messages/:matchId/history - Get message history with pagination
 * - POST /api/messages - Send message (encrypted, real-time via Socket.io)
 *
 * Constitution Principle III (Security) - Authentication + encryption required
 * Constitution Principle IV (Performance) - <100ms P95 for history, <50ms P95 for send
 */

import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation';
import { messageLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require JWT authentication
router.use(authenticateJWT);

// New endpoints for Wave 4
router.get('/:matchId/history', messageController.getMessageHistory);
router.post('/', messageLimiter, messageController.sendMessage);

// Legacy endpoints (keep for backward compatibility)
router.get('/conversations', messageController.getConversations);
router.get('/conversations/:userId', messageController.getConversation);
router.get('/unread-count', messageController.getUnreadCount);
router.post('/send', messageLimiter, validate(schemas.createMessage), messageController.sendMessage);
router.post('/:conversationId/mark-read', messageController.markAsRead);
router.delete('/:messageId', messageController.deleteMessage);

export default router;
