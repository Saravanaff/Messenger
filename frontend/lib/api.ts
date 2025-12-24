import axios from 'axios';
import type {
    AuthResponse,
    User,
    UserSearchResponse,
    Conversation,
    ConversationListResponse,
    MessageHistoryResponse,
    Group,
    GroupListResponse,
    GroupResponse,
    Message,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
        const { data } = await api.post<AuthResponse>('/auth/register', {
            username,
            email,
            password,
        });
        return data;
    },

    login: async (email: string, password: string): Promise<AuthResponse> => {
        const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
        return data;
    },

    me: async (token?: string): Promise<{ user: User }> => {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const { data } = await api.get<{ user: User }>('/auth/me', { headers });
        return data;
    },
};

// User API
export const userAPI = {
    search: async (query: string): Promise<UserSearchResponse> => {
        const { data } = await api.get<UserSearchResponse>('/users/search', {
            params: { query },
        });
        return data;
    },

    getProfile: async (userId: number): Promise<{ user: User }> => {
        const { data } = await api.get<{ user: User }>(`/users/${userId}`);
        return data;
    },
};

// Conversation API
export const conversationAPI = {
    getAll: async (): Promise<ConversationListResponse> => {
        const { data } = await api.get<ConversationListResponse>('/conversations');
        return data;
    },

    getOrCreate: async (userId: number): Promise<{ conversation: Conversation }> => {
        const { data } = await api.get<{ conversation: Conversation }>(`/conversations/${userId}`);
        return data;
    },
};

// Message API
export const messageAPI = {
    send: async (conversationId: number, content: string): Promise<void> => {
        await api.post('/messages/send', { conversationId, content });
    },

    getHistory: async (
        conversationId: number,
        limit = 50,
        offset = 0
    ): Promise<MessageHistoryResponse> => {
        const { data } = await api.get<MessageHistoryResponse>(`/messages/${conversationId}`, {
            params: { limit, offset },
        });
        return data;
    },

    markAsRead: async (messageId: number): Promise<void> => {
        await api.put(`/messages/${messageId}/read`);
    },
};

// Group API
export const groupAPI = {
    create: async (name: string, memberIds: number[]): Promise<{ group: Group }> => {
        const { data } = await api.post<{ group: Group }>('/groups', { name, memberIds });
        return data;
    },

    getAll: async (): Promise<GroupListResponse> => {
        const { data } = await api.get<GroupListResponse>('/groups');
        return data;
    },

    getById: async (groupId: number): Promise<GroupResponse> => {
        const { data } = await api.get<GroupResponse>(`/groups/${groupId}`);
        return data;
    },

    addMember: async (groupId: number, userId: number): Promise<void> => {
        await api.post(`/groups/${groupId}/members`, { userId });
    },

    removeMember: async (groupId: number, userId: number): Promise<void> => {
        await api.delete(`/groups/${groupId}/members/${userId}`);
    },

    promote: async (groupId: number, userId: number): Promise<void> => {
        await api.put(`/groups/${groupId}/members/${userId}/promote`);
    },

    demote: async (groupId: number, userId: number): Promise<void> => {
        await api.put(`/groups/${groupId}/members/${userId}/demote`);
    },

    leave: async (groupId: number): Promise<void> => {
        await api.post(`/groups/${groupId}/leave`);
    },

    sendMessage: async (groupId: number, content: string): Promise<{ message: Message }> => {
        const { data } = await api.post<{ message: Message }>(`/groups/${groupId}/messages`, { content });
        return data;
    },

    getMessages: async (groupId: number, limit = 50, offset = 0): Promise<MessageHistoryResponse> => {
        const { data } = await api.get<MessageHistoryResponse>(`/groups/${groupId}/messages`, {
            params: { limit, offset },
        });
        return data;
    },
};

export default api;

