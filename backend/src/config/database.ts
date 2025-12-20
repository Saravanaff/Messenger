import 'reflect-metadata';
import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';

dotenv.config();

const sequelize = new Sequelize({
    database: process.env.DB_NAME || 'chatapp',
    dialect: 'mysql',
    username: process.env.DB_USER || 'chatuser',
    password: process.env.DB_PASSWORD || 'chatpassword',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    models: [User, Conversation, Message],
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});

export default sequelize;
