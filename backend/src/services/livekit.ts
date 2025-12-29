import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
dotenv.config();

interface TokenOptions {
    roomName: string;
    participantName: string;
    participantId: string;
    metadata?: string;
}

class LiveKitService {
    private apiKey: string;
    private apiSecret: string;
    private url: string;

    constructor() {
        if (!process.env.LIVEKIT_API_KEY) {
            throw new Error('LIVEKIT_API_KEY environment variable is required');
        }
        if (!process.env.LIVEKIT_API_SECRET) {
            throw new Error('LIVEKIT_API_SECRET environment variable is required');
        }
        if (!process.env.LIVEKIT_URL) {
            throw new Error('LIVEKIT_URL environment variable is required');
        }

        this.apiKey = process.env.LIVEKIT_API_KEY;
        this.apiSecret = process.env.LIVEKIT_API_SECRET;
        this.url = process.env.LIVEKIT_URL;
    }

    /**
     * Generate an access token for a participant to join a LiveKit room
     */
    async generateToken(options: TokenOptions): Promise<string> {
        const { roomName, participantName, participantId, metadata } = options;

        const at = new AccessToken(this.apiKey, this.apiSecret, {
            identity: participantId.toString(),
            name: participantName,
            metadata: metadata,
        });

        // Grant permissions
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        return await at.toJwt();
    }

    /**
     * Get the LiveKit server URL
     */
    getServerUrl(): string {
        return this.url;
    }

    /**
     * Generate room name based on type and ID
     */
    generateRoomName(type: 'conversation' | 'group' | 'room', id: number): string {
        return `${type}_${id}`;
    }
}

export default new LiveKitService();
