import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import {
  conversationAPI,
  messageAPI,
  userAPI,
  groupAPI,
  roomAPI,
  callAPI,
} from "@/lib/api";
import { getAvatarColor, getInitials } from "@/lib/avatarUtils";
import type {
  Conversation,
  Message,
  User,
  Group,
  Room,
  GroupMember,
} from "@/types";
import type { IncomingCall, ActiveCall } from "@/types/call";
import styles from "../styles/Chat.module.css";
import groupStyles from "../styles/GroupChat.module.css";
import callStyles from "../styles/CallModal.module.css";
import CreateGroupModal from "@/components/groups/CreateGroupModal";
import GroupInfoPanel from "@/components/groups/GroupInfoPanel";
import GroupSettingsModal from "@/components/groups/GroupSettingsModal";
import CreateRoomModal from "@/components/rooms/CreateRoomModal";
import RoomInfoPanel from "@/components/rooms/RoomInfoPanel";
import CallModal from "@/components/call/CallModal";
import IncomingCallModal from "@/components/call/IncomingCallModal";
import TypingIndicator from "@/components/chat/TypingIndicator";

type ChatType = "conversation" | "group" | "room";

export default function ChatPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { socket } = useSocket();

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  // Rooms state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [groupMembersForRoom, setGroupMembersForRoom] = useState<GroupMember[]>(
    [],
  );
  const [groupRooms, setGroupRooms] = useState<Room[]>([]);

  // Current chat type
  const [chatType, setChatType] = useState<ChatType>("conversation");

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");

  // Loading states
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Call state
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [busyUserIds, setBusyUserIds] = useState<number[]>([]);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({}); // key: userId, value: username
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Load conversations and groups
  useEffect(() => {
    if (user) {
      loadConversations();
      loadGroups();
    }
  }, [user]);

  // Socket.io event listeners
  useEffect(() => {
    if (!socket || !user) return;

    // Conversation messages
    socket.on("new_message", (message: Message) => {
      console.log("📨 Received new_message event via socket:", message);
      console.log("🔍 Current state:", {
        chatType,
        selectedConversationId: selectedConversation?.id,
        messageConversationId: message.conversationId,
        currentUserId: user.id,
        messageSenderId: message.senderId,
      });

      // Only add message if it's from someone else (we add our own optimistically)
      if (message.senderId !== user.id) {
        console.log("✅ Message is from another user");
        if (
          chatType === "conversation" &&
          selectedConversation &&
          message.conversationId === selectedConversation.id
        ) {
          console.log("✅ Adding message to state");
          setMessages((prev) => [...prev, message]);
        } else {
          console.log(
            "⚠️ Message not added - conversation not selected or wrong conversation",
          );
        }
      } else {
        console.log(
          "⚠️ Message is from current user - skipping (optimistic update already done)",
        );
      }
      loadConversations();
    });

    // Group messages
    socket.on("new_group_message", (message: Message) => {
      console.log("Received new group message via socket:", message);
      // Only add message if it's from someone else (we add our own optimistically)
      if (message.senderId !== user.id) {
        if (
          chatType === "group" &&
          selectedGroup &&
          message.groupId === selectedGroup.id
        ) {
          setMessages((prev) => [...prev, message]);
        }
      }
      loadGroups();
    });

    // Room messages
    socket.on("new_room_message", (message: Message) => {
      console.log("Received new room message via socket:", message);
      if (message.senderId !== user.id) {
        if (
          chatType === "room" &&
          selectedRoom &&
          message.roomId === selectedRoom.id
        ) {
          setMessages((prev) => [...prev, message]);
        }
      }
    });

    // Group member events
    socket.on("member_added", () => {
      if (selectedGroup) {
        loadGroupMessages(selectedGroup.id);
      }
      loadGroups();
    });

    socket.on("member_removed", ({ userId }: { userId: number }) => {
      if (user && userId === user.id && selectedGroup) {
        // Current user was removed
        setSelectedGroup(null);
        setChatType("conversation");
      }
      loadGroups();
    });

    // Group settings updated
    socket.on(
      "group_settings_updated",
      ({
        groupId,
        settings,
      }: {
        groupId: number;
        settings: Group["settings"];
      }) => {
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, settings } : g)),
        );
        if (selectedGroup && selectedGroup.id === groupId) {
          setSelectedGroup((prev) => (prev ? { ...prev, settings } : prev));
        }
      },
    );

    // Room events
    socket.on(
      "room_member_removed",
      ({ roomId, userId }: { roomId: number; userId: number }) => {
        if (
          user &&
          userId === user.id &&
          selectedRoom &&
          selectedRoom.id === roomId
        ) {
          setSelectedRoom(null);
          setChatType("group");
        }
      },
    );

    socket.on("room_deleted", ({ roomId }: { roomId: number }) => {
      if (selectedRoom && selectedRoom.id === roomId) {
        setSelectedRoom(null);
        setChatType("group");
      }
    });

    socket.on("user_typing", ({ userId, conversationId }) => {
      console.log(`User ${userId} is typing in conversation ${conversationId}`);
      if (
        chatType === "conversation" &&
        selectedConversation &&
        conversationId === selectedConversation.id
      ) {
        // Find the other participant's username
        const otherUser = selectedConversation.otherParticipant;
        if (otherUser && userId === otherUser.id) {
          setTypingUsers((prev) => ({ ...prev, [userId]: otherUser.username }));

          // Auto-remove after 3 seconds
          setTimeout(() => {
            setTypingUsers((prev) => {
              const newState = { ...prev };
              delete newState[userId];
              return newState;
            });
          }, 3000);
        }
      }
    });

    socket.on("user_stopped_typing", ({ userId }) => {
      setTypingUsers((prev) => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
    });

    // Read receipt events
    socket.on("message_read_receipt", ({ messageId, userId, readAt }) => {
      console.log(`Message ${messageId} read by user ${userId}`);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "read" } : msg,
        ),
      );
    });

    socket.on("messages_read", ({ messageIds, userId }) => {
      console.log(`Messages read by user ${userId}:`, messageIds);
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg.id) ? { ...msg, status: "read" } : msg,
        ),
      );
    });

    // Call events
    socket.on("call:incoming", (data: IncomingCall) => {
      console.log("Incoming call:", data);
      setIncomingCall(data);
    });

    socket.on("call:accepted", async ({ userId, username, roomName }) => {
      console.log(`Call accepted by ${username}`);

      // For 1-on-1 calls: clear ringing state
      // For group calls: just log that someone joined (they'll appear in the video grid)
      if (activeCall && activeCall.roomName === roomName) {
        if (activeCall.type === "conversation") {
          setIsRinging(false);
        } else {
          // Group call - someone joined, update participants list
          console.log(`${username} joined the group call`);
          setActiveCall((prev) => {
            if (!prev) return prev;
            // Add the user to participants if not already there
            const isAlreadyInList = prev.participants.some(
              (p) => p.id === userId,
            );
            if (isAlreadyInList) return prev;

            return {
              ...prev,
              participants: [...prev.participants, { id: userId, username }],
            };
          });
        }
      }
    });

    socket.on("call:rejected", ({ userId, username, roomName }) => {
      console.log(`Call rejected by ${username}`);

      // Only end the call if this is a 1-on-1 conversation
      // For group calls, one person rejecting doesn't affect others
      if (
        activeCall &&
        activeCall.roomName === roomName &&
        activeCall.type === "conversation"
      ) {
        setIsRinging(false);
        setActiveCall(null);
        alert(`${username} rejected your call`);
      }
    });

    socket.on("call:ended", ({ roomName, endedBy }) => {
      console.log(`Call ended by user ${endedBy}`, {
        roomName,
        hasActiveCall: !!activeCall,
        activeCallRoom: activeCall?.roomName,
        hasIncomingCall: !!incomingCall,
        incomingCallRoom: incomingCall?.roomName,
      });

      if (activeCall && activeCall.roomName === roomName) {
        setActiveCall(null);
      }
      // If receiver has an incoming call from this room, clear it
      // Use functional update to access current state
      setIncomingCall((currentIncomingCall) => {
        if (currentIncomingCall && currentIncomingCall.roomName === roomName) {
          console.log("Clearing incoming call due to call:ended");
          return null;
        }
        return currentIncomingCall;
      });
    });

    socket.on(
      "call:participant_disconnected",
      ({ roomName, userId, username }) => {
        console.log(`${username} left the call`);
        if (activeCall && activeCall.roomName === roomName) {
          // Update active call participants list to remove the disconnected user
          setActiveCall((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: prev.participants.filter((p) => p.id !== userId),
            };
          });
          // Show notification that user left (optional - you could add a toast notification here)
          console.log(`${username} has left the call`);
        }
      },
    );

    // Handle user busy event for 1-on-1 calls
    socket.on("call:user_busy", ({ roomName }) => {
      console.log("User is busy on another call");
      setIsRinging(false);
      setActiveCall(null);
      alert("User is on another call. Please try again later.");
    });

    // User online/offline status
    socket.on("user_online", ({ userId }: { userId: number }) => {
      console.log(`User ${userId} is now online`);
      // Update conversation list
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.otherParticipant?.id === userId) {
            return {
              ...conv,
              otherParticipant: {
                ...conv.otherParticipant,
                isOnline: true,
              },
            };
          }
          return conv;
        }),
      );

      // Update selected conversation if it's the one that came online
      if (selectedConversation?.otherParticipant?.id === userId) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                otherParticipant: prev.otherParticipant
                  ? {
                      ...prev.otherParticipant,
                      isOnline: true,
                    }
                  : undefined,
              }
            : null,
        );
      }
    });

    socket.on("user_offline", ({ userId }: { userId: number }) => {
      console.log(`User ${userId} is now offline`);
      // Update conversation list
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.otherParticipant?.id === userId) {
            return {
              ...conv,
              otherParticipant: {
                ...conv.otherParticipant,
                isOnline: false,
              },
            };
          }
          return conv;
        }),
      );

      // Update selected conversation if it's the one that went offline
      if (selectedConversation?.otherParticipant?.id === userId) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                otherParticipant: prev.otherParticipant
                  ? {
                      ...prev.otherParticipant,
                      isOnline: false,
                    }
                  : undefined,
              }
            : null,
        );
      }
    });

    return () => {
      socket.off("new_message");
      socket.off("new_group_message");
      socket.off("new_room_message");
      socket.off("member_added");
      socket.off("member_removed");
      socket.off("room_member_removed");
      socket.off("room_deleted");
      socket.off("user_typing");
      socket.off("user_stopped_typing");
      socket.off("message_read_receipt");
      socket.off("messages_read");
      socket.off("call:incoming");
      socket.off("call:accepted");
      socket.off("call:rejected");
      socket.off("call:ended");
      socket.off("call:timeout");
      socket.off("call:participant_disconnected");
      socket.off("call:user_busy");
      socket.off("user_online");
      socket.off("user_offline");
    };
  }, [
    socket,
    selectedConversation,
    selectedGroup,
    selectedRoom,
    chatType,
    user,
    activeCall,
  ]);

  const loadConversations = async () => {
    try {
      const data = await conversationAPI.getAll();
      setConversations(data.conversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await groupAPI.getAll();
      setGroups(data.groups);
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    setLoadingMessages(true);
    try {
      const data = await messageAPI.getHistory(conversationId);
      setMessages(data.messages.reverse());

      if (socket) {
        console.log(
          `🔌 Joining conversation room: conversation:${conversationId}`,
        );
        socket.emit("join_conversation", conversationId);
      } else {
        console.error(
          "❌ Socket not available when trying to join conversation",
        );
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadGroupMessages = async (groupId: number) => {
    setLoadingMessages(true);
    try {
      const data = await groupAPI.getMessages(groupId);
      setMessages(data.messages.reverse());

      if (socket) {
        socket.emit("join_group", groupId);
      }
    } catch (error) {
      console.error("Error loading group messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    // Leave previous rooms
    if (socket) {
      if (selectedConversation) {
        socket.emit("leave_conversation", selectedConversation.id);
      }
      if (selectedGroup) {
        socket.emit("leave_group", selectedGroup.id);
      }
      if (selectedRoom) {
        socket.emit("leave_room", selectedRoom.id);
      }
    }

    setSelectedConversation(conversation);
    setSelectedGroup(null);
    setSelectedRoom(null);
    setChatType("conversation");
    setShowGroupInfo(false);
    setShowRoomInfo(false);
    loadMessages(conversation.id);
  };

  const handleSelectGroup = async (group: Group) => {
    // Leave previous rooms
    if (socket) {
      if (selectedConversation) {
        socket.emit("leave_conversation", selectedConversation.id);
      }
      if (selectedGroup) {
        socket.emit("leave_group", selectedGroup.id);
      }
      if (selectedRoom) {
        socket.emit("leave_room", selectedRoom.id);
      }
    }

    setSelectedGroup(group);
    setSelectedConversation(null);
    setSelectedRoom(null);
    setChatType("group");
    setShowRoomInfo(false);
    loadGroupMessages(group.id);

    // Load rooms for this group
    try {
      const { rooms } = await roomAPI.getAll(group.id);
      setGroupRooms(rooms);
    } catch (error) {
      console.error("Error loading rooms:", error);
      setGroupRooms([]);
    }
  };

  const handleSelectRoom = async (room: Room) => {
    // Leave previous rooms
    if (socket) {
      if (selectedConversation) {
        socket.emit("leave_conversation", selectedConversation.id);
      }
      if (selectedRoom) {
        socket.emit("leave_room", selectedRoom.id);
      }
    }

    // Fetch full room details
    try {
      const { room: fullRoom } = await roomAPI.getById(room.id);
      setSelectedRoom(fullRoom);
      setChatType("room");
      setShowGroupInfo(false);

      // Join room socket
      if (socket) {
        socket.emit("join_room", room.id);
      }

      // Load room messages
      setLoadingMessages(true);
      const data = await roomAPI.getMessages(room.id);
      setMessages(data.messages.reverse());
    } catch (error) {
      console.error("Error selecting room:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedGroup) return;

    // Get group members for room creation
    try {
      const { group } = await groupAPI.getById(selectedGroup.id);
      setGroupMembersForRoom(group.members || []);
      setShowCreateRoomModal(true);
    } catch (error) {
      console.error("Error fetching group members:", error);
    }
  };

  const handleRoomCreated = (room: Room) => {
    setShowCreateRoomModal(false);
    handleSelectRoom(room);
  };

  const handleLeaveRoom = () => {
    setSelectedRoom(null);
    setChatType("group");
    setShowRoomInfo(false);
    // Reload group messages
    if (selectedGroup) {
      loadGroupMessages(selectedGroup.id);
    }
  };

  const handleDeleteRoom = () => {
    setSelectedRoom(null);
    setChatType("group");
    setShowRoomInfo(false);
    // Reload group messages
    if (selectedGroup) {
      loadGroupMessages(selectedGroup.id);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user) return;

    // Stop typing indicator when sending
    if (socket) {
      if (chatType === "conversation" && selectedConversation) {
        socket.emit("typing_stop", { conversationId: selectedConversation.id });
      }
    }

    const tempMessage: Message = {
      id: Date.now(),
      conversationId:
        chatType === "conversation" ? selectedConversation?.id || null : null,
      groupId: chatType === "group" ? selectedGroup?.id || null : null,
      roomId: chatType === "room" ? selectedRoom?.id || null : null,
      senderId: user.id,
      content: messageInput.trim(),
      status: "sent",
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: "",
      },
    };

    setMessages((prev) => [...prev, tempMessage]);
    setMessageInput("");

    try {
      if (chatType === "conversation" && selectedConversation) {
        await messageAPI.send(selectedConversation.id, tempMessage.content);
        loadConversations();
      } else if (chatType === "group" && selectedGroup) {
        await groupAPI.sendMessage(selectedGroup.id, tempMessage.content);
        loadGroups();
      } else if (chatType === "room" && selectedRoom) {
        await roomAPI.sendMessage(selectedRoom.id, tempMessage.content);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    }
  };

  // Handle typing indicator with debounce
  const handleTyping = useCallback(
    (value: string) => {
      setMessageInput(value);

      if (!socket) return;

      // Emit typing start
      if (value.trim()) {
        if (chatType === "conversation" && selectedConversation) {
          socket.emit("typing_start", {
            conversationId: selectedConversation.id,
          });
        } else if (chatType === "group" && selectedGroup) {
          socket.emit("group_typing_start", { groupId: selectedGroup.id });
        } else if (chatType === "room" && selectedRoom) {
          socket.emit("room_typing_start", { roomId: selectedRoom.id });
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to emit typing stop after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          if (chatType === "conversation" && selectedConversation) {
            socket.emit("typing_stop", {
              conversationId: selectedConversation.id,
            });
          } else if (chatType === "group" && selectedGroup) {
            socket.emit("group_typing_stop", { groupId: selectedGroup.id });
          } else if (chatType === "room" && selectedRoom) {
            socket.emit("room_typing_stop", { roomId: selectedRoom.id });
          }
        }, 2000);
      } else {
        // Empty input, stop typing immediately
        if (chatType === "conversation" && selectedConversation) {
          socket.emit("typing_stop", {
            conversationId: selectedConversation.id,
          });
        } else if (chatType === "group" && selectedGroup) {
          socket.emit("group_typing_stop", { groupId: selectedGroup.id });
        } else if (chatType === "room" && selectedRoom) {
          socket.emit("room_typing_stop", { roomId: selectedRoom.id });
        }
      }
    },
    [socket, chatType, selectedConversation, selectedGroup, selectedRoom],
  );

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await userAPI.search(searchQuery);
        setSearchResults(data.users);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = async (selectedUser: User) => {
    try {
      const data = await conversationAPI.getOrCreate(selectedUser.id);
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      handleSelectConversation(data.conversation);
      loadConversations();
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleGroupCreated = (group: Group) => {
    setGroups((prev) => [group, ...prev]);
    handleSelectGroup(group);
  };

  const handleSaveGroupSettings = async (settings: Group["settings"]) => {
    if (!selectedGroup || !settings) return;

    try {
      const data = await groupAPI.updateSettings(selectedGroup.id, settings);
      setSelectedGroup(data.group);
      setGroups((prev) =>
        prev.map((g) => (g.id === selectedGroup.id ? data.group : g)),
      );
      setShowGroupSettings(false);
      alert("Group settings updated successfully!");
    } catch (error: any) {
      console.error("Error updating group settings:", error);
      alert(error.response?.data?.error || "Failed to update group settings");
    }
  };

  const handleLeaveGroup = () => {
    setSelectedGroup(null);
    setChatType("conversation");
    setShowGroupInfo(false);
    loadGroups();
  };

  // Call handlers
  const handleInitiateCall = async () => {
    if (!user || !socket) return;

    try {
      let type: "conversation" | "group" | "room";
      let targetId: number;
      let participants: number[] = [];

      if (chatType === "conversation" && selectedConversation) {
        type = "conversation";
        targetId = selectedConversation.id;
        participants = [user.id, selectedConversation.otherParticipant!.id];
      } else if (chatType === "group" && selectedGroup) {
        type = "group";
        targetId = selectedGroup.id;
        participants = selectedGroup.members?.map((m) => m.id) || [];
      } else if (chatType === "room" && selectedRoom) {
        type = "room";
        targetId = selectedRoom.id;
        participants = selectedRoom.members?.map((m) => m.id) || [];
      } else {
        return;
      }

      console.log("Initiating call:", { type, targetId });
      const { roomName, token, url } = await callAPI.initiate(type, targetId);
      console.log("Call initiated successfully:", { roomName });

      // For group/room calls: Join immediately (no ringing)
      // For conversation calls: Set ringing state and wait for acceptance
      const shouldRing = type === "conversation";
      setIsRinging(shouldRing);

      setActiveCall({
        roomName,
        token,
        url,
        type,
        targetId,
        participants: participants.map((id) => ({ id, username: "User" })),
        groupMembers:
          type === "group" && selectedGroup ? selectedGroup.members : undefined,
        isInitiator: true,
      });

      // Notify other participants
      socket.emit("call:initiate", {
        type,
        targetId,
        roomName,
        participants,
      });
    } catch (error: any) {
      console.error("Error initiating call:", error);
      alert(
        `Failed to start call: ${error.response?.data?.error || error.message || "Unknown error"}`,
      );
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall || !socket || !user) return;

    try {
      const { token, url } = await callAPI.join(incomingCall.roomName);

      // Get group members if this is a group call
      let groupMembers = undefined;
      if (
        incomingCall.type === "group" &&
        selectedGroup &&
        selectedGroup.id === incomingCall.targetId
      ) {
        groupMembers = selectedGroup.members;
      }

      setActiveCall({
        roomName: incomingCall.roomName,
        token,
        url,
        type: incomingCall.type,
        targetId: incomingCall.targetId,
        participants: [incomingCall.initiator],
        groupMembers,
        isInitiator: false,
      });

      // Notify initiator that we accepted
      socket.emit("call:accept", {
        roomName: incomingCall.roomName,
        targetId: incomingCall.targetId,
        userId: user.id,
        username: user.username,
        initiatorId: incomingCall.initiator.id,
      });

      setIncomingCall(null);
    } catch (error: any) {
      console.error("Error accepting call:", error);
      // Check if call has ended/timed out
      if (
        error.response?.status === 410 ||
        error.response?.data?.error?.includes("ended")
      ) {
        alert("Call has already ended");
        setIncomingCall(null);
      } else {
        alert("Failed to join call. Please try again.");
      }
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall || !socket) return;

    socket.emit("call:reject", {
      roomName: incomingCall.roomName,
      initiatorId: incomingCall.initiator.id,
    });

    setIncomingCall(null);
  };

  const handleLeaveCall = () => {
    if (!activeCall || !socket || !user) return;

    // For group/room calls:
    // - If we're the initiator, ending the call should end it for everyone
    // - If we're a participant who joined, we should just leave
    if (activeCall.type === "group" || activeCall.type === "room") {
      if (activeCall.isInitiator) {
        // Initiator ending the call - end for everyone
        socket.emit("call:end", {
          roomName: activeCall.roomName,
          participants: activeCall.participants.map((p) => p.id),
        });
      } else {
        // Participant leaving - just leave
        socket.emit("call:participant_left", {
          roomName: activeCall.roomName,
          participants: activeCall.participants.map((p) => p.id),
        });
      }
    }

    // Clear the call state locally
    setActiveCall(null);
    setIsRinging(false);
  };

  const handleEndCall = () => {
    if (!activeCall || !socket) return;

    // For conversation calls, end for both parties
    // For group/room calls, this should only be called by the room creator or admin
    socket.emit("call:end", {
      roomName: activeCall.roomName,
      participants: activeCall.participants.map((p) => p.id),
    });

    setActiveCall(null);
    setIsRinging(false);
  };

  const handleInviteToCall = async () => {
    // Fetch busy status for all group members
    if (activeCall && (activeCall.groupMembers || selectedGroup)) {
      const members = activeCall.groupMembers || selectedGroup?.members || [];
      const memberIds = members.map((m) => m.id);

      try {
        const { busyUserIds: busy } = await callAPI.checkBusy(memberIds);
        setBusyUserIds(busy);
      } catch (error) {
        console.error("Error checking busy status:", error);
        setBusyUserIds([]);
      }
    }

    setShowInviteModal(true);
  };

  const handleInviteUser = (userId: number) => {
    if (!activeCall || !socket || !selectedGroup) return;

    // Send notification to the specific user
    socket.emit("call:initiate", {
      type: "group",
      targetId: activeCall.targetId,
      roomName: activeCall.roomName,
      participants: [userId], // Only invite this specific user
    });

    setShowInviteModal(false);
  };

  if (loading || !user) {
    return (
      <div className={styles.loading}>
        <div className="pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div
        className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""}`}
      >
        <div className={styles.sidebarHeader}>
          {!sidebarCollapsed && <h1 className={styles.appTitle}>Messenger</h1>}
          {!sidebarCollapsed && (
            <button onClick={logout} className={styles.logoutButton}>
              Logout
            </button>
          )}
        </div>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={styles.toggleButton}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            {sidebarCollapsed ? (
              <path
                d="M9 18l6-6-6-6"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>

        {sidebarCollapsed ? (
          <>
            <div
              className={styles.collapsedUserIcon}
              style={{ backgroundColor: getAvatarColor(user.username) }}
            >
              {getInitials(user.username)}
            </div>
            <button
              className={styles.collapsedNewChatButton}
              onClick={() => {
                setSidebarCollapsed(false);
                setShowSearch(true);
              }}
              title="New Chat"
            >
              +
            </button>
          </>
        ) : (
          <>
            <div className={styles.userInfo}>
              <div
                className={styles.userAvatar}
                style={{ backgroundColor: getAvatarColor(user.username) }}
              >
                {getInitials(user.username)}
              </div>
              <div>
                <div className={styles.userName}>{user.username}</div>
                <div className={styles.userEmail}>{user.email}</div>
              </div>
            </div>

            <button
              className={styles.newChatButton}
              onClick={() => setShowSearch(!showSearch)}
            >
              New Chat
            </button>

            <button
              className={groupStyles.createGroupButton}
              onClick={() => setShowCreateGroupModal(true)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Create Group
            </button>

            {showSearch && (
              <div className={styles.searchContainer}>
                <input
                  type="text"
                  placeholder="Search users by email or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  autoFocus
                />
                {searchLoading && (
                  <div className={styles.searchLoading}>Searching...</div>
                )}
                {searchResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {searchResults.map((searchUser) => (
                      <div
                        key={searchUser.id}
                        className={styles.searchResultItem}
                        onClick={() => handleSelectUser(searchUser)}
                      >
                        <div
                          className={styles.searchResultAvatar}
                          style={{
                            backgroundColor: getAvatarColor(
                              searchUser.username,
                            ),
                          }}
                        >
                          {getInitials(searchUser.username)}
                        </div>
                        <div>
                          <div className={styles.searchResultName}>
                            {searchUser.username}
                          </div>
                          <div className={styles.searchResultEmail}>
                            {searchUser.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!searchLoading &&
                  searchQuery &&
                  searchResults.length === 0 && (
                    <div className={styles.noResults}>No users found</div>
                  )}
              </div>
            )}
          </>
        )}

        <div className={styles.conversationList}>
          {/* Groups Section with nested Rooms */}
          {!sidebarCollapsed && groups.length > 0 && (
            <>
              <div className={groupStyles.sectionLabel}>Groups</div>
              {groups.map((group) => {
                const groupRoomsForThisGroup = groupRooms.filter(
                  (room) => room.groupId === group.id,
                );
                const isExpanded = expandedGroups.has(group.id);
                const hasRooms = groupRoomsForThisGroup.length > 0;

                return (
                  <div key={`group-${group.id}`}>
                    <div
                      className={`${groupStyles.groupItem} ${selectedGroup?.id === group.id && chatType === "group" ? groupStyles.active : ""}`}
                      onClick={() => handleSelectGroup(group)}
                    >
                      <div className={groupStyles.groupAvatar}>
                        {getInitials(group.name)}
                      </div>
                      <div className={groupStyles.groupItemInfo}>
                        <div className={groupStyles.groupItemName}>
                          {group.name}
                          {hasRooms && (
                            <span className={groupStyles.roomCount}>
                              {groupRoomsForThisGroup.length}
                            </span>
                          )}
                        </div>
                        {group.lastMessage && (
                          <div className={groupStyles.groupLastMessage}>
                            {group.lastMessage.sender?.username}:{" "}
                            {group.lastMessage.content}
                          </div>
                        )}
                      </div>
                      {hasRooms && (
                        <button
                          className={groupStyles.expandButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedGroups((prev) => {
                              const newSet = new Set(prev);
                              if (newSet.has(group.id)) {
                                newSet.delete(group.id);
                              } else {
                                newSet.add(group.id);
                              }
                              return newSet;
                            });
                          }}
                          title={isExpanded ? "Collapse rooms" : "Expand rooms"}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{
                              transform: isExpanded
                                ? "rotate(90deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                            }}
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Nested Rooms */}
                    {hasRooms && isExpanded && (
                      <div className={groupStyles.nestedRooms}>
                        {groupRoomsForThisGroup.map((room) => (
                          <div
                            key={`room-${room.id}`}
                            className={`${groupStyles.roomItem} ${selectedRoom?.id === room.id ? groupStyles.active : ""}`}
                            onClick={() => handleSelectRoom(room)}
                          >
                            <div className={groupStyles.roomItemIcon}>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                              </svg>
                            </div>
                            <div className={groupStyles.roomItemInfo}>
                              <div className={groupStyles.roomItemName}>
                                {room.name}
                              </div>
                              <div className={groupStyles.roomItemMembers}>
                                {room.memberCount || room.members?.length || 0}{" "}
                                members
                              </div>
                            </div>
                          </div>
                        ))}
                        {(group.myRole === "admin" ||
                          group.settings?.whoCanCreateRooms === "everyone") && (
                          <button
                            className={groupStyles.createRoomButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectGroup(group);
                              handleCreateRoom();
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                            Create Room
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Conversations Section */}
          {!sidebarCollapsed &&
            (conversations.length > 0 || groups.length > 0) && (
              <div className={groupStyles.sectionLabel}>Direct Messages</div>
            )}

          {loadingConversations
            ? !sidebarCollapsed && (
                <div className={styles.loadingText}>
                  Loading conversations...
                </div>
              )
            : conversations.length === 0 && groups.length === 0
              ? !sidebarCollapsed && (
                  <div className={styles.emptyState}>
                    No conversations yet. Start a new chat!
                  </div>
                )
              : conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`${styles.conversationItem} ${
                      selectedConversation?.id === conv.id ? styles.active : ""
                    } ${sidebarCollapsed ? styles.collapsedItem : ""}`}
                    onClick={() => handleSelectConversation(conv)}
                    title={
                      sidebarCollapsed ? conv.otherParticipant?.username : ""
                    }
                  >
                    <div
                      className={styles.conversationAvatar}
                      style={{
                        backgroundColor: getAvatarColor(
                          conv.otherParticipant?.username || "",
                        ),
                      }}
                    >
                      {getInitials(conv.otherParticipant?.username || "")}
                      {conv.otherParticipant?.isOnline && (
                        <div className={styles.onlineIndicator} />
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <div className={styles.conversationInfo}>
                        <div className={styles.conversationName}>
                          {conv.otherParticipant?.username}
                        </div>
                        {conv.lastMessage && (
                          <div className={styles.lastMessage}>
                            {conv.lastMessage.content}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.mainArea}>
        {chatType === "conversation" && selectedConversation ? (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderInfo}>
                <div
                  className={styles.chatAvatar}
                  style={{
                    backgroundColor: getAvatarColor(
                      selectedConversation.otherParticipant?.username || "",
                    ),
                  }}
                >
                  {getInitials(
                    selectedConversation.otherParticipant?.username || "",
                  )}
                </div>
                <div>
                  <div className={styles.chatName}>
                    {selectedConversation.otherParticipant?.username}
                  </div>
                  <div className={styles.chatStatus}>
                    {selectedConversation.otherParticipant?.isOnline
                      ? "Online"
                      : "Offline"}
                  </div>
                </div>
              </div>
              <button
                className={callStyles.callButton}
                onClick={handleInitiateCall}
                title="Start Call"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
            </div>

            <div className={styles.messagesContainer}>
              {loadingMessages ? (
                <div className={styles.loadingText}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyState}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.message} ${message.senderId === user.id ? styles.sent : styles.received}`}
                  >
                    <div className={styles.messageContent}>
                      {message.content}
                    </div>
                    <div className={styles.messageTime}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Typing Indicator */}
            {Object.keys(typingUsers).length > 0 && (
              <TypingIndicator username={Object.values(typingUsers)[0]} />
            )}

            <form
              onSubmit={handleSendMessage}
              className={styles.messageInputContainer}
            >
              <input
                type="text"
                value={messageInput}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Type a message..."
                className={styles.messageInput}
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!messageInput.trim()}
              >
                Send
              </button>
            </form>
          </>
        ) : chatType === "group" && selectedGroup ? (
          <>
            <div className={groupStyles.groupHeader}>
              <div className={groupStyles.groupHeaderAvatar}>
                {getInitials(selectedGroup.name)}
              </div>
              <div className={groupStyles.groupHeaderInfo}>
                <div className={groupStyles.groupHeaderName}>
                  {selectedGroup.name}
                </div>
                <div
                  className={groupStyles.groupHeaderMemberCount}
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setShowGroupInfo(!showGroupInfo)}
                  title="View group details"
                >
                  {selectedGroup.memberCount ||
                    selectedGroup.members?.length ||
                    0}{" "}
                  members
                </div>
              </div>
              {selectedGroup.myRole === "admin" && (
                <button
                  className={groupStyles.infoButton}
                  onClick={() => setShowGroupSettings(true)}
                  title="Group Settings"
                  style={{ marginRight: "8px" }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m-9-9h6m6 0h6"></path>
                    <path d="M4.22 4.22l4.24 4.24m7.08 0l4.24-4.24M4.22 19.78l4.24-4.24m7.08 0l4.24 4.24"></path>
                  </svg>
                </button>
              )}
              <button
                className={callStyles.callButton}
                onClick={handleInitiateCall}
                title="Start Group Call"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
            </div>

            <div className={styles.messagesContainer}>
              {loadingMessages ? (
                <div className={styles.loadingText}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyState}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.message} ${message.senderId === user.id ? styles.sent : styles.received}`}
                  >
                    {message.senderId !== user.id && (
                      <div className={groupStyles.messageSenderName}>
                        {message.sender?.username}
                      </div>
                    )}
                    <div className={styles.messageContent}>
                      {message.content}
                    </div>
                    <div className={styles.messageTime}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              className={styles.messageInputContainer}
            >
              {(selectedGroup.myRole === "admin" ||
                selectedGroup.settings?.whoCanCreateRooms === "everyone") && (
                <button
                  type="button"
                  className={groupStyles.createRoomIconButton}
                  onClick={handleCreateRoom}
                  title="Create Room"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    <line x1="12" y1="8" x2="12" y2="14"></line>
                    <line x1="9" y1="11" x2="15" y2="11"></line>
                  </svg>
                </button>
              )}
              <input
                type="text"
                value={messageInput}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder={
                  selectedGroup.myRole === "admin" ||
                  selectedGroup.settings?.whoCanSendMessages === "everyone"
                    ? "Type a message..."
                    : "Only admins can send messages"
                }
                className={styles.messageInput}
                disabled={
                  selectedGroup.myRole !== "admin" &&
                  selectedGroup.settings?.whoCanSendMessages === "admin"
                }
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!messageInput.trim()}
              >
                Send
              </button>
            </form>
          </>
        ) : chatType === "room" && selectedRoom ? (
          <>
            <div className={groupStyles.groupHeader}>
              <button
                className={groupStyles.infoButton}
                onClick={() => {
                  setChatType("group");
                  setSelectedRoom(null);
                  setShowRoomInfo(false);
                  // Reload group messages when going back
                  if (selectedGroup) {
                    loadGroupMessages(selectedGroup.id);
                  }
                }}
                title="Back to Group"
                style={{ marginRight: "8px" }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div
                className={groupStyles.groupHeaderAvatar}
                style={{ borderRadius: "8px" }}
              >
                {getInitials(selectedRoom.name)}
              </div>
              <div className={groupStyles.groupHeaderInfo}>
                <div className={groupStyles.groupHeaderName}>
                  {selectedRoom.name}
                </div>
                <div className={groupStyles.groupHeaderMemberCount}>
                  {selectedRoom.memberCount ||
                    selectedRoom.members?.length ||
                    0}{" "}
                  members • Room
                </div>
              </div>
              <button
                className={callStyles.callButton}
                onClick={handleInitiateCall}
                title="Start Room Call"
                style={{ marginRight: "8px" }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
              <button
                className={groupStyles.infoButton}
                onClick={async () => {
                  if (selectedGroup) {
                    const { group } = await groupAPI.getById(selectedGroup.id);
                    setGroupMembersForRoom(group.members || []);
                  }
                  setShowRoomInfo(!showRoomInfo);
                }}
                title="Room Info"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>
            </div>

            <div className={styles.messagesContainer}>
              {loadingMessages ? (
                <div className={styles.loadingText}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyState}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.message} ${message.senderId === user.id ? styles.sent : styles.received}`}
                  >
                    {message.senderId !== user.id && (
                      <div className={groupStyles.messageSenderName}>
                        {message.sender?.username}
                      </div>
                    )}
                    <div className={styles.messageContent}>
                      {message.content}
                    </div>
                    <div className={styles.messageTime}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              className={styles.messageInputContainer}
            >
              <input
                type="text"
                value={messageInput}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Type a message..."
                className={styles.messageInput}
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!messageInput.trim()}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className={styles.emptyChat}>
            <div className={styles.emptyChatIcon}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h2>Select a conversation</h2>
            <p>Choose a conversation from the sidebar or start a new chat</p>
          </div>
        )}
      </div>

      {/* Group Info Panel */}
      {showGroupInfo && selectedGroup && (
        <GroupInfoPanel
          group={selectedGroup}
          currentUserId={user.id}
          onClose={() => setShowGroupInfo(false)}
          onMemberAdded={loadGroups}
          onMemberRemoved={loadGroups}
          onLeaveGroup={handleLeaveGroup}
          onSelectRoom={handleSelectRoom}
          onCreateRoom={handleCreateRoom}
        />
      )}

      {/* Room Info Panel */}
      {showRoomInfo && selectedRoom && selectedGroup && (
        <RoomInfoPanel
          room={selectedRoom}
          groupMembers={groupMembersForRoom}
          currentUserId={user.id}
          onClose={() => setShowRoomInfo(false)}
          onLeave={handleLeaveRoom}
          onDelete={handleDeleteRoom}
          onMemberChange={() => {}}
        />
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
        currentUserId={user.id}
      />

      {/* Group Settings Modal */}
      {showGroupSettings && selectedGroup && selectedGroup.settings && (
        <GroupSettingsModal
          settings={selectedGroup.settings}
          onClose={() => setShowGroupSettings(false)}
          onSave={handleSaveGroupSettings}
        />
      )}

      {/* Create Room Modal */}
      {showCreateRoomModal && selectedGroup && (
        <CreateRoomModal
          groupId={selectedGroup.id}
          groupMembers={groupMembersForRoom}
          onClose={() => setShowCreateRoomModal(false)}
          onRoomCreated={handleRoomCreated}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Active Call Modal */}
      {activeCall && (
        <CallModal
          call={activeCall}
          onEnd={handleEndCall}
          onLeave={handleLeaveCall}
          onInviteParticipants={
            activeCall.type === "group" ? handleInviteToCall : undefined
          }
          isRinging={isRinging}
        />
      )}

      {/* Invite to Call Modal */}
      {showInviteModal &&
        activeCall &&
        (activeCall.groupMembers || selectedGroup) && (
          <div
            className={groupStyles.modalOverlay}
            onClick={() => setShowInviteModal(false)}
            style={{
              zIndex: 3000,
            }}
          >
            <div
              className={groupStyles.modal}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "500px",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className={groupStyles.modalHeader}>
                <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
                  Invite to Call
                </h2>
                <button
                  className={groupStyles.closeButton}
                  onClick={() => setShowInviteModal(false)}
                >
                  ×
                </button>
              </div>
              <div
                className={groupStyles.modalBody}
                style={{ padding: "1.5rem" }}
              >
                <p
                  style={{
                    marginBottom: "1rem",
                    color: "#666",
                    fontSize: "0.9rem",
                  }}
                >
                  Select members to invite to the call
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {(activeCall.groupMembers || selectedGroup?.members)
                    ?.filter((member) => member.id !== user.id)
                    .map((member) => {
                      const isInCall = activeCall.participants.some(
                        (p) => p.id === member.id,
                      );
                      const isBusy = busyUserIds.includes(member.id);
                      const isDisabled = isInCall || isBusy;

                      return (
                        <div
                          key={member.id}
                          onClick={() =>
                            !isDisabled && handleInviteUser(member.id)
                          }
                          className={groupStyles.memberItem}
                          style={{
                            padding: "0.75rem 1rem",
                            background: isInCall
                              ? "#e7f5ff"
                              : isBusy
                                ? "#fff3cd"
                                : "#f8f9fa",
                            borderRadius: "12px",
                            cursor: isDisabled ? "default" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            transition: "all 0.2s ease",
                            border: isInCall
                              ? "1px solid #4dabf7"
                              : isBusy
                                ? "1px solid #ffc107"
                                : "1px solid #e9ecef",
                            opacity: isDisabled ? 0.8 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!isDisabled) {
                              e.currentTarget.style.background = "#e7f5ff";
                              e.currentTarget.style.borderColor = "#4dabf7";
                              e.currentTarget.style.transform =
                                "translateX(4px)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isDisabled) {
                              e.currentTarget.style.background = "#f8f9fa";
                              e.currentTarget.style.borderColor = "#e9ecef";
                              e.currentTarget.style.transform = "translateX(0)";
                            }
                          }}
                        >
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "50%",
                              background: getAvatarColor(member.username),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontWeight: "600",
                              fontSize: "1rem",
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(member.username)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: "500",
                                fontSize: "1rem",
                                color: "#212529",
                                marginBottom: "2px",
                              }}
                            >
                              {member.username}
                            </div>
                            {member.email && (
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#868e96",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {member.email}
                              </div>
                            )}
                          </div>
                          {isInCall ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                color: "#4dabf7",
                                fontSize: "0.85rem",
                                fontWeight: "500",
                                flexShrink: 0,
                              }}
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                              In Call
                            </div>
                          ) : isBusy ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                color: "#f59e0b",
                                fontSize: "0.85rem",
                                fontWeight: "500",
                                flexShrink: 0,
                              }}
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                              </svg>
                              Busy
                            </div>
                          ) : (
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: "#4dabf7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "1.2rem",
                                flexShrink: 0,
                              }}
                            >
                              +
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {(activeCall.groupMembers || selectedGroup?.members)?.filter(
                    (member) => member.id !== user.id,
                  ).length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem 1rem",
                        color: "#868e96",
                      }}
                    >
                      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                        👥
                      </div>
                      <p style={{ margin: 0, fontSize: "1rem" }}>
                        No other members in this group
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
