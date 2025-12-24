import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    Index,
} from 'sequelize-typescript';
import { User } from './User';
import { Conversation } from './Conversation';
import { Group } from './Group';

export enum MessageStatus {
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
}

@Table({
    tableName: 'messages',
    timestamps: true,
})
export class Message extends Model {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    })
    id!: number;

    @ForeignKey(() => Conversation)
    @Index
    @Column({
        type: DataType.INTEGER,
        allowNull: true, // Now optional - message can belong to conversation OR group
    })
    conversationId!: number | null;

    @ForeignKey(() => Group)
    @Index
    @Column({
        type: DataType.INTEGER,
        allowNull: true, // Optional - set when message is for a group
    })
    groupId!: number | null;

    @ForeignKey(() => User)
    @Index
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    senderId!: number;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    content!: string;

    @Column({
        type: DataType.ENUM(...Object.values(MessageStatus)),
        defaultValue: MessageStatus.SENT,
    })
    status!: MessageStatus;

    @BelongsTo(() => Conversation)
    conversation!: Conversation;

    @BelongsTo(() => Group)
    group!: Group;

    @BelongsTo(() => User, 'senderId')
    sender!: User;
}

