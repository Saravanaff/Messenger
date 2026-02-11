import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  HasMany,
  Length,
} from "sequelize-typescript";
import { User } from "./User";
import { GroupMember } from "./GroupMember";

@Table({
  tableName: "groups",
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

  @Column({
    type: DataType.JSON,
    allowNull: false,
    defaultValue: {
      whoCanCreateRooms: "everyone",
      whoCanSendMessages: "everyone",
      whoCanAddMembers: "admin",
      whoCanRemoveMembers: "admin",
    },
  })
  settings!: {
    whoCanCreateRooms: "admin" | "everyone";
    whoCanSendMessages: "admin" | "everyone";
    whoCanAddMembers: "admin" | "everyone";
    whoCanRemoveMembers: "admin" | "everyone";
  };

  @BelongsTo(() => User, "createdBy")
  creator!: User;

  @BelongsToMany(() => User, () => GroupMember)
  members?: User[];
}
