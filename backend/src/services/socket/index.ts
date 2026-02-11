import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "../../utils/jwt";
import { CacheService } from "../redis/cache";

let io: Server;
// Track call timeouts to cancel them when call is accepted/rejected
const callTimeouts = new Map<string, NodeJS.Timeout>();
// Track calls that have timed out to prevent joining
const timedOutCalls = new Set<string>();
// Track users currently in active calls (userId -> roomName)
const usersInCall = new Map<number, string>();

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
        return next(new Error("Authentication error"));
      }

      const decoded = verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.user.userId;
    console.log(`✅ User connected: ${userId}`);

    // Set user online
    await CacheService.setUserOnline(userId);
    io.emit("user_online", { userId });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join conversation rooms
    socket.on("join_conversation", (conversationId: number) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    // Leave conversation rooms
    socket.on("leave_conversation", (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Join group rooms
    socket.on("join_group", (groupId: number) => {
      socket.join(`group:${groupId}`);
      console.log(`User ${userId} joined group ${groupId}`);
    });

    // Leave group rooms
    socket.on("leave_group", (groupId: number) => {
      socket.leave(`group:${groupId}`);
      console.log(`User ${userId} left group ${groupId}`);
    });

    // Typing indicators for conversations
    socket.on("typing_start", async (data: { conversationId: number }) => {
      await CacheService.setTyping(data.conversationId, userId);
      socket.to(`conversation:${data.conversationId}`).emit("user_typing", {
        userId,
        conversationId: data.conversationId,
      });
    });

    socket.on("typing_stop", (data: { conversationId: number }) => {
      socket
        .to(`conversation:${data.conversationId}`)
        .emit("user_stopped_typing", {
          userId,
          conversationId: data.conversationId,
        });
    });

    // Typing indicators for groups
    socket.on("group_typing_start", (data: { groupId: number }) => {
      socket.to(`group:${data.groupId}`).emit("group_user_typing", {
        userId,
        groupId: data.groupId,
      });
    });

    socket.on("group_typing_stop", (data: { groupId: number }) => {
      socket.to(`group:${data.groupId}`).emit("group_user_stopped_typing", {
        userId,
        groupId: data.groupId,
      });
    });

    // Join room
    socket.on("join_room", (roomId: number) => {
      socket.join(`room:${roomId}`);
      console.log(`User ${userId} joined room ${roomId}`);
    });

    // Leave room
    socket.on("leave_room", (roomId: number) => {
      socket.leave(`room:${roomId}`);
      console.log(`User ${userId} left room ${roomId}`);
    });

    // Typing indicators for rooms
    socket.on("room_typing_start", (data: { roomId: number }) => {
      socket.to(`room:${data.roomId}`).emit("room_user_typing", {
        userId,
        roomId: data.roomId,
      });
    });

    socket.on("room_typing_stop", (data: { roomId: number }) => {
      socket.to(`room:${data.roomId}`).emit("room_user_stopped_typing", {
        userId,
        roomId: data.roomId,
      });
    });

    // Call events - Enhanced ringing flow
    socket.on(
      "call:initiate",
      async (data: {
        type: string;
        targetId: number;
        roomName: string;
        participants: number[];
      }) => {
        console.log(`User ${userId} initiating call in ${data.roomName}`);

        // Mark initiator as in call
        usersInCall.set(userId, data.roomName);

        // For conversation calls (1-on-1), check if the other user is busy
        if (data.type === "conversation") {
          const otherUserId = data.participants.find((id) => id !== userId);
          if (otherUserId && usersInCall.has(otherUserId)) {
            // User is busy, notify caller
            io.to(`user:${userId}`).emit("call:user_busy", {
              roomName: data.roomName,
              userId: otherUserId,
            });
            // Remove caller from active calls since call won't happen
            usersInCall.delete(userId);
            return;
          }
        }

        // For group/room calls, filter out busy users and send them missed call notifications
        const busyUsers: number[] = [];
        const availableParticipants: number[] = [];

        data.participants.forEach((participantId) => {
          if (participantId !== userId) {
            if (usersInCall.has(participantId)) {
              busyUsers.push(participantId);
            } else {
              availableParticipants.push(participantId);
            }
          }
        });

        // Send missed call messages to busy users for group/room calls
        if ((data.type === "group" || data.type === "room") && busyUsers.length > 0) {
          const { Message } = await import("../../models");
          for (const busyUserId of busyUsers) {
            try {
              await Message.create({
                [data.type === "group" ? "groupId" : "roomId"]: data.targetId,
                senderId: userId,
                content: `Missed call from ${socket.data.user.username}`,
                status: "sent",
              });
              
              // Notify the busy user about the missed call
              io.to(`user:${busyUserId}`).emit(data.type === "group" ? "new_group_message" : "new_room_message", {
                [data.type === "group" ? "groupId" : "roomId"]: data.targetId,
                senderId: userId,
                content: `Missed call from ${socket.data.user.username}`,
                sender: { username: socket.data.user.username },
              });
            } catch (error) {
              console.error(`Error creating missed call message for user ${busyUserId}:`, error);
            }
          }
        }

        // Notify available participants with ringing state
        availableParticipants.forEach((participantId) => {
          io.to(`user:${participantId}`).emit("call:incoming", {
            roomName: data.roomName,
            type: data.type,
            targetId: data.targetId,
            initiator: {
              id: userId,
              username: socket.data.user.username,
            },
            state: "ringing",
          });
        });

        // For conversation calls, if no available participants, the call won't proceed
        if (data.type === "conversation" && availableParticipants.length === 0) {
          usersInCall.delete(userId);
          return;
        }

        // Set timeout for call (30 seconds)
        const timeoutId = setTimeout(() => {
          console.log(`Call ${data.roomName} timed out`);
          // Mark this call as timed out
          timedOutCalls.add(data.roomName);

          // Notify ALL participants (initiator and recipients) about timeout
          data.participants.forEach((participantId) => {
            io.to(`user:${participantId}`).emit("call:timeout", {
              roomName: data.roomName,
              reason: "No response",
            });
          });
          // Clean up timeout reference
          callTimeouts.delete(data.roomName);
          // Remove initiator from active calls on timeout
          usersInCall.delete(userId);

          // Auto-cleanup timed out call after 5 seconds
          setTimeout(() => {
            timedOutCalls.delete(data.roomName);
          }, 5000);
        }, 30000);

        // Store timeout reference so we can cancel it later
        callTimeouts.set(data.roomName, timeoutId);
      },
    );

    socket.on(
      "call:accept",
      (data: {
        roomName: string;
        targetId: number;
        initiatorId: number;
        userId: number;
        username: string;
      }) => {
        console.log(`User ${userId} accepted call ${data.roomName}`);

        // Check if call has timed out
        if (timedOutCalls.has(data.roomName)) {
          console.log(`Call ${data.roomName} has already timed out`);
          io.to(`user:${userId}`).emit("call:timeout", {
            roomName: data.roomName,
            reason: "Call already ended",
          });
          return;
        }

        // Mark user as in call
        usersInCall.set(userId, data.roomName);

        // Cancel the timeout since call was accepted
        const timeoutId = callTimeouts.get(data.roomName);
        if (timeoutId) {
          clearTimeout(timeoutId);
          callTimeouts.delete(data.roomName);
          console.log(`Cancelled timeout for ${data.roomName}`);
        }

        // Notify all participants in the room that user accepted
        io.to(data.roomName).emit("call:participant_joined", {
          userId,
          username: socket.data.user.username,
        });
        // Notify the initiator specifically via their personal room
        io.to(`user:${data.initiatorId}`).emit("call:accepted", {
          userId,
          username: socket.data.user.username,
          roomName: data.roomName,
        });
      },
    );

    socket.on(
      "call:reject",
      (data: { roomName: string; initiatorId: number }) => {
        console.log(`User ${userId} rejected call ${data.roomName}`);

        // Cancel the timeout since call was rejected
        const timeoutId = callTimeouts.get(data.roomName);
        if (timeoutId) {
          clearTimeout(timeoutId);
          callTimeouts.delete(data.roomName);
          console.log(`Cancelled timeout for ${data.roomName}`);
        }

        // Notify the initiator
        io.to(`user:${data.initiatorId}`).emit("call:rejected", {
          userId,
          username: socket.data.user.username,
          roomName: data.roomName,
        });
      },
    );

    socket.on(
      "call:end",
      (data: { roomName: string; participants: number[] }) => {
        console.log(`User ${userId} ended call ${data.roomName}`);

        // Cancel the timeout if exists
        const timeoutId = callTimeouts.get(data.roomName);
        if (timeoutId) {
          clearTimeout(timeoutId);
          callTimeouts.delete(data.roomName);
        }

        // Remove all participants from active calls
        data.participants.forEach((participantId) => {
          usersInCall.delete(participantId);
          io.to(`user:${participantId}`).emit("call:ended", {
            roomName: data.roomName,
            endedBy: userId,
          });
        });
      },
    );

    socket.on(
      "call:participant_left",
      (data: { roomName: string; participants: number[] }) => {
        console.log(`User ${userId} left call ${data.roomName}`);
        
        // Remove user from active calls
        usersInCall.delete(userId);
        
        // Notify remaining participants
        data.participants.forEach((participantId) => {
          if (participantId !== userId) {
            io.to(`user:${participantId}`).emit(
              "call:participant_disconnected",
              {
                roomName: data.roomName,
                userId,
                username: socket.data.user.username,
              },
            );
          }
        });
      },
    );

    // Message read receipts
    socket.on(
      "message_read",
      (data: { messageId: number; conversationId: number }) => {
        socket
          .to(`conversation:${data.conversationId}`)
          .emit("message_read_receipt", {
            messageId: data.messageId,
            userId,
          });
      },
    );

    // Disconnect
    socket.on("disconnect", async () => {
      await CacheService.setUserOffline(userId);
      io.emit("user_offline", { userId });
      console.log(`❌ User disconnected: ${userId}`);
    });
  });

  console.log("✅ Socket.io initialized");
  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

export const isCallTimedOut = (roomName: string): boolean => {
  return timedOutCalls.has(roomName);
};

export const isUserInCall = (userId: number): boolean => {
  return usersInCall.has(userId);
};

export const getUsersInCall = (userIds: number[]): number[] => {
  return userIds.filter((id) => usersInCall.has(id));
};
