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

@Table({
    tableName: 'conversations',
    timestamps: true,
})
export class Conversation extends Model {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    })
    id!: number;

    @ForeignKey(() => User)
    @Index
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    participant1Id!: number;

    @ForeignKey(() => User)
    @Index
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    participant2Id!: number;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    lastMessageAt!: Date;

    @BelongsTo(() => User, 'participant1Id')
    participant1!: User;

    @BelongsTo(() => User, 'participant2Id')
    participant2!: User;
}
