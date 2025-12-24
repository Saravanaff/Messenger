import { useState, useEffect } from 'react';
import { groupAPI, userAPI } from '@/lib/api';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';
import type { Group, GroupMember, User } from '@/types';
import styles from '../../styles/GroupChat.module.css';

interface GroupInfoPanelProps {
    group: Group;
    currentUserId: number;
    onClose: () => void;
    onMemberAdded: () => void;
    onMemberRemoved: () => void;
    onLeaveGroup: () => void;
}

export default function GroupInfoPanel({
    group,
    currentUserId,
    onClose,
    onMemberAdded,
    onMemberRemoved,
    onLeaveGroup,
}: GroupInfoPanelProps) {
    const [members, setMembers] = useState<GroupMember[]>(group.members || []);
    const [myRole, setMyRole] = useState<'admin' | 'member'>(group.myRole || 'member');
    const [showAddMember, setShowAddMember] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [activeMenu, setActiveMenu] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    // Refresh group data
    useEffect(() => {
        const fetchGroupDetails = async () => {
            try {
                const data = await groupAPI.getById(group.id);
                setMembers(data.group.members || []);
                setMyRole(data.myRole);
            } catch (err) {
                console.error('Error fetching group details:', err);
            }
        };
        fetchGroupDetails();
    }, [group.id]);

    // Search users for adding
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const data = await userAPI.search(searchQuery);
                // Filter out existing members
                const filtered = data.users.filter(
                    (u) => !members.some((m) => m.id === u.id)
                );
                setSearchResults(filtered);
            } catch (err) {
                console.error('Error searching users:', err);
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, members]);

    const handleAddMember = async (userId: number) => {
        setLoading(true);
        try {
            await groupAPI.addMember(group.id, userId);
            setSearchQuery('');
            setSearchResults([]);
            setShowAddMember(false);
            onMemberAdded();
            // Refresh members
            const data = await groupAPI.getById(group.id);
            setMembers(data.group.members || []);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!confirm('Are you sure you want to remove this member?')) return;

        setLoading(true);
        try {
            await groupAPI.removeMember(group.id, userId);
            setActiveMenu(null);
            onMemberRemoved();
            // Refresh members
            const data = await groupAPI.getById(group.id);
            setMembers(data.group.members || []);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to remove member');
        } finally {
            setLoading(false);
        }
    };

    const handlePromote = async (userId: number) => {
        setLoading(true);
        try {
            await groupAPI.promote(group.id, userId);
            setActiveMenu(null);
            // Refresh members
            const data = await groupAPI.getById(group.id);
            setMembers(data.group.members || []);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to promote member');
        } finally {
            setLoading(false);
        }
    };

    const handleDemote = async (userId: number) => {
        setLoading(true);
        try {
            await groupAPI.demote(group.id, userId);
            setActiveMenu(null);
            // Refresh members
            const data = await groupAPI.getById(group.id);
            setMembers(data.group.members || []);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to demote member');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm('Are you sure you want to leave this group?')) return;

        setLoading(true);
        try {
            await groupAPI.leave(group.id);
            onLeaveGroup();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to leave group');
        } finally {
            setLoading(false);
        }
    };

    const isCreator = group.createdBy === currentUserId;
    const isAdmin = myRole === 'admin';

    return (
        <div className={styles.infoPanel}>
            <div className={styles.infoPanelHeader}>
                <h3 className={styles.infoPanelTitle}>Group Info</h3>
                <button className={styles.closeButton} onClick={onClose}>
                    ×
                </button>
            </div>

            <div className={styles.groupIcon}>
                {getInitials(group.name)}
            </div>
            <h2 className={styles.groupName}>{group.name}</h2>
            <p className={styles.groupMemberCount}>{members.length} members</p>

            <div className={styles.membersSection}>
                <div className={styles.sectionTitle}>
                    <span>Members</span>
                    {isAdmin && (
                        <button
                            className={styles.addMemberButton}
                            onClick={() => setShowAddMember(!showAddMember)}
                            title="Add member"
                        >
                            +
                        </button>
                    )}
                </div>

                {showAddMember && (
                    <div className={styles.memberSearch} style={{ marginBottom: '16px' }}>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search users to add..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />

                        {searchLoading && (
                            <div className={styles.searchResults}>
                                <div className={styles.loading}>Searching...</div>
                            </div>
                        )}

                        {!searchLoading && searchResults.length > 0 && (
                            <div className={styles.searchResults}>
                                {searchResults.map((user) => (
                                    <div
                                        key={user.id}
                                        className={styles.searchResultItem}
                                        onClick={() => handleAddMember(user.id)}
                                    >
                                        <div
                                            className={styles.searchResultAvatar}
                                            style={{ backgroundColor: getAvatarColor(user.username) }}
                                        >
                                            {getInitials(user.username)}
                                        </div>
                                        <div className={styles.searchResultInfo}>
                                            <div className={styles.searchResultName}>{user.username}</div>
                                            <div className={styles.searchResultEmail}>{user.email}</div>
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
                                {member.id === group.createdBy && (
                                    <span className={styles.creatorBadge}>Creator</span>
                                )}
                                {member.role === 'admin' && member.id !== group.createdBy && (
                                    <span className={styles.adminBadge}>Admin</span>
                                )}
                            </div>
                            <div className={styles.memberEmail}>{member.email}</div>
                        </div>

                        {/* Show actions menu for admins (except for themselves and creator) */}
                        {isAdmin && member.id !== currentUserId && member.id !== group.createdBy && (
                            <div className={styles.memberActions}>
                                <button
                                    className={styles.memberActionsButton}
                                    onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                                >
                                    ⋮
                                </button>

                                {activeMenu === member.id && (
                                    <div className={styles.memberActionsMenu}>
                                        {member.role === 'member' ? (
                                            <button
                                                className={styles.memberActionsMenuItem}
                                                onClick={() => handlePromote(member.id)}
                                                disabled={loading}
                                            >
                                                Promote to Admin
                                            </button>
                                        ) : (
                                            <button
                                                className={styles.memberActionsMenuItem}
                                                onClick={() => handleDemote(member.id)}
                                                disabled={loading}
                                            >
                                                Demote to Member
                                            </button>
                                        )}
                                        <button
                                            className={`${styles.memberActionsMenuItem} ${styles.memberActionsMenuItemDanger}`}
                                            onClick={() => handleRemoveMember(member.id)}
                                            disabled={loading}
                                        >
                                            Remove from Group
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!isCreator && (
                <div className={styles.panelActions}>
                    <button
                        className={styles.leaveButton}
                        onClick={handleLeaveGroup}
                        disabled={loading}
                    >
                        Leave Group
                    </button>
                </div>
            )}
        </div>
    );
}
