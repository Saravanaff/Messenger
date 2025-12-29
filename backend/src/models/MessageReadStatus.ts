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
import { Message } from './Message';

@Table({
    tableName: 'message_read_statuses',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['messageId', 'userId']
        }
    ]
})
export class MessageReadStatus extends Model {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    })
    id!: number;

    @ForeignKey(() => Message)
    @Index
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    messageId!: number;

    @ForeignKey(() => User)
    @Index
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    userId!: number;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    readAt!: Date;

    @BelongsTo(() => Message)
    message!: Message;

    @BelongsTo(() => User)
    user!: User;
}
