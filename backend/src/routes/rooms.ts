import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
    createRoom,
    getRooms,
    getRoomById,
    addMember,
    removeMember,
    leaveRoom,
    deleteRoom,
    sendRoomMessage,
    getRoomMessages,
} from '../controllers/roomController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Room CRUD within a group
router.post('/groups/:groupId/rooms', createRoom);
router.get('/groups/:groupId/rooms', getRooms);

// Room-specific operations
router.get('/rooms/:roomId', getRoomById);
router.delete('/rooms/:roomId', deleteRoom);

// Member management
router.post('/rooms/:roomId/members', addMember);
router.delete('/rooms/:roomId/members/:userId', removeMember);
router.post('/rooms/:roomId/leave', leaveRoom);

// Messages
router.post('/rooms/:roomId/messages', sendRoomMessage);
router.get('/rooms/:roomId/messages', getRoomMessages);

export default router;
