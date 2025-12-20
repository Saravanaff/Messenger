import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            res.status(400).json({ error: 'All fields are required' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            where: { email },
        });

        if (existingUser) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }

        const existingUsername = await User.findOne({
            where: { username },
        });

        if (existingUsername) {
            res.status(400).json({ error: 'Username already taken' });
            return;
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password, // Will be hashed by the model hook
        });

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            username: user.username,
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: user.toJSON(),
        });
    } catch (error: any) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        // Find user
        const user = await User.findOne({ where: { email } });

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            username: user.username,
        });

        res.json({
            message: 'Login successful',
            token,
            user: user.toJSON(),
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const user = await User.findByPk(req.user.userId);

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ user: user.toJSON() });
    } catch (error: any) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
