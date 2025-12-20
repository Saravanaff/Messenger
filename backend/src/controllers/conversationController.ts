import { Response } from 'express';
import { Op } from 'sequelize';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { CacheService } from '../services/redis/cache';
import { AuthRequest } from '../middleware/auth';

export const getOrCreateConversation = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const otherUserId = parseInt(userId);

        if (currentUserId === otherUserId) {
            res.status(400).json({ error: 'Cannot create conversation with yourself' });
            return;
        }

        // Check if other user exists
        const otherUser = await User.findByPk(otherUserId);
        if (!otherUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Find existing conversation
        let conversation = await Conversation.findOne({
            where: {
                [Op.or]: [
                    { participant1Id: currentUserId, participant2Id: otherUserId },
                    { participant1Id: otherUserId, participant2Id: currentUserId },
                ],
            },
            include: [
                { model: User, as: 'participant1', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'participant2', attributes: ['id', 'username', 'email'] },
            ],
        });

        // Create new conversation if doesn't exist
        if (!conversation) {
            conversation = await Conversation.create({
                participant1Id: currentUserId,
                participant2Id: otherUserId,
            });

            // Reload with associations
            conversation = await Conversation.findByPk(conversation.id, {
                include: [
                    { model: User, as: 'participant1', attributes: ['id', 'username', 'email'] },
                    { model: User, as: 'participant2', attributes: ['id', 'username', 'email'] },
                ],
            });
        }

        res.json({ conversation });
    } catch (error: any) {
        console.error('Get/Create conversation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getUserConversations = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Check cache first
        const cached = await CacheService.getConversationList(currentUserId);
        if (cached) {
            res.json({ conversations: cached, source: 'cache' });
            return;
        }

        // Get conversations from database
        const conversations = await Conversation.findAll({
            where: {
                [Op.or]: [{ participant1Id: currentUserId }, { participant2Id: currentUserId }],
            },
            include: [
                { model: User, as: 'participant1', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'participant2', attributes: ['id', 'username', 'email'] },
            ],
            order: [['lastMessageAt', 'DESC']],
        });

        // Get last message for each conversation
        const conversationsWithLastMessage = await Promise.all(
            conversations.map(async (conv) => {
                const lastMessage = await Message.findOne({
                    where: { conversationId: conv.id },
                    order: [['createdAt', 'DESC']],
                    include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
                });

                // Get the other participant
                const otherParticipant =
                    conv.participant1Id === currentUserId ? conv.participant2 : conv.participant1;

                // Check if other participant is online
                const isOnline = await CacheService.isUserOnline(otherParticipant.id);

                return {
                    ...conv.toJSON(),
                    lastMessage: lastMessage?.toJSON() || null,
                    otherParticipant: {
                        ...otherParticipant.toJSON(),
                        isOnline,
                    },
                };
            })
        );

        // Cache results
        await CacheService.cacheConversationList(currentUserId, conversationsWithLastMessage);

        res.json({ conversations: conversationsWithLastMessage, source: 'database' });
    } catch (error: any) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
