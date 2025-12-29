import { User } from './User';
import { Conversation } from './Conversation';
import { Message, MessageStatus } from './Message';
import { MessageReadStatus } from './MessageReadStatus';
import { Group } from './Group';
import { GroupMember, GroupRole } from './GroupMember';
import { Room } from './Room';
import { RoomMember, RoomRole } from './RoomMember';

// Export all models and enums
export { User, Conversation, Message, MessageStatus, MessageReadStatus, Group, GroupMember, GroupRole, Room, RoomMember, RoomRole };

// This file ensures all models are loaded and associations are set up
export default {
    User,
    Conversation,
    Message,
    MessageReadStatus,
    Group,
    GroupMember,
    Room,
    RoomMember,
};
