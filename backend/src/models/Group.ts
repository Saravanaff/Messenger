import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    Length,
} from 'sequelize-typescript';
import { User } from './User';

@Table({
    tableName: 'groups',
    timestamps: true,
})
export class Group extends Model {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    })
    id!: number;

    @Length({ min: 1, max: 100 })
    @Column({
        type: DataType.STRING(100),
        allowNull: false,
    })
    name!: string;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    createdBy!: number;

    @BelongsTo(() => User, 'createdBy')
    creator!: User;
}
