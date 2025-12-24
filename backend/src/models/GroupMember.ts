import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    Index,
    Unique,
} from 'sequelize-typescript';
import { User } from './User';
import { Group } from './Group';

export enum GroupRole {
    ADMIN = 'admin',
    MEMBER = 'member',
}

@Table({
    tableName: 'group_members',
    timestamps: true,
})
export class GroupMember extends Model {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    })
    id!: number;

    @ForeignKey(() => Group)
    @Index
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    groupId!: number;

    @ForeignKey(() => User)
    @Index
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    userId!: number;

    @Column({
        type: DataType.ENUM(...Object.values(GroupRole)),
        defaultValue: GroupRole.MEMBER,
        allowNull: false,
    })
    role!: GroupRole;

    @BelongsTo(() => Group)
    group!: Group;

    @BelongsTo(() => User)
    user!: User;
}
