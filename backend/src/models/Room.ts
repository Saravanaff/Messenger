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
import { Group } from './Group';

@Table({
    tableName: 'rooms',
    timestamps: true,
})
export class Room extends Model {
    @Column({
        type: DataType.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    })
    declare id: number;

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
    })
    declare name: string;

    @ForeignKey(() => Group)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare groupId: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare createdBy: number;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    @BelongsTo(() => Group)
    declare group: Group;

    @BelongsTo(() => User, 'createdBy')
    declare creator: User;
}
