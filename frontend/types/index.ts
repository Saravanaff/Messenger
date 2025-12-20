export interface User {
    id: number;
    username: string;
    email: string;
    createdAt: string;
    isOnline?: boolean;
}

export interface Message {
    id: number;
    conversationId: number;
    senderId: number;
    content: string;
    status: 'sent' | 'delivered' | 'read';
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

export interface AuthResponse {
    message: string;
    token: string;
    user: User;
}

export interface ConversationListResponse {
    conversations: Conversation[];
    source: 'cache' | 'database';
}

export interface MessageHistoryResponse {
    messages: Message[];
    conversationId: number;
}

export interface UserSearchResponse {
    users: User[];
    source: 'cache' | 'database';
}
