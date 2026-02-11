export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  isOnline?: boolean;
}

export interface Message {
  id: number;
  conversationId?: number | null;
  groupId?: number | null;
  roomId?: number | null;
  senderId: number;
  content: string;
  status: "sent" | "delivered" | "read";
  createdAt: string;
  sender?: User;
}

export interface Conversation {
  id: number;
  participant1Id: number;
  participant2Id: number;
  lastMessageAt: string | null;
  createdAt: string;
  participant1?: User;
  participant2?: User;
  lastMessage?: Message | null;
  otherParticipant?: User;
}

export interface GroupMember extends User {
  role: "admin" | "member";
  joinedAt: string;
}

export interface Group {
  id: number;
  name: string;
  createdBy: number;
  createdAt: string;
  creator?: User;
  members?: GroupMember[];
  memberCount?: number;
  lastMessage?: Message | null;
  myRole?: "admin" | "member";
  settings?: {
    whoCanCreateRooms: "admin" | "everyone";
    whoCanSendMessages: "admin" | "everyone";
    whoCanAddMembers: "admin" | "everyone";
    whoCanRemoveMembers: "admin" | "everyone";
  };
}

export interface RoomMember extends User {
  role: "admin" | "member";
  joinedAt: string;
}

export interface Room {
  id: number;
  name: string;
  groupId: number;
  createdBy: number;
  createdAt: string;
  creator?: User;
  members?: RoomMember[];
  memberCount?: number;
  lastMessage?: Message | null;
  myRole?: "admin" | "member";
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  source: "cache" | "database";
}

export interface MessageHistoryResponse {
  messages: Message[];
  conversationId?: number;
  groupId?: number;
  roomId?: number;
}

export interface UserSearchResponse {
  users: User[];
  source: "cache" | "database";
}

export interface GroupListResponse {
  groups: Group[];
}

export interface GroupResponse {
  group: Group;
  myRole: "admin" | "member";
}

export interface RoomListResponse {
  rooms: Room[];
}

export interface RoomResponse {
  room: Room;
  myRole: "admin" | "member";
}
