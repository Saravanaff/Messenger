import { Router } from 'express';
import {
    sendMessage,
    getConversationHistory,
    markAsRead,
    markConversationAsRead,
} from '../controllers/messageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/send', authMiddleware, sendMessage);
router.get('/:conversationId', authMiddleware, getConversationHistory);
router.put('/:messageId/read', authMiddleware, markAsRead);
router.post('/conversation/:conversationId/mark-read', authMiddleware, markConversationAsRead);

export default router;
