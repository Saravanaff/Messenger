import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../../utils/jwt';
import { CacheService } from '../redis/cache';

let io: Server;

export const initializeSocket = (server: HTTPServer): Server => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true,
        },
    });

    io.use((socket: Socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }

            const decoded = verifyToken(token);
            socket.data.user = decoded;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async (socket: Socket) => {
        const userId = socket.data.user.userId;
        console.log(`✅ User connected: ${userId}`);

        // Set user online
        await CacheService.setUserOnline(userId);
        io.emit('user_online', { userId });

        // Join user's personal room
        socket.join(`user:${userId}`);

        // Join conversation rooms
        socket.on('join_conversation', (conversationId: number) => {
            socket.join(`conversation:${conversationId}`);
            console.log(`User ${userId} joined conversation ${conversationId}`);
        });

        // Leave conversation rooms
        socket.on('leave_conversation', (conversationId: number) => {
            socket.leave(`conversation:${conversationId}`);
            console.log(`User ${userId} left conversation ${conversationId}`);
        });

        // Join group rooms
        socket.on('join_group', (groupId: number) => {
            socket.join(`group:${groupId}`);
            console.log(`User ${userId} joined group ${groupId}`);
        });

        // Leave group rooms
        socket.on('leave_group', (groupId: number) => {
            socket.leave(`group:${groupId}`);
            console.log(`User ${userId} left group ${groupId}`);
        });

        // Typing indicators for conversations
        socket.on('typing_start', async (data: { conversationId: number }) => {
            await CacheService.setTyping(data.conversationId, userId);
            socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
                userId,
                conversationId: data.conversationId,
            });
        });

        socket.on('typing_stop', (data: { conversationId: number }) => {
            socket.to(`conversation:${data.conversationId}`).emit('user_stopped_typing', {
                userId,
                conversationId: data.conversationId,
            });
        });

        // Typing indicators for groups
        socket.on('group_typing_start', (data: { groupId: number }) => {
            socket.to(`group:${data.groupId}`).emit('group_user_typing', {
                userId,
                groupId: data.groupId,
            });
        });

        socket.on('group_typing_stop', (data: { groupId: number }) => {
            socket.to(`group:${data.groupId}`).emit('group_user_stopped_typing', {
                userId,
                groupId: data.groupId,
            });
        });

        // Message read receipts
        socket.on('message_read', (data: { messageId: number; conversationId: number }) => {
            socket.to(`conversation:${data.conversationId}`).emit('message_read_receipt', {
                messageId: data.messageId,
                userId,
            });
        });

        // Disconnect
        socket.on('disconnect', async () => {
            await CacheService.setUserOffline(userId);
            io.emit('user_offline', { userId });
            console.log(`❌ User disconnected: ${userId}`);
        });
    });

    console.log('✅ Socket.io initialized');
    return io;
};

export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

