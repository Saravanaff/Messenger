import { Request, Response } from 'express';
import { Message, Conversation, User } from '../models';
import { CacheService } from '../services/redis/cache';

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.userId;
        const { conversationId, content } = req.body;

        if (!content || !content.trim()) {
            res.status(400).json({ error: 'Message content is required' });
            return;
        }

        // Verify conversation exists and user is a participant
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
            res.status(403).json({ error: 'You are not a participant in this conversation' });
            return;
        }

        // Create message directly in database
        const message = await Message.create({
            conversationId,
            senderId: userId,
            content: content.trim(),
            status: 'sent',
        });

        // Update conversation's last message timestamp
        await conversation.update({ lastMessageAt: new Date() });

        // Invalidate conversation list cache for both participants
        await CacheService.invalidateConversationList(conversation.participant1Id);
        await CacheService.invalidateConversationList(conversation.participant2Id);

        // Get the full message with sender info
        const fullMessage = await Message.findByPk(message.id, {
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'username', 'email'],
                },
            ],
        });

        // Emit message via Socket.io to both participants
        const io = (req as any).io;
        if (io) {
            io.to(`conversation:${conversationId}`).emit('new_message', fullMessage);
        }

        res.status(201).json({
            message: 'Message sent successfully',
            data: fullMessage,
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

export const getConversationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.userId;
        const { conversationId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

        // Verify user is a participant
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
            res.status(403).json({ error: 'You are not a participant in this conversation' });
            return;
        }

        // Get messages
        const messages = await Message.findAll({
            where: { conversationId },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'username', 'email'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        const totalMessages = await Message.count({ where: { conversationId } });

        res.json({
            messages,
            pagination: {
                page,
                limit,
                total: totalMessages,
                totalPages: Math.ceil(totalMessages / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.userId;
        const { messageId } = req.params;

        const message = await Message.findByPk(messageId, {
            include: [
                {
                    model: Conversation,
                    as: 'conversation',
                },
            ],
        });

        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }

        const conversation = message.conversation;
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        // Only the recipient can mark as read
        if (message.senderId === userId) {
            res.status(400).json({ error: 'Cannot mark your own message as read' });
            return;
        }

        if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
            res.status(403).json({ error: 'You are not a participant in this conversation' });
            return;
        }

        // Update message status
        await message.update({ status: 'read' });

        res.json({
            message: 'Message marked as read',
            data: message,
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to mark message as read' });
    }
};
