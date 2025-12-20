import { User } from './User';
import { Conversation } from './Conversation';
import { Message, MessageStatus } from './Message';

// Export all models and enums
export { User, Conversation, Message, MessageStatus };

// This file ensures all models are loaded and associations are set up
export default {
    User,
    Conversation,
    Message,
};
