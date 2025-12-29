import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../../utils/jwt';
import { CacheService } from '../redis/cache';

let io: Server;

export const initializeSocket = (server: HTTPServer): Server => {
    io = new Server(server, {
        cors: {
            origin: true,
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

        // Join room
        socket.on('join_room', (roomId: number) => {
            socket.join(`room:${roomId}`);
            console.log(`User ${userId} joined room ${roomId}`);
        });

        // Leave room
        socket.on('leave_room', (roomId: number) => {
            socket.leave(`room:${roomId}`);
            console.log(`User ${userId} left room ${roomId}`);
        });

        // Typing indicators for rooms
        socket.on('room_typing_start', (data: { roomId: number }) => {
            socket.to(`room:${data.roomId}`).emit('room_user_typing', {
                userId,
                roomId: data.roomId,
            });
        });

        socket.on('room_typing_stop', (data: { roomId: number }) => {
            socket.to(`room:${data.roomId}`).emit('room_user_stopped_typing', {
                userId,
                roomId: data.roomId,
            });
        });

        // Call events - Enhanced ringing flow
        socket.on('call:initiate', (data: { type: string; targetId: number; roomName: string; participants: number[] }) => {
            console.log(`User ${userId} initiating call in ${data.roomName}`);

            // Notify all participants except the initiator with ringing state
            data.participants.forEach((participantId) => {
                if (participantId !== userId) {
                    io.to(`user:${participantId}`).emit('call:incoming', {
                        roomName: data.roomName,
                        type: data.type,
                        targetId: data.targetId,
                        initiator: {
                            id: userId,
                            username: socket.data.user.username
                        },
                        state: 'ringing'
                    });
                }
            });

            // Set timeout for call (30 seconds)
            setTimeout(() => {
                io.to(`user:${userId}`).emit('call:timeout', {
                    roomName: data.roomName
                });
            }, 30000);
        });

        socket.on('call:accept', (data: { roomName: string; targetId: number }) => {
            console.log(`User ${userId} accepted call ${data.roomName}`);
            // Notify all participants in the room that user accepted
            io.to(data.roomName).emit('call:participant_joined', {
                userId,
                username: socket.data.user.username
            });
            // Notify the initiator specifically
            socket.to(data.roomName).emit('call:accepted', {
                userId,
                username: socket.data.user.username,
                roomName: data.roomName
            });
        });

        socket.on('call:reject', (data: { roomName: string; initiatorId: number }) => {
            console.log(`User ${userId} rejected call ${data.roomName}`);
            // Notify the initiator
            io.to(`user:${data.initiatorId}`).emit('call:rejected', {
                userId,
                username: socket.data.user.username,
                roomName: data.roomName
            });
        });

        socket.on('call:end', (data: { roomName: string; participants: number[] }) => {
            console.log(`User ${userId} ended call ${data.roomName}`);
            // Notify all participants
            data.participants.forEach((participantId) => {
                io.to(`user:${participantId}`).emit('call:ended', {
                    roomName: data.roomName,
                    endedBy: userId
                });
            });
        });

        socket.on('call:participant_left', (data: { roomName: string; participants: number[] }) => {
            console.log(`User ${userId} left call ${data.roomName}`);
            // Notify remaining participants
            data.participants.forEach((participantId) => {
                if (participantId !== userId) {
                    io.to(`user:${participantId}`).emit('call:participant_disconnected', {
                        roomName: data.roomName,
                        userId,
                        username: socket.data.user.username
                    });
                }
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

