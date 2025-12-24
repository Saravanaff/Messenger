import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
    createGroup,
    getGroups,
    getGroupById,
    addMember,
    removeMember,
    promoteToAdmin,
    demoteFromAdmin,
    leaveGroup,
    sendGroupMessage,
    getGroupMessages,
} from '../controllers/groupController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Group CRUD
router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:groupId', getGroupById);

// Member management
router.post('/:groupId/members', addMember);
router.delete('/:groupId/members/:userId', removeMember);
router.put('/:groupId/members/:userId/promote', promoteToAdmin);
router.put('/:groupId/members/:userId/demote', demoteFromAdmin);
router.post('/:groupId/leave', leaveGroup);

// Messages
router.post('/:groupId/messages', sendGroupMessage);
router.get('/:groupId/messages', getGroupMessages);

export default router;
