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
    origin: true, // Allow all origins
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

        // Sync database models (alter: true to update existing tables with new columns)
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized');

        // Initialize Socket.io
        const io = initializeSocket(server);
        console.log('✅ Socket.io initialized');

        // Make io available in request object
        app.use((req: any, res, next) => {
            req.io = io;
            next();
        });

        // Mount routes after Socket.IO middleware
        app.use('/api', routes);

        // Verify Redis connection
        await redisClient.ping();
        console.log('✅ Redis client connected');
    } catch (error) {
        console.error('❌ Error initializing services:', error);
        throw error;
    }
};

const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');

    try {
        await sequelize.close();

        await redisClient.quit();

        console.log('✅ All services shut down successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const startServer = async () => {
    try {
        await initializeServices();

        const HOST = process.env.HOST || '0.0.0.0';
        server.listen(PORT as number, HOST, () => {
            console.log(`🚀 Server running on ${HOST}:${PORT}`);
            console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Accessible from network at: http://10.168.113.168:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
