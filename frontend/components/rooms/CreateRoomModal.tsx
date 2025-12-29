import { useState, useEffect } from 'react';
import { roomAPI } from '@/lib/api';
import { Room, GroupMember } from '@/types';
import styles from '@/styles/GroupChat.module.css';

interface CreateRoomModalProps {
    groupId: number;
    groupMembers: GroupMember[];
    onClose: () => void;
    onRoomCreated: (room: Room) => void;
}

export default function CreateRoomModal({
    groupId,
    groupMembers,
    onClose,
    onRoomCreated,
}: CreateRoomModalProps) {
    const [roomName, setRoomName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<GroupMember[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const filteredMembers = groupMembers.filter(
        (member) =>
            member.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !selectedMembers.find((m) => m.id === member.id)
    );

    const handleAddMember = (member: GroupMember) => {
        setSelectedMembers((prev) => [...prev, member]);
        setSearchQuery('');
    };

    const handleRemoveMember = (memberId: number) => {
        setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
    };

    const handleCreate = async () => {
        if (!roomName.trim()) {
            setError('Room name is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const memberIds = selectedMembers.map((m) => m.id);
            const { room } = await roomAPI.create(groupId, roomName.trim(), memberIds);
            onRoomCreated(room);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create room');
        } finally {
            setLoading(false);
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
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Create Room</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {error && (
                        <div style={{ color: '#e53e3e', marginBottom: '16px', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Room Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Enter room name"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            maxLength={100}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Add Members (from this group)</label>
                        <div className={styles.memberSearch}>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Search group members..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && filteredMembers.length > 0 && (
                                <div className={styles.searchResults}>
                                    {filteredMembers.map((member) => (
                                        <div
                                            key={member.id}
                                            className={styles.searchResultItem}
                                            onClick={() => handleAddMember(member)}
                                        >
                                            <div
                                                className={styles.searchResultAvatar}
                                                style={{ backgroundColor: getAvatarColor(member.username) }}
                                            >
                                                {getInitials(member.username)}
                                            </div>
                                            <div className={styles.searchResultInfo}>
                                                <div className={styles.searchResultName}>{member.username}</div>
                                                <div className={styles.searchResultEmail}>{member.email}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedMembers.length > 0 && (
                            <div className={styles.selectedMembers}>
                                {selectedMembers.map((member) => (
                                    <div key={member.id} className={styles.selectedMember}>
                                        <div
                                            className={styles.selectedMemberAvatar}
                                            style={{ backgroundColor: getAvatarColor(member.username) }}
                                        >
                                            {getInitials(member.username)}
                                        </div>
                                        <span>{member.username}</span>
                                        <button
                                            className={styles.removeMemberButton}
                                            onClick={() => handleRemoveMember(member.id)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button
                        className={`${styles.button} ${styles.buttonSecondary}`}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className={`${styles.button} ${styles.buttonPrimary}`}
                        onClick={handleCreate}
                        disabled={loading || !roomName.trim()}
                    >
                        {loading ? 'Creating...' : 'Create Room'}
                    </button>
                </div>
            </div>
        </div>
    );
}
