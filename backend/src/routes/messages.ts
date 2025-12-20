import { Router } from 'express';
import {
    sendMessage,
    getConversationHistory,
    markAsRead,
} from '../controllers/messageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/send', authMiddleware, sendMessage);
router.get('/:conversationId', authMiddleware, getConversationHistory);
router.put('/:messageId/read', authMiddleware, markAsRead);

export default router;
