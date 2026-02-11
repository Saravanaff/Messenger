import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { initiateCall, joinCall, checkUsersBusy } from '../controllers/callController';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Initiate a new call
router.post('/initiate', initiateCall);

// Join an existing call
router.post('/join/:roomName', joinCall);

// Check if users are busy (in other calls)
router.post('/check-busy', checkUsersBusy);

export default router;
