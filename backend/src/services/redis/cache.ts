import { redisClient } from './client';

const CACHE_TTL = {
    USER_SEARCH: 300, // 5 minutes
    CONVERSATION_LIST: 60, // 1 minute
    USER_SESSION: 604800, // 7 days
};

export class CacheService {
    // User search results cache
    static async cacheUserSearch(query: string, results: any[]): Promise<void> {
        const key = `search:users:${query.toLowerCase()}`;
        await redisClient.setex(key, CACHE_TTL.USER_SEARCH, JSON.stringify(results));
    }

    static async getUserSearch(query: string): Promise<any[] | null> {
        const key = `search:users:${query.toLowerCase()}`;
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    // User online status
    static async setUserOnline(userId: number): Promise<void> {
        await redisClient.sadd('users:online', userId.toString());
    }

    static async setUserOffline(userId: number): Promise<void> {
        await redisClient.srem('users:online', userId.toString());
    }

    static async isUserOnline(userId: number): Promise<boolean> {
        const result = await redisClient.sismember('users:online', userId.toString());
        return result === 1;
    }

    static async getOnlineUsers(): Promise<number[]> {
        const users = await redisClient.smembers('users:online');
        return users.map((id) => parseInt(id));
    }

    // Conversation list cache
    static async cacheConversationList(userId: number, conversations: any[]): Promise<void> {
        const key = `conversations:${userId}`;
        await redisClient.setex(key, CACHE_TTL.CONVERSATION_LIST, JSON.stringify(conversations));
    }

    static async getConversationList(userId: number): Promise<any[] | null> {
        const key = `conversations:${userId}`;
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    static async invalidateConversationList(userId: number): Promise<void> {
        const key = `conversations:${userId}`;
        await redisClient.del(key);
    }

    // Typing indicators
    static async setTyping(conversationId: number, userId: number): Promise<void> {
        const key = `typing:${conversationId}:${userId}`;
        await redisClient.setex(key, 5, '1'); // 5 seconds TTL
    }

    static async isTyping(conversationId: number, userId: number): Promise<boolean> {
        const key = `typing:${conversationId}:${userId}`;
        const result = await redisClient.exists(key);
        return result === 1;
    }
}
