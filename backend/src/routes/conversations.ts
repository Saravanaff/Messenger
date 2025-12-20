import { Router } from 'express';
import {
    getOrCreateConversation,
    getUserConversations,
} from '../controllers/conversationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getUserConversations);
router.get('/:userId', authMiddleware, getOrCreateConversation);

export default router;
