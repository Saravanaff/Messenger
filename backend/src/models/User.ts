import {
    Table,
    Column,
    Model,
    DataType,
    HasMany,
    Unique,
    IsEmail,
    Length,
} from 'sequelize-typescript';
import { Message } from './Message';

@Table({
    tableName: 'users',
    timestamps: true,
})
export class User extends Model {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    })
    id!: number;

    @Unique
    @Length({ min: 3, max: 50 })
    @Column({
        type: DataType.STRING(50),
        allowNull: false,
    })
    username!: string;

    @Unique
    @IsEmail
    @Column({
        type: DataType.STRING(100),
        allowNull: false,
    })
    email!: string;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
    })
    password!: string;

    @HasMany(() => Message, 'senderId')
    sentMessages!: Message[];

    toJSON() {
        const values = { ...this.get() };
        delete values.password;
        return values;
    }
}
