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
        allowNull: false,
    })
    conversationId!: number;

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

    @BelongsTo(() => User, 'senderId')
    sender!: User;
}
