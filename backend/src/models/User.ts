import {
    Table,
    Column,
    Model,
    DataType,
    BeforeCreate,
    BeforeUpdate,
    HasMany,
    Unique,
    IsEmail,
    Length,
} from 'sequelize-typescript';
import bcrypt from 'bcrypt';
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

    @BeforeCreate
    @BeforeUpdate
    static async hashPassword(user: User) {
        if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
    }

    async comparePassword(candidatePassword: string): Promise<boolean> {
        return bcrypt.compare(candidatePassword, this.password);
    }

    toJSON() {
        const values = { ...this.get() };
        delete values.password;
        return values;
    }
}
