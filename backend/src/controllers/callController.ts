import { Request, Response } from "express";
import livekitService from "../services/livekit";
import { Conversation } from "../models/Conversation";
import { Group } from "../models/Group";
import { Room } from "../models/Room";
import { User } from "../models/User";
import { isCallTimedOut } from "../services/socket/index";

interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
  };
}

/**
 * Initiate a call (conversation, group, or room)
 */
export const initiateCall = async (req: AuthRequest, res: Response) => {
  try {
    const { type, targetId } = req.body; // type: 'conversation' | 'group' | 'room'
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!type || !targetId) {
      return res.status(400).json({ error: "Type and targetId are required" });
    }

    // Verify user has access to the target
    let hasAccess = false;
    let roomName = "";

    if (type === "conversation") {
      const conversation = await Conversation.findByPk(targetId);
      if (
        conversation &&
        (conversation.participant1Id === userId ||
          conversation.participant2Id === userId)
      ) {
        hasAccess = true;
        roomName = livekitService.generateRoomName("conversation", targetId);
      }
    } else if (type === "group") {
      const group = await Group.findByPk(targetId, {
        include: [
          {
            model: User,
            as: "members",
            through: { attributes: [] },
          },
        ],
      });
      if (group) {
        const members = group.get("members") as User[] | undefined;
        const isMember = members?.some((member: User) => member.id === userId);
        if (isMember) {
          hasAccess = true;
          roomName = livekitService.generateRoomName("group", targetId);
        }
      }
    } else if (type === "room") {
      const room = await Room.findByPk(targetId, {
        include: [
          {
            model: User,
            as: "members",
            through: { attributes: [] },
          },
        ],
      });
      if (room) {
        const members = room.get("members") as User[] | undefined;
        const isMember = members?.some((member: User) => member.id === userId);
        if (isMember) {
          hasAccess = true;
          roomName = livekitService.generateRoomName("room", targetId);
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Generate token
    const token = await livekitService.generateToken({
      roomName,
      participantName: req.user?.username || "User",
      participantId: userId.toString(),
      metadata: JSON.stringify({ userId, type, targetId }),
    });

    res.json({
      roomName,
      token,
      url: livekitService.getServerUrl(),
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    res.status(500).json({ error: "Failed to initiate call" });
  }
};

export const joinCall = async (req: AuthRequest, res: Response) => {
  try {
    const { roomName } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!roomName) {
      return res.status(400).json({ error: "Room name is required" });
    }

    // Check if call has timed out
    if (isCallTimedOut(roomName)) {
      return res.status(410).json({ error: "Call has already ended" });
    }

    const [type, idStr] = roomName.split("_");
    const targetId = parseInt(idStr);

    if (!type || !targetId) {
      return res.status(400).json({ error: "Invalid room name" });
    }

    let hasAccess = false;

    if (type === "conversation") {
      const conversation = await Conversation.findByPk(targetId);
      if (
        conversation &&
        (conversation.participant1Id === userId ||
          conversation.participant2Id === userId)
      ) {
        hasAccess = true;
      }
    } else if (type === "group") {
      const group = await Group.findByPk(targetId, {
        include: [
          {
            model: User,
            as: "members",
            through: { attributes: [] },
          },
        ],
      });
      if (group) {
        const members = group.get("members") as User[] | undefined;
        const isMember = members?.some((member: User) => member.id === userId);
        hasAccess = isMember || false;
      }
    } else if (type === "room") {
      const room = await Room.findByPk(targetId, {
        include: [
          {
            model: User,
            as: "members",
            through: { attributes: [] },
          },
        ],
      });
      if (room) {
        const members = room.get("members") as User[] | undefined;
        const isMember = members?.some((member: User) => member.id === userId);
        hasAccess = isMember || false;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const token = await livekitService.generateToken({
      roomName,
      participantName: req.user?.username || "User",
      participantId: userId.toString(),
      metadata: JSON.stringify({ userId, type, targetId }),
    });

    res.json({
      token,
      url: livekitService.getServerUrl(),
    });
  } catch (error) {
    console.error("Error joining call:", error);
    res.status(500).json({ error: "Failed to join call" });
  }
};
