import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { messageLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/conversations', messageController.getConversations);
router.get('/conversations/:userId', messageController.getConversation);
router.get('/unread-count', messageController.getUnreadCount);
router.post('/send', messageLimiter, validate(schemas.createMessage), messageController.sendMessage);
router.post('/:conversationId/mark-read', messageController.markAsRead);
router.delete('/:messageId', messageController.deleteMessage);

export default router;
