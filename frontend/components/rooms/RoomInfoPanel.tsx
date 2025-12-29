import { useState, useEffect } from 'react';
import { roomAPI, userAPI } from '@/lib/api';
import { Room, RoomMember, GroupMember, User } from '@/types';
import styles from '@/styles/GroupChat.module.css';

interface RoomInfoPanelProps {
    room: Room;
    groupMembers: GroupMember[];
    currentUserId: number;
    onClose: () => void;
    onLeave: () => void;
    onDelete: () => void;
    onMemberChange: () => void;
}

export default function RoomInfoPanel({
    room,
    groupMembers,
    currentUserId,
    onClose,
    onLeave,
    onDelete,
    onMemberChange,
}: RoomInfoPanelProps) {
    const [members, setMembers] = useState<RoomMember[]>(room.members || []);
    const [showAddMember, setShowAddMember] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const isAdmin = room.myRole === 'admin';
    const isCreator = room.createdBy === currentUserId;

    // Filter non-room members from group members
    const availableMembers = groupMembers.filter(
        (gm) => !members.find((rm) => rm.id === gm.id) &&
            gm.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddMember = async (userId: number) => {
        setLoading(true);
        try {
            await roomAPI.addMember(room.id, userId);
            onMemberChange();
            setShowAddMember(false);
            setSearchQuery('');
            // Refresh room data
            const { room: updatedRoom } = await roomAPI.getById(room.id);
            setMembers(updatedRoom.members || []);
        } catch (error) {
            console.error('Error adding member:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (userId: number) => {
        setLoading(true);
        try {
            await roomAPI.removeMember(room.id, userId);
            onMemberChange();
            setActiveMenu(null);
            const { room: updatedRoom } = await roomAPI.getById(room.id);
            setMembers(updatedRoom.members || []);
        } catch (error) {
            console.error('Error removing member:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveRoom = async () => {
        if (window.confirm('Are you sure you want to leave this room?')) {
            try {
                await roomAPI.leave(room.id);
                onLeave();
            } catch (error) {
                console.error('Error leaving room:', error);
            }
        }
    };

    const handleDeleteRoom = async () => {
        if (window.confirm('Are you sure you want to delete this room? This cannot be undone.')) {
            try {
                await roomAPI.delete(room.id);
                onDelete();
            } catch (error) {
                console.error('Error deleting room:', error);
            }
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            '#00D9A3', '#FF6B6B', '#4ECDC4', '#45B7D1',
            '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <div className={styles.infoPanel}>
            <div className={styles.infoPanelHeader}>
                <h3 className={styles.infoPanelTitle}>Room Info</h3>
                <button className={styles.closeButton} onClick={onClose}>
                    ×
                </button>
            </div>

            <div className={styles.groupIcon} style={{ backgroundColor: '#00D9A3' }}>
                {getInitials(room.name)}
            </div>
            <div className={styles.groupName}>{room.name}</div>
            <div className={styles.groupMemberCount}>{members.length} members</div>

            <div className={styles.membersSection}>
                <div className={styles.sectionTitle}>
                    Members
                    {isAdmin && (
                        <button
                            className={styles.addMemberButton}
                            onClick={() => setShowAddMember(!showAddMember)}
                            title="Add Member"
                        >
                            +
                        </button>
                    )}
                </div>

                {showAddMember && (
                    <div style={{ marginBottom: '12px' }}>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Search group members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {availableMembers.length > 0 && (
                            <div className={styles.searchResults} style={{ position: 'relative' }}>
                                {availableMembers.slice(0, 5).map((member) => (
                                    <div
                                        key={member.id}
                                        className={styles.searchResultItem}
                                        onClick={() => handleAddMember(member.id)}
                                    >
                                        <div
                                            className={styles.searchResultAvatar}
                                            style={{ backgroundColor: getAvatarColor(member.username) }}
                                        >
                                            {getInitials(member.username)}
                                        </div>
                                        <div className={styles.searchResultInfo}>
                                            <div className={styles.searchResultName}>{member.username}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {members.map((member) => (
                    <div key={member.id} className={styles.memberItem}>
                        <div
                            className={styles.memberAvatar}
                            style={{ backgroundColor: getAvatarColor(member.username) }}
                        >
                            {getInitials(member.username)}
                        </div>
                        <div className={styles.memberInfo}>
                            <div className={styles.memberName}>
                                {member.username}
                                {member.id === room.createdBy && (
                                    <span className={styles.creatorBadge}>Creator</span>
                                )}
                                {member.role === 'admin' && member.id !== room.createdBy && (
                                    <span className={styles.adminBadge}>Admin</span>
                                )}
                            </div>
                            <div className={styles.memberEmail}>{member.email}</div>
                        </div>

                        {isAdmin && member.id !== currentUserId && member.id !== room.createdBy && (
                            <div className={styles.memberActions}>
                                <button
                                    className={styles.memberActionsButton}
                                    onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                                >
                                    ⋮
                                </button>
                                {activeMenu === member.id && (
                                    <div className={styles.memberActionsMenu}>
                                        <button
                                            className={`${styles.memberActionsMenuItem} ${styles.memberActionsMenuItemDanger}`}
                                            onClick={() => handleRemoveMember(member.id)}
                                        >
                                            Remove from Room
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className={styles.panelActions}>
                {isCreator ? (
                    <button className={styles.leaveButton} onClick={handleDeleteRoom}>
                        Delete Room
                    </button>
                ) : (
                    <button className={styles.leaveButton} onClick={handleLeaveRoom}>
                        Leave Room
                    </button>
                )}
            </div>
        </div>
    );
}
