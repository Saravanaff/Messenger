import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { conversationAPI, messageAPI, userAPI } from '@/lib/api';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';
import type { Conversation, Message, User } from '@/types';
import styles from '../styles/Chat.module.css';

export default function ChatPage() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const { socket } = useSocket();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Load conversations
    useEffect(() => {
        if (user) {
            loadConversations();
        }
    }, [user]);

    // Socket.io event listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('new_message', (message: Message) => {
            if (selectedConversation && message.conversationId === selectedConversation.id) {
                setMessages((prev) => [message, ...prev]);
            }
            // Reload conversations to update last message
            loadConversations();
        });

        socket.on('user_typing', ({ userId, conversationId }) => {
            // Handle typing indicator
            console.log(`User ${userId} is typing in conversation ${conversationId}`);
        });

        return () => {
            socket.off('new_message');
            socket.off('user_typing');
        };
    }, [socket, selectedConversation]);

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

    const loadMessages = async (conversationId: number) => {
        setLoadingMessages(true);
        try {
            const data = await messageAPI.getHistory(conversationId);
            setMessages(data.messages.reverse());

            // Join conversation room
            if (socket) {
                socket.emit('join_conversation', conversationId);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
        loadMessages(conversation.id);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedConversation) return;

        try {
            await messageAPI.send(selectedConversation.id, messageInput);
            setMessageInput('');
        } catch (error) {
            console.error('Error sending message:', error);
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
        }, 300); // Debounce 300ms

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectUser = async (selectedUser: User) => {
        try {
            const data = await conversationAPI.getOrCreate(selectedUser.id);
            setShowSearch(false);
            setSearchQuery('');
            setSearchResults([]);
            handleSelectConversation(data.conversation);
            loadConversations(); // Refresh conversation list
        } catch (error) {
            console.error('Error creating conversation:', error);
        }
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

                {/* Toggle button on right edge */}
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
                        {/* User icon in collapsed mode */}
                        <div className={styles.collapsedUserIcon} style={{ backgroundColor: getAvatarColor(user.username) }}>
                            {getInitials(user.username)}
                        </div>

                        {/* New chat button in collapsed mode */}
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
                    {loadingConversations ? (
                        !sidebarCollapsed && <div className={styles.loadingText}>Loading conversations...</div>
                    ) : conversations.length === 0 ? (
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
                {selectedConversation ? (
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
                                        className={`${styles.message} ${message.senderId === user.id ? styles.sent : styles.received
                                            }`}
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
                ) : (
                    <div className={styles.emptyChat}>
                        <div className={styles.emptyChatIcon}>💬</div>
                        <h2>Select a conversation</h2>
                        <p>Choose a conversation from the sidebar or start a new chat</p>
                    </div>
                )}
            </div>
        </div>
    );
}
