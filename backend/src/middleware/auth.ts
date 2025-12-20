import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { redisClient } from '../services/redis/client';

export interface AuthRequest extends Request {
    user?: JWTPayload;
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7);

        // Check if token is blacklisted in Redis
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) {
            res.status(401).json({ error: 'Token has been revoked' });
            return;
        }

        // Verify token
        const decoded = verifyToken(token);
        req.user = decoded;

        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
