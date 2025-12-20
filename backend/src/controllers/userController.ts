import { Response } from 'express';
import { Op } from 'sequelize';
import { User } from '../models/User';
import { CacheService } from '../services/redis/cache';
import { AuthRequest } from '../middleware/auth';

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            res.status(400).json({ error: 'Search query is required' });
            return;
        }

        // Check cache first
        const cached = await CacheService.getUserSearch(query);
        if (cached) {
            res.json({ users: cached, source: 'cache' });
            return;
        }

        // Search in database
        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { email: { [Op.like]: `%${query}%` } },
                    { username: { [Op.like]: `%${query}%` } },
                ],
                id: { [Op.ne]: req.user?.userId }, // Exclude current user
            },
            limit: 20,
            attributes: ['id', 'username', 'email', 'createdAt'],
        });

        const usersData = users.map((u) => u.toJSON());

        // Cache results
        await CacheService.cacheUserSearch(query, usersData);

        res.json({ users: usersData, source: 'database' });
    } catch (error: any) {
        console.error('User search error:', error);
        res.status(500).json({ error: 'Server error during search' });
    }
};

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, {
            attributes: ['id', 'username', 'email', 'createdAt'],
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Check if user is online
        const isOnline = await CacheService.isUserOnline(user.id);

        res.json({
            user: {
                ...user.toJSON(),
                isOnline,
            },
        });
    } catch (error: any) {
        console.error('Get user profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
