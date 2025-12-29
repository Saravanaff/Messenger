import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import conversationRoutes from './conversations';
import messageRoutes from './messages';
import groupRoutes from './groups';
import roomRoutes from './rooms';
import callRoutes from './calls';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/groups', groupRoutes);
router.use('/', roomRoutes); // Room routes have their own prefixes
router.use('/calls', callRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
