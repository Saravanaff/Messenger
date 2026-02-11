import { Response } from "express";
import { Op } from "sequelize";
import { Group } from "../models/Group";
import { GroupMember, GroupRole } from "../models/GroupMember";
import { User } from "../models/User";
import { Message } from "../models/Message";
import { AuthRequest } from "../middleware/auth";
import { getIO } from "../services/socket";

// Create a new group
export const createGroup = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, memberIds, settings } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ error: "Group name is required" });
      return;
    }

    // Create the group with settings
    const group = await Group.create({
      name: name.trim(),
      createdBy: currentUserId,
      settings: settings || {
        whoCanCreateRooms: "everyone",
        whoCanSendMessages: "everyone",
        whoCanAddMembers: "admin",
        whoCanRemoveMembers: "admin",
      },
    });

    // Add creator as admin
    await GroupMember.create({
      groupId: group.id,
      userId: currentUserId,
      role: GroupRole.ADMIN,
    });

    // Add other members if provided
    if (memberIds && Array.isArray(memberIds)) {
      const uniqueMemberIds = [
        ...new Set(memberIds.filter((id: number) => id !== currentUserId)),
      ];

      for (const memberId of uniqueMemberIds) {
        // Verify user exists
        const user = await User.findByPk(memberId);
        if (user) {
          await GroupMember.create({
            groupId: group.id,
            userId: memberId,
            role: GroupRole.MEMBER,
          });
        }
      }
    }

    // Fetch the complete group with members
    const completeGroup = await getGroupWithMembers(group.id);

    res.status(201).json({ group: completeGroup });
  } catch (error: any) {
    console.error("Create group error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all groups for current user
export const getGroups = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Get all group memberships for the user
    const memberships = await GroupMember.findAll({
      where: { userId: currentUserId },
      include: [
        {
          model: Group,
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "username", "email"],
            },
          ],
        },
      ],
    });

    // Get groups with members, member count and last message
    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const members = await GroupMember.findAll({
          where: { groupId: membership.groupId },
          include: [{ model: User, attributes: ["id", "username", "email"] }],
        });

        const lastMessage = await Message.findOne({
          where: { groupId: membership.groupId },
          order: [["createdAt", "DESC"]],
          include: [
            { model: User, as: "sender", attributes: ["id", "username"] },
          ],
        });

        return {
          ...membership.group.toJSON(),
          members: members.map((m) => ({
            ...m.user.toJSON(),
            role: m.role,
            joinedAt: m.createdAt,
          })),
          memberCount: members.length,
          lastMessage: lastMessage?.toJSON() || null,
          myRole: membership.role,
        };
      }),
    );

    res.json({ groups });
  } catch (error: any) {
    console.error("Get groups error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get group by ID with members
export const getGroupById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Check if user is a member
    const membership = await GroupMember.findOne({
      where: { groupId: parseInt(groupId), userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    const group = await getGroupWithMembers(parseInt(groupId));

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    res.json({ group, myRole: membership.role });
  } catch (error: any) {
    console.error("Get group error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Add member to group (admin only)
export const addMember = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Check if current user is admin
    const adminCheck = await GroupMember.findOne({
      where: {
        groupId: parseInt(groupId),
        userId: currentUserId,
        role: GroupRole.ADMIN,
      },
    });

    if (!adminCheck) {
      res.status(403).json({ error: "Only admins can add members" });
      return;
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if already a member
    const existingMember = await GroupMember.findOne({
      where: { groupId: parseInt(groupId), userId },
    });

    if (existingMember) {
      res.status(400).json({ error: "User is already a member" });
      return;
    }

    // Add member
    await GroupMember.create({
      groupId: parseInt(groupId),
      userId,
      role: GroupRole.MEMBER,
    });

    // Notify via socket
    const io = getIO();
    io.to(`group:${groupId}`).emit("member_added", {
      groupId: parseInt(groupId),
      user: user.toJSON(),
    });

    res.json({ message: "Member added successfully" });
  } catch (error: any) {
    console.error("Add member error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Remove member from group (admin only)
export const removeMember = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const targetUserId = parseInt(userId);

    // Check if current user is admin
    const adminCheck = await GroupMember.findOne({
      where: {
        groupId: parseInt(groupId),
        userId: currentUserId,
        role: GroupRole.ADMIN,
      },
    });

    if (!adminCheck) {
      res.status(403).json({ error: "Only admins can remove members" });
      return;
    }

    // Can't remove the creator
    const group = await Group.findByPk(groupId);
    if (group && group.createdBy === targetUserId) {
      res.status(400).json({ error: "Cannot remove the group creator" });
      return;
    }

    // Remove member
    const deleted = await GroupMember.destroy({
      where: { groupId: parseInt(groupId), userId: targetUserId },
    });

    if (!deleted) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    // Notify via socket
    const io = getIO();
    io.to(`group:${groupId}`).emit("member_removed", {
      groupId: parseInt(groupId),
      userId: targetUserId,
    });

    res.json({ message: "Member removed successfully" });
  } catch (error: any) {
    console.error("Remove member error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Promote member to admin
export const promoteToAdmin = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Check if current user is admin
    const adminCheck = await GroupMember.findOne({
      where: {
        groupId: parseInt(groupId),
        userId: currentUserId,
        role: GroupRole.ADMIN,
      },
    });

    if (!adminCheck) {
      res.status(403).json({ error: "Only admins can promote members" });
      return;
    }

    // Update member role
    const [updated] = await GroupMember.update(
      { role: GroupRole.ADMIN },
      { where: { groupId: parseInt(groupId), userId: parseInt(userId) } },
    );

    if (!updated) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    // Notify via socket
    const io = getIO();
    io.to(`group:${groupId}`).emit("member_promoted", {
      groupId: parseInt(groupId),
      userId: parseInt(userId),
    });

    res.json({ message: "Member promoted to admin" });
  } catch (error: any) {
    console.error("Promote member error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Demote admin to member
export const demoteFromAdmin = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const targetUserId = parseInt(userId);

    // Check if current user is admin
    const adminCheck = await GroupMember.findOne({
      where: {
        groupId: parseInt(groupId),
        userId: currentUserId,
        role: GroupRole.ADMIN,
      },
    });

    if (!adminCheck) {
      res.status(403).json({ error: "Only admins can demote members" });
      return;
    }

    // Can't demote the creator
    const group = await Group.findByPk(groupId);
    if (group && group.createdBy === targetUserId) {
      res.status(400).json({ error: "Cannot demote the group creator" });
      return;
    }

    // Update member role
    const [updated] = await GroupMember.update(
      { role: GroupRole.MEMBER },
      { where: { groupId: parseInt(groupId), userId: targetUserId } },
    );

    if (!updated) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    // Notify via socket
    const io = getIO();
    io.to(`group:${groupId}`).emit("member_demoted", {
      groupId: parseInt(groupId),
      userId: targetUserId,
    });

    res.json({ message: "Admin demoted to member" });
  } catch (error: any) {
    console.error("Demote admin error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Leave group
export const leaveGroup = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Check if user is the creator
    const group = await Group.findByPk(groupId);
    if (group && group.createdBy === currentUserId) {
      res.status(400).json({
        error: "Creator cannot leave the group. Delete the group instead.",
      });
      return;
    }

    // Remove membership
    const deleted = await GroupMember.destroy({
      where: { groupId: parseInt(groupId), userId: currentUserId },
    });

    if (!deleted) {
      res.status(404).json({ error: "You are not a member of this group" });
      return;
    }

    // Notify via socket
    const io = getIO();
    io.to(`group:${groupId}`).emit("member_left", {
      groupId: parseInt(groupId),
      userId: currentUserId,
    });

    res.json({ message: "Left group successfully" });
  } catch (error: any) {
    console.error("Leave group error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Send message to group
export const sendGroupMessage = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!content || !content.trim()) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    // Check if user is a member
    const membership = await GroupMember.findOne({
      where: { groupId: parseInt(groupId), userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    // Create message
    const message = await Message.create({
      groupId: parseInt(groupId),
      senderId: currentUserId,
      content: content.trim(),
    });

    // Fetch message with sender
    const messageWithSender = await Message.findByPk(message.id, {
      include: [
        { model: User, as: "sender", attributes: ["id", "username", "email"] },
      ],
    });

    // Broadcast to group
    const io = getIO();
    io.to(`group:${groupId}`).emit(
      "new_group_message",
      messageWithSender?.toJSON(),
    );

    res.status(201).json({ message: messageWithSender });
  } catch (error: any) {
    console.error("Send group message error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get group messages
export const getGroupMessages = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Check if user is a member
    const membership = await GroupMember.findOne({
      where: { groupId: parseInt(groupId), userId: currentUserId },
    });

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    const messages = await Message.findAll({
      where: { groupId: parseInt(groupId) },
      include: [
        { model: User, as: "sender", attributes: ["id", "username", "email"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({ messages, groupId: parseInt(groupId) });
  } catch (error: any) {
    console.error("Get group messages error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update group settings
export const updateGroupSettings = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { settings } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Check if user is admin of the group
    const membership = await GroupMember.findOne({
      where: {
        groupId: parseInt(groupId),
        userId: currentUserId,
        role: GroupRole.ADMIN,
      },
    });

    if (!membership) {
      res.status(403).json({ error: "Only admins can update group settings" });
      return;
    }

    // Update group settings
    const group = await Group.findByPk(parseInt(groupId));
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    await group.update({ settings });

    // Fetch updated group
    const updatedGroup = await getGroupWithMembers(parseInt(groupId));

    // Notify all group members about settings update
    const io = getIO();
    const allMembers = await GroupMember.findAll({
      where: { groupId: parseInt(groupId) },
    });

    allMembers.forEach((member) => {
      io.to(`user:${member.userId}`).emit("group_settings_updated", {
        groupId: parseInt(groupId),
        settings,
      });
    });

    res.json({
      group: { ...updatedGroup, myRole: membership.role },
      message: "Settings updated successfully",
    });
  } catch (error: any) {
    console.error("Update group settings error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Helper function to get group with members
async function getGroupWithMembers(groupId: number) {
  const group = await Group.findByPk(groupId, {
    include: [
      { model: User, as: "creator", attributes: ["id", "username", "email"] },
    ],
  });

  if (!group) return null;

  const members = await GroupMember.findAll({
    where: { groupId },
    include: [{ model: User, attributes: ["id", "username", "email"] }],
  });

  return {
    ...group.toJSON(),
    members: members.map((m) => ({
      ...m.user.toJSON(),
      role: m.role,
      joinedAt: m.createdAt,
    })),
  };
}
