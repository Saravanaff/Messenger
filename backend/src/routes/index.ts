import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import conversationRoutes from './conversations';
import messageRoutes from './messages';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
