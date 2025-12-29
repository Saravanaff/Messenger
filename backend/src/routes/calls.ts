import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { initiateCall, joinCall } from '../controllers/callController';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Initiate a new call
router.post('/initiate', initiateCall);

// Join an existing call
router.post('/join/:roomName', joinCall);

export default router;
