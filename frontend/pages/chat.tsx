import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { conversationAPI, messageAPI, userAPI, groupAPI } from '@/lib/api';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';
import type { Conversation, Message, User, Group } from '@/types';
import styles from '../styles/Chat.module.css';
import groupStyles from '../styles/GroupChat.module.css';
import CreateGroupModal from '@/components/groups/CreateGroupModal';
import GroupInfoPanel from '@/components/groups/GroupInfoPanel';

type ChatType = 'conversation' | 'group';

export default function ChatPage() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const { socket } = useSocket();

    // Conversations state
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

    // Groups state
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

    // Current chat type
    const [chatType, setChatType] = useState<ChatType>('conversation');

    // Messages state
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');

    // Loading states
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    // Sidebar state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Load conversations and groups
    useEffect(() => {
        if (user) {
            loadConversations();
            loadGroups();
        }
    }, [user]);

    // Socket.io event listeners
    useEffect(() => {
        if (!socket || !user) return;

        // Conversation messages
        socket.on('new_message', (message: Message) => {
            console.log('Received new message via socket:', message);
            // Only add message if it's from someone else (we add our own optimistically)
            if (message.senderId !== user.id) {
                if (chatType === 'conversation' && selectedConversation && message.conversationId === selectedConversation.id) {
                    setMessages((prev) => [...prev, message]);
                }
            }
            loadConversations();
        });

        // Group messages
        socket.on('new_group_message', (message: Message) => {
            console.log('Received new group message via socket:', message);
            // Only add message if it's from someone else (we add our own optimistically)
            if (message.senderId !== user.id) {
                if (chatType === 'group' && selectedGroup && message.groupId === selectedGroup.id) {
                    setMessages((prev) => [...prev, message]);
                }
            }
            loadGroups();
        });

        // Group member events
        socket.on('member_added', () => {
            if (selectedGroup) {
                loadGroupMessages(selectedGroup.id);
            }
            loadGroups();
        });

        socket.on('member_removed', ({ userId }: { userId: number }) => {
            if (user && userId === user.id && selectedGroup) {
                // Current user was removed
                setSelectedGroup(null);
                setChatType('conversation');
            }
            loadGroups();
        });

        socket.on('user_typing', ({ userId, conversationId }) => {
            console.log(`User ${userId} is typing in conversation ${conversationId}`);
        });

        return () => {
            socket.off('new_message');
            socket.off('new_group_message');
            socket.off('member_added');
            socket.off('member_removed');
            socket.off('user_typing');
        };
    }, [socket, selectedConversation, selectedGroup, chatType, user]);

    const loadConversations = async () => {
        try {
            const data = await conversationAPI.getAll();
            setConversations(data.conversations);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoadingConversations(false);
        }
    };

    const loadGroups = async () => {
        try {
            const data = await groupAPI.getAll();
            setGroups(data.groups);
        } catch (error) {
            console.error('Error loading groups:', error);
        } finally {
            setLoadingGroups(false);
        }
    };

    const loadMessages = async (conversationId: number) => {
        setLoadingMessages(true);
        try {
            const data = await messageAPI.getHistory(conversationId);
            setMessages(data.messages.reverse());

            if (socket) {
                socket.emit('join_conversation', conversationId);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const loadGroupMessages = async (groupId: number) => {
        setLoadingMessages(true);
        try {
            const data = await groupAPI.getMessages(groupId);
            setMessages(data.messages.reverse());

            if (socket) {
                socket.emit('join_group', groupId);
            }
        } catch (error) {
            console.error('Error loading group messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSelectConversation = (conversation: Conversation) => {
        // Leave previous rooms
        if (socket) {
            if (selectedConversation) {
                socket.emit('leave_conversation', selectedConversation.id);
            }
            if (selectedGroup) {
                socket.emit('leave_group', selectedGroup.id);
            }
        }

        setSelectedConversation(conversation);
        setSelectedGroup(null);
        setChatType('conversation');
        setShowGroupInfo(false);
        loadMessages(conversation.id);
    };

    const handleSelectGroup = (group: Group) => {
        // Leave previous rooms
        if (socket) {
            if (selectedConversation) {
                socket.emit('leave_conversation', selectedConversation.id);
            }
            if (selectedGroup) {
                socket.emit('leave_group', selectedGroup.id);
            }
        }

        setSelectedGroup(group);
        setSelectedConversation(null);
        setChatType('group');
        loadGroupMessages(group.id);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !user) return;

        const tempMessage: Message = {
            id: Date.now(),
            conversationId: chatType === 'conversation' ? selectedConversation?.id || null : null,
            groupId: chatType === 'group' ? selectedGroup?.id || null : null,
            senderId: user.id,
            content: messageInput.trim(),
            status: 'sent',
            createdAt: new Date().toISOString(),
            sender: {
                id: user.id,
                username: user.username,
                email: user.email,
                createdAt: '',
            },
        };

        setMessages((prev) => [...prev, tempMessage]);
        setMessageInput('');

        try {
            if (chatType === 'conversation' && selectedConversation) {
                await messageAPI.send(selectedConversation.id, tempMessage.content);
                // Reload conversations to update sidebar with new message
                loadConversations();
            } else if (chatType === 'group' && selectedGroup) {
                await groupAPI.sendMessage(selectedGroup.id, tempMessage.content);
                // Reload groups to update sidebar with new message
                loadGroups();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
        }
    };

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
                setSearchResults(data.users);
            } catch (error) {
                console.error('Error searching users:', error);
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectUser = async (selectedUser: User) => {
        try {
            const data = await conversationAPI.getOrCreate(selectedUser.id);
            setShowSearch(false);
            setSearchQuery('');
            setSearchResults([]);
            handleSelectConversation(data.conversation);
            loadConversations();
        } catch (error) {
            console.error('Error creating conversation:', error);
        }
    };

    const handleGroupCreated = (group: Group) => {
        setGroups((prev) => [group, ...prev]);
        handleSelectGroup(group);
    };

    const handleLeaveGroup = () => {
        setSelectedGroup(null);
        setChatType('conversation');
        setShowGroupInfo(false);
        loadGroups();
    };

    if (loading || !user) {
        return (
            <div className={styles.loading}>
                <div className="pulse">Loading...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <div className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.sidebarHeader}>
                    {!sidebarCollapsed && <h1 className={styles.appTitle}>Messenger</h1>}
                    {!sidebarCollapsed && (
                        <button onClick={logout} className={styles.logoutButton}>
                            Logout
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className={styles.toggleButton}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        {sidebarCollapsed ? (
                            <path d="M9 18l6-6-6-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                            <path d="M15 18l-6-6 6-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                    </svg>
                </button>

                {sidebarCollapsed ? (
                    <>
                        <div className={styles.collapsedUserIcon} style={{ backgroundColor: getAvatarColor(user.username) }}>
                            {getInitials(user.username)}
                        </div>
                        <button
                            className={styles.collapsedNewChatButton}
                            onClick={() => {
                                setSidebarCollapsed(false);
                                setShowSearch(true);
                            }}
                            title="New Chat"
                        >
                            +
                        </button>
                    </>
                ) : (
                    <>
                        <div className={styles.userInfo}>
                            <div className={styles.userAvatar} style={{ backgroundColor: getAvatarColor(user.username) }}>
                                {getInitials(user.username)}
                            </div>
                            <div>
                                <div className={styles.userName}>{user.username}</div>
                                <div className={styles.userEmail}>{user.email}</div>
                            </div>
                        </div>

                        <button
                            className={styles.newChatButton}
                            onClick={() => setShowSearch(!showSearch)}
                        >
                            New Chat
                        </button>

                        <button
                            className={groupStyles.createGroupButton}
                            onClick={() => setShowCreateGroupModal(true)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Create Group
                        </button>

                        {showSearch && (
                            <div className={styles.searchContainer}>
                                <input
                                    type="text"
                                    placeholder="Search users by email or username..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={styles.searchInput}
                                    autoFocus
                                />
                                {searchLoading && (
                                    <div className={styles.searchLoading}>Searching...</div>
                                )}
                                {searchResults.length > 0 && (
                                    <div className={styles.searchResults}>
                                        {searchResults.map((searchUser) => (
                                            <div
                                                key={searchUser.id}
                                                className={styles.searchResultItem}
                                                onClick={() => handleSelectUser(searchUser)}
                                            >
                                                <div className={styles.searchResultAvatar} style={{ backgroundColor: getAvatarColor(searchUser.username) }}>
                                                    {getInitials(searchUser.username)}
                                                </div>
                                                <div>
                                                    <div className={styles.searchResultName}>
                                                        {searchUser.username}
                                                    </div>
                                                    <div className={styles.searchResultEmail}>
                                                        {searchUser.email}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!searchLoading && searchQuery && searchResults.length === 0 && (
                                    <div className={styles.noResults}>No users found</div>
                                )}
                            </div>
                        )}
                    </>
                )}

                <div className={styles.conversationList}>
                    {/* Groups Section */}
                    {!sidebarCollapsed && groups.length > 0 && (
                        <>
                            <div className={groupStyles.sectionLabel}>Groups</div>
                            {groups.map((group) => (
                                <div
                                    key={`group-${group.id}`}
                                    className={`${groupStyles.groupItem} ${selectedGroup?.id === group.id ? groupStyles.active : ''}`}
                                    onClick={() => handleSelectGroup(group)}
                                >
                                    <div className={groupStyles.groupAvatar}>
                                        {getInitials(group.name)}
                                    </div>
                                    <div className={groupStyles.groupItemInfo}>
                                        <div className={groupStyles.groupItemName}>{group.name}</div>
                                        {group.lastMessage && (
                                            <div className={groupStyles.groupLastMessage}>
                                                {group.lastMessage.sender?.username}: {group.lastMessage.content}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* Conversations Section */}
                    {!sidebarCollapsed && (conversations.length > 0 || groups.length > 0) && (
                        <div className={groupStyles.sectionLabel}>Direct Messages</div>
                    )}

                    {loadingConversations ? (
                        !sidebarCollapsed && <div className={styles.loadingText}>Loading conversations...</div>
                    ) : conversations.length === 0 && groups.length === 0 ? (
                        !sidebarCollapsed && <div className={styles.emptyState}>
                            No conversations yet. Start a new chat!
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={`${styles.conversationItem} ${selectedConversation?.id === conv.id ? styles.active : ''
                                    } ${sidebarCollapsed ? styles.collapsedItem : ''}`}
                                onClick={() => handleSelectConversation(conv)}
                                title={sidebarCollapsed ? conv.otherParticipant?.username : ''}
                            >
                                <div className={styles.conversationAvatar} style={{ backgroundColor: getAvatarColor(conv.otherParticipant?.username || '') }}>
                                    {getInitials(conv.otherParticipant?.username || '')}
                                    {conv.otherParticipant?.isOnline && (
                                        <div className={styles.onlineIndicator} />
                                    )}
                                </div>
                                {!sidebarCollapsed && (
                                    <div className={styles.conversationInfo}>
                                        <div className={styles.conversationName}>
                                            {conv.otherParticipant?.username}
                                        </div>
                                        {conv.lastMessage && (
                                            <div className={styles.lastMessage}>
                                                {conv.lastMessage.content}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={styles.mainArea}>
                {chatType === 'conversation' && selectedConversation ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div className={styles.chatHeaderInfo}>
                                <div className={styles.chatAvatar} style={{ backgroundColor: getAvatarColor(selectedConversation.otherParticipant?.username || '') }}>
                                    {getInitials(selectedConversation.otherParticipant?.username || '')}
                                </div>
                                <div>
                                    <div className={styles.chatName}>
                                        {selectedConversation.otherParticipant?.username}
                                    </div>
                                    <div className={styles.chatStatus}>
                                        {selectedConversation.otherParticipant?.isOnline ? 'Online' : 'Offline'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.messagesContainer}>
                            {loadingMessages ? (
                                <div className={styles.loadingText}>Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className={styles.emptyState}>
                                    No messages yet. Start the conversation!
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`${styles.message} ${message.senderId === user.id ? styles.sent : styles.received}`}
                                    >
                                        <div className={styles.messageContent}>{message.content}</div>
                                        <div className={styles.messageTime}>
                                            {new Date(message.createdAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handleSendMessage} className={styles.messageInputContainer}>
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Type a message..."
                                className={styles.messageInput}
                            />
                            <button type="submit" className={styles.sendButton} disabled={!messageInput.trim()}>
                                Send
                            </button>
                        </form>
                    </>
                ) : chatType === 'group' && selectedGroup ? (
                    <>
                        <div className={groupStyles.groupHeader}>
                            <div className={groupStyles.groupHeaderAvatar}>
                                {getInitials(selectedGroup.name)}
                            </div>
                            <div className={groupStyles.groupHeaderInfo}>
                                <div className={groupStyles.groupHeaderName}>{selectedGroup.name}</div>
                                <div className={groupStyles.groupHeaderMemberCount}>
                                    {selectedGroup.memberCount || selectedGroup.members?.length || 0} members
                                </div>
                            </div>
                            <button
                                className={groupStyles.infoButton}
                                onClick={() => setShowGroupInfo(!showGroupInfo)}
                                title="Group Info"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                            </button>
                        </div>

                        <div className={styles.messagesContainer}>
                            {loadingMessages ? (
                                <div className={styles.loadingText}>Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className={styles.emptyState}>
                                    No messages yet. Start the conversation!
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`${styles.message} ${message.senderId === user.id ? styles.sent : styles.received}`}
                                    >
                                        {message.senderId !== user.id && (
                                            <div className={groupStyles.messageSenderName}>
                                                {message.sender?.username}
                                            </div>
                                        )}
                                        <div className={styles.messageContent}>{message.content}</div>
                                        <div className={styles.messageTime}>
                                            {new Date(message.createdAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handleSendMessage} className={styles.messageInputContainer}>
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Type a message..."
                                className={styles.messageInput}
                            />
                            <button type="submit" className={styles.sendButton} disabled={!messageInput.trim()}>
                                Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div className={styles.emptyChat}>
                        <div className={styles.emptyChatIcon}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </div>
                        <h2>Select a conversation</h2>
                        <p>Choose a conversation from the sidebar or start a new chat</p>
                    </div>
                )}
            </div>

            {/* Group Info Panel */}
            {showGroupInfo && selectedGroup && (
                <GroupInfoPanel
                    group={selectedGroup}
                    currentUserId={user.id}
                    onClose={() => setShowGroupInfo(false)}
                    onMemberAdded={loadGroups}
                    onMemberRemoved={loadGroups}
                    onLeaveGroup={handleLeaveGroup}
                />
            )}

            {/* Create Group Modal */}
            <CreateGroupModal
                isOpen={showCreateGroupModal}
                onClose={() => setShowCreateGroupModal(false)}
                onGroupCreated={handleGroupCreated}
                currentUserId={user.id}
            />
        </div>
    );
}

