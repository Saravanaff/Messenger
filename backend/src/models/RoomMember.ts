import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    CreatedAt,
    UpdatedAt,
} from 'sequelize-typescript';
import { User } from './User';
import { Room } from './Room';

export enum RoomRole {
    ADMIN = 'admin',
    MEMBER = 'member',
}

@Table({
    tableName: 'room_members',
    timestamps: true,
})
export class RoomMember extends Model {
    @Column({
        type: DataType.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    })
    declare id: number;

    @ForeignKey(() => Room)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare roomId: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare userId: number;

    @Column({
        type: DataType.ENUM(...Object.values(RoomRole)),
        allowNull: false,
        defaultValue: RoomRole.MEMBER,
    })
    declare role: RoomRole;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    @BelongsTo(() => Room)
    declare room: Room;

    @BelongsTo(() => User)
    declare user: User;
}
