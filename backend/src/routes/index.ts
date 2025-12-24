import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import conversationRoutes from './conversations';
import messageRoutes from './messages';
import groupRoutes from './groups';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/groups', groupRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
