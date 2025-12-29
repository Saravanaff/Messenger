import { Response } from 'express';
import { Room } from '../models/Room';
import { RoomMember, RoomRole } from '../models/RoomMember';
import { GroupMember, GroupRole } from '../models/GroupMember';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../services/socket';

// Create a new room in a group (group admin only)
export const createRoom = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { groupId } = req.params;
        const { name, memberIds } = req.body;
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!name || !name.trim()) {
            res.status(400).json({ error: 'Room name is required' });
            return;
        }

        // Check if current user is a group admin
        const groupMembership = await GroupMember.findOne({
            where: { groupId: parseInt(groupId), userId: currentUserId, role: GroupRole.ADMIN },
        });

        if (!groupMembership) {
            res.status(403).json({ error: 'Only group admins can create rooms' });
            return;
        }

        // Create the room
        const room = await Room.create({
            name: name.trim(),
            groupId: parseInt(groupId),
            createdBy: currentUserId,
        });

        // Add creator as room admin
        await RoomMember.create({
            roomId: room.id,
            userId: currentUserId,
            role: RoomRole.ADMIN,
        });

        // Add other members if provided (must be group members)
        if (memberIds && Array.isArray(memberIds)) {
            const uniqueMemberIds = [...new Set(memberIds.filter((id: number) => id !== currentUserId))];

            for (const memberId of uniqueMemberIds) {
                // Verify user is a group member
                const isGroupMember = await GroupMember.findOne({
                    where: { groupId: parseInt(groupId), userId: memberId },
                });

                if (isGroupMember) {
                    await RoomMember.create({
                        roomId: room.id,
                        userId: memberId,
                        role: RoomRole.MEMBER,
                    });
                }
            }
        }

        // Fetch the complete room with members
        const completeRoom = await getRoomWithMembers(room.id);

        // Notify group members about new room
        const io = getIO();
        io.to(`group:${groupId}`).emit('room_created', {
            groupId: parseInt(groupId),
            room: completeRoom,
        });

        res.status(201).json({ room: completeRoom });
    } catch (error: any) {
        console.error('Create room error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all rooms in a group (must be group member)
export const getRooms = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { groupId } = req.params;
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Check if user is a group member
        const groupMembership = await GroupMember.findOne({
            where: { groupId: parseInt(groupId), userId: currentUserId },
        });

        if (!groupMembership) {
            res.status(403).json({ error: 'You are not a member of this group' });
            return;
        }

        // Get all rooms in the group that the user is a member of
        const roomMemberships = await RoomMember.findAll({
            where: { userId: currentUserId },
            include: [{
                model: Room,
                where: { groupId: parseInt(groupId) },
                include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'email'] }],
            }],
        });

        const rooms = await Promise.all(
            roomMemberships.map(async (membership) => {
                const memberCount = await RoomMember.count({
                    where: { roomId: membership.roomId },
                });

                const lastMessage = await Message.findOne({
                    where: { roomId: membership.roomId },
                    order: [['createdAt', 'DESC']],
                    include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
                });

                return {
                    ...membership.room.toJSON(),
                    memberCount,
                    lastMessage: lastMessage?.toJSON() || null,
                    myRole: membership.role,
                };
            })
        );

        res.json({ rooms });
    } catch (error: any) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get room by ID
export const getRoomById = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { roomId } = req.params;
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Check if user is a room member
        const membership = await RoomMember.findOne({
            where: { roomId: parseInt(roomId), userId: currentUserId },
        });

        if (!membership) {
            res.status(403).json({ error: 'You are not a member of this room' });
            return;
        }

        const room = await getRoomWithMembers(parseInt(roomId));

        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }

        res.json({ room, myRole: membership.role });
    } catch (error: any) {
        console.error('Get room error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Add member to room (must be group member, room admin only)
export const addMember = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { roomId } = req.params;
        const { userId } = req.body;
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Check if current user is room admin
        const adminCheck = await RoomMember.findOne({
            where: { roomId: parseInt(roomId), userId: currentUserId, role: RoomRole.ADMIN },
        });

        if (!adminCheck) {
            res.status(403).json({ error: 'Only room admins can add members' });
            return;
        }

        // Get the room to check group membership
        const room = await Room.findByPk(roomId);
        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }

        // Check if user is a group member
        const isGroupMember = await GroupMember.findOne({
            where: { groupId: room.groupId, userId },
        });

        if (!isGroupMember) {
            res.status(400).json({ error: 'User must be a group member to join the room' });
            return;
        }

        // Check if already a room member
        const existingMember = await RoomMember.findOne({
            where: { roomId: parseInt(roomId), userId },
        });

        if (existingMember) {
            res.status(400).json({ error: 'User is already a room member' });
            return;
        }

        // Add member
        await RoomMember.create({
            roomId: parseInt(roomId),
            userId,
            role: RoomRole.MEMBER,
        });

        const user = await User.findByPk(userId);

        // Notify via socket
        const io = getIO();
        io.to(`room:${roomId}`).emit('room_member_added', {
            roomId: parseInt(roomId),
            user: user?.toJSON(),
        });

        res.json({ message: 'Member added successfully' });
    } catch (error: any) {
        console.error('Add room member error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Remove member from room
export const removeMember = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { roomId, userId } = req.params;
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const targetUserId = parseInt(userId);

        // Check if current user is room admin
        const adminCheck = await RoomMember.findOne({
            where: { roomId: parseInt(roomId), userId: currentUserId, role: RoomRole.ADMIN },
        });

        if (!adminCheck) {
            res.status(403).json({ error: 'Only room admins can remove members' });
            return;
        }

        // Get room to check creator
        const room = await Room.findByPk(roomId);
        if (room && room.createdBy === targetUserId) {
            res.status(400).json({ error: 'Cannot remove the room creator' });
            return;
        }

        // Remove member
        const deleted = await RoomMember.destroy({
            where: { roomId: parseInt(roomId), userId: targetUserId },
        });

        if (!deleted) {
            res.status(404).json({ error: 'Member not found' });
            return;
        }

        // Notify via socket
        const io = getIO();
        io.to(`room:${roomId}`).emit('room_member_removed', {
            roomId: parseInt(roomId),
            userId: targetUserId,
        });

        res.json({ message: 'Member removed successfully' });
    } catch (error: any) {
        console.error('Remove room member error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Leave room
export const leaveRoom = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { roomId } = req.params;
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Check if user is the creator
        const room = await Room.findByPk(roomId);
        if (room && room.createdBy === currentUserId) {
            res.status(400).json({ error: 'Creator cannot leave the room. Delete the room instead.' });
            return;
        }

        // Remove membership
        const deleted = await RoomMember.destroy({
            where: { roomId: parseInt(roomId), userId: currentUserId },
        });

        if (!deleted) {
            res.status(404).json({ error: 'You are not a member of this room' });
            return;
        }

        // Notify via socket
        const io = getIO();
        io.to(`room:${roomId}`).emit('room_member_left', {
            roomId: parseInt(roomId),
            userId: currentUserId,
        });

        res.json({ message: 'Left room successfully' });
    } catch (error: any) {
        console.error('Leave room error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete room (creator only)
export const deleteRoom = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { roomId } = req.params;
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Check if user is the creator
        const room = await Room.findByPk(roomId);
        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }

        if (room.createdBy !== currentUserId) {
            res.status(403).json({ error: 'Only the room creator can delete the room' });
            return;
        }

        const groupId = room.groupId;

        // Delete all room members
        await RoomMember.destroy({ where: { roomId: parseInt(roomId) } });

        // Delete all room messages
        await Message.destroy({ where: { roomId: parseInt(roomId) } });

        // Delete the room
        await room.destroy();

        // Notify via socket
        const io = getIO();
        io.to(`group:${groupId}`).emit('room_deleted', {
            roomId: parseInt(roomId),
            groupId,
        });

        res.json({ message: 'Room deleted successfully' });
    } catch (error: any) {
        console.error('Delete room error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Send message to room
export const sendRoomMessage = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { roomId } = req.params;
        const { content } = req.body;
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!content || !content.trim()) {
            res.status(400).json({ error: 'Message content is required' });
            return;
        }

        // Check if user is a room member
        const membership = await RoomMember.findOne({
            where: { roomId: parseInt(roomId), userId: currentUserId },
        });

        if (!membership) {
            res.status(403).json({ error: 'You are not a member of this room' });
            return;
        }

        // Create message
        const message = await Message.create({
            roomId: parseInt(roomId),
            senderId: currentUserId,
            content: content.trim(),
        });

        // Fetch message with sender
        const messageWithSender = await Message.findByPk(message.id, {
            include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'email'] }],
        });

        // Broadcast to room
        const io = getIO();
        io.to(`room:${roomId}`).emit('new_room_message', messageWithSender?.toJSON());

        res.status(201).json({ message: messageWithSender });
    } catch (error: any) {
        console.error('Send room message error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get room messages
export const getRoomMessages = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { roomId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Check if user is a room member
        const membership = await RoomMember.findOne({
            where: { roomId: parseInt(roomId), userId: currentUserId },
        });

        if (!membership) {
            res.status(403).json({ error: 'You are not a member of this room' });
            return;
        }

        const messages = await Message.findAll({
            where: { roomId: parseInt(roomId) },
            include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
        });

        res.json({ messages, roomId: parseInt(roomId) });
    } catch (error: any) {
        console.error('Get room messages error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Helper function to get room with members
async function getRoomWithMembers(roomId: number) {
    const room = await Room.findByPk(roomId, {
        include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'email'] }],
    });

    if (!room) return null;

    const members = await RoomMember.findAll({
        where: { roomId },
        include: [{ model: User, attributes: ['id', 'username', 'email'] }],
    });

    return {
        ...room.toJSON(),
        members: members.map(m => ({
            ...m.user.toJSON(),
            role: m.role,
            joinedAt: m.createdAt,
        })),
    };
}
