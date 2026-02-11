import { useState } from "react";
import styles from "../../styles/GroupChat.module.css";

interface GroupSettings {
  whoCanCreateRooms: "admin" | "everyone";
  whoCanSendMessages: "admin" | "everyone";
  whoCanAddMembers: "admin" | "everyone";
  whoCanRemoveMembers: "admin" | "everyone";
}

interface GroupSettingsModalProps {
  settings: GroupSettings;
  onClose: () => void;
  onSave: (settings: GroupSettings) => void;
}

export default function GroupSettingsModal({
  settings,
  onClose,
  onSave,
}: GroupSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<GroupSettings>(settings);

  const handleSave = () => {
    onSave(localSettings);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "550px" }}
      >
        <div className={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Group Settings</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.settingsSection}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingTitle}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ marginRight: "8px" }}
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  Who can create rooms?
                </div>
                <div className={styles.settingDescription}>
                  Control who has permission to create new rooms in this group
                </div>
              </div>
              <select
                value={localSettings.whoCanCreateRooms}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    whoCanCreateRooms: e.target.value as "admin" | "everyone",
                  })
                }
                className={styles.settingSelect}
              >
                <option value="everyone">Everyone</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingTitle}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ marginRight: "8px" }}
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Who can send messages?
                </div>
                <div className={styles.settingDescription}>
                  Control who can send messages in the group chat
                </div>
              </div>
              <select
                value={localSettings.whoCanSendMessages}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    whoCanSendMessages: e.target.value as "admin" | "everyone",
                  })
                }
                className={styles.settingSelect}
              >
                <option value="everyone">Everyone</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingTitle}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ marginRight: "8px" }}
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  Who can add members?
                </div>
                <div className={styles.settingDescription}>
                  Control who can invite new members to the group
                </div>
              </div>
              <select
                value={localSettings.whoCanAddMembers}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    whoCanAddMembers: e.target.value as "admin" | "everyone",
                  })
                }
                className={styles.settingSelect}
              >
                <option value="everyone">Everyone</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingTitle}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ marginRight: "8px" }}
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  Who can remove members?
                </div>
                <div className={styles.settingDescription}>
                  Control who can remove members from the group
                </div>
              </div>
              <select
                value={localSettings.whoCanRemoveMembers}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    whoCanRemoveMembers: e.target.value as "admin" | "everyone",
                  })
                }
                className={styles.settingSelect}
              >
                <option value="everyone">Everyone</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.primaryButton} onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
