import { useState, useEffect } from "react";
import { userAPI, groupAPI } from "@/lib/api";
import { getAvatarColor, getInitials } from "@/lib/avatarUtils";
import type { User, Group } from "@/types";
import styles from "../../styles/GroupChat.module.css";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (group: Group) => void;
  currentUserId: number;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onGroupCreated,
  currentUserId,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState({
    whoCanCreateRooms: "everyone" as "admin" | "everyone",
    whoCanSendMessages: "everyone" as "admin" | "everyone",
    whoCanAddMembers: "admin" as "admin" | "everyone",
    whoCanRemoveMembers: "admin" as "admin" | "everyone",
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setGroupName("");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMembers([]);
      setError("");
    }
  }, [isOpen]);

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await userAPI.search(searchQuery);
        // Filter out current user and already selected members
        const filtered = data.users.filter(
          (u) =>
            u.id !== currentUserId &&
            !selectedMembers.some((m) => m.id === u.id),
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId, selectedMembers]);

  const handleSelectMember = (user: User) => {
    setSelectedMembers((prev) => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveMember = (userId: number) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const memberIds = selectedMembers.map((m) => m.id);
      const data = await groupAPI.create(groupName.trim(), memberIds, settings);
      onGroupCreated(data.group);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create Group</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && (
            <div
              style={{
                color: "#e53e3e",
                marginBottom: "16px",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Group Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Add Members</label>
            <div className={styles.memberSearch}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                      onClick={() => handleSelectMember(user)}
                    >
                      <div
                        className={styles.searchResultAvatar}
                        style={{
                          backgroundColor: getAvatarColor(user.username),
                        }}
                      >
                        {getInitials(user.username)}
                      </div>
                      <div className={styles.searchResultInfo}>
                        <div className={styles.searchResultName}>
                          {user.username}
                        </div>
                        <div className={styles.searchResultEmail}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!searchLoading && searchQuery && searchResults.length === 0 && (
                <div className={styles.searchResults}>
                  <div className={styles.emptyState}>No users found</div>
                </div>
              )}
            </div>

            {selectedMembers.length > 0 && (
              <div className={styles.selectedMembers}>
                {selectedMembers.map((member) => (
                  <div key={member.id} className={styles.selectedMember}>
                    <div
                      className={styles.selectedMemberAvatar}
                      style={{
                        backgroundColor: getAvatarColor(member.username),
                      }}
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

          {/* Group Settings */}
          <div className={styles.inputGroup} style={{ marginTop: "20px" }}>
            <label className={styles.inputLabel}>Group Settings</label>
            <div className={styles.settingsGrid}>
              <div className={styles.settingCompact}>
                <label>Who can create rooms?</label>
                <select
                  value={settings.whoCanCreateRooms}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whoCanCreateRooms: e.target.value as "admin" | "everyone",
                    })
                  }
                  className={styles.selectInput}
                >
                  <option value="everyone">Everyone</option>
                  <option value="admin">Admins Only</option>
                </select>
              </div>
              <div className={styles.settingCompact}>
                <label>Who can send messages?</label>
                <select
                  value={settings.whoCanSendMessages}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whoCanSendMessages: e.target.value as
                        | "admin"
                        | "everyone",
                    })
                  }
                  className={styles.selectInput}
                >
                  <option value="everyone">Everyone</option>
                  <option value="admin">Admins Only</option>
                </select>
              </div>
              <div className={styles.settingCompact}>
                <label>Who can add members?</label>
                <select
                  value={settings.whoCanAddMembers}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whoCanAddMembers: e.target.value as "admin" | "everyone",
                    })
                  }
                  className={styles.selectInput}
                >
                  <option value="everyone">Everyone</option>
                  <option value="admin">Admins Only</option>
                </select>
              </div>
              <div className={styles.settingCompact}>
                <label>Who can remove members?</label>
                <select
                  value={settings.whoCanRemoveMembers}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whoCanRemoveMembers: e.target.value as
                        | "admin"
                        | "everyone",
                    })
                  }
                  className={styles.selectInput}
                >
                  <option value="everyone">Everyone</option>
                  <option value="admin">Admins Only</option>
                </select>
              </div>
            </div>
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
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || creating}
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
