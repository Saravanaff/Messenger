import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import sequelize from './config/database';
import { initializeSocket } from './services/socket';
import { redisClient } from './services/redis/client';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.BACKEND_PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// Initialize services
const initializeServices = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Sync database models
        await sequelize.sync();
        console.log('✅ Database models synchronized');

        // Initialize Socket.io
        const io = initializeSocket(server);
        console.log('✅ Socket.io initialized');

        // Make io available in request object
        app.use((req: any, res, next) => {
            req.io = io;
            next();
        });

        // Verify Redis connection
        await redisClient.ping();
        console.log('✅ Redis client connected');
    } catch (error) {
        console.error('❌ Error initializing services:', error);
        throw error;
    }
};

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');

    try {
        // Close database connection
        await sequelize.close();

        // Close Redis connection
        await redisClient.quit();

        console.log('✅ All services shut down successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
    try {
        await initializeServices();

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
