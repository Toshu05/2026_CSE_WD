import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';

// --- INLINE SVG ICONS (Emerald themed, no blue) ---
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);
const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);
const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const DoubleCheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6L8.5 14.5L5 11M22 6L13.5 14.5" /></svg>
);
const MessageSquareIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);

export default function ChatWindow({ 
  user, 
  conversations, 
  activeConversation, 
  setActiveConversation, 
  messages, 
  setMessages,
  socket, 
  onLogout,
  typingUsers,
  onlineUsers,
  refreshConversations
}) {
  const [inputText, setInputText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [modalTab, setModalTab] = useState('direct'); // direct | group
  const [systemUsers, setSystemUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [modalSearch, setModalSearch] = useState('');

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');

  // Pagination cursor
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, activeConversation]);

  // Load history when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchHistory(activeConversation._id);
      setInputText('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);
    } else {
      setMessages([]);
      setNextCursor(null);
    }
  }, [activeConversation]);

  // Fetch registered users for modals
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/users`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSystemUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchHistory = async (convId, cursor = '') => {
    setLoadingHistory(true);
    try {
      const url = `${API_URL}/conversations/${convId}/messages?limit=30${cursor ? `&cursor=${cursor}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (cursor) {
          // Append older messages to top
          setMessages(prev => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
        }
        setNextCursor(data.nextCursor);
        
        // Auto mark last messages as read
        if (data.messages.length > 0) {
          const lastMsg = data.messages[data.messages.length - 1];
          if (!lastMsg.readBy.includes(user.id)) {
            markMessageRead(lastMsg._id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load message history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadMoreMessages = () => {
    if (nextCursor && activeConversation) {
      fetchHistory(activeConversation._id, nextCursor);
    }
  };

  const markMessageRead = async (messageId) => {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (response.ok) {
        // Update local state if needed
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, readBy: [...m.readBy, user.id] } : m));
      }
    } catch (err) {
      console.error("Error marking message as read", err);
    }
  };

  // Typing state emission
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    if (!socket || !activeConversation) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { conversationId: activeConversation._id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', { conversationId: activeConversation._id });
    }, 2000);
  };

  // Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachmentUrl.trim()) return;

    if (socket && activeConversation) {
      // Send via socket.io client event
      socket.emit('message:send', {
        conversationId: activeConversation._id,
        text: inputText,
        type: attachmentUrl ? 'image' : 'text',
        attachmentUrl: attachmentUrl || null
      });

      // Clear typing indicator
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit('typing:stop', { conversationId: activeConversation._id });
      }

      setInputText('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);
    }
  };

  // Handle direct/group conversation creation
  const handleCreateConversation = async () => {
    if (modalTab === 'direct') {
      if (selectedUserIds.length !== 1) return;
      try {
        const response = await fetch(`${API_URL}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'direct',
            memberIds: selectedUserIds
          }),
          credentials: 'include'
        });
        if (response.ok) {
          const newConv = await response.json();
          refreshConversations();
          setActiveConversation(newConv);
          setShowNewChatModal(false);
          setSelectedUserIds([]);
        }
      } catch (err) {
        console.error("Error creating direct conversation", err);
      }
    } else {
      if (!groupName.trim() || selectedUserIds.length === 0) return;
      try {
        const response = await fetch(`${API_URL}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'group',
            name: groupName,
            memberIds: selectedUserIds
          }),
          credentials: 'include'
        });
        if (response.ok) {
          const newConv = await response.json();
          refreshConversations();
          setActiveConversation(newConv);
          setShowNewChatModal(false);
          setGroupName('');
          setSelectedUserIds([]);
        }
      } catch (err) {
        console.error("Error creating group conversation", err);
      }
    }
  };

  // Add member to group
  const handleAddMember = async (targetUserId) => {
    if (!activeConversation) return;
    try {
      const response = await fetch(`${API_URL}/conversations/${activeConversation._id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId }),
        credentials: 'include'
      });
      if (response.ok) {
        // Refresh active conversation to get the updated members list
        const convRes = await fetch(`${API_URL}/conversations/${activeConversation._id}`, { credentials: 'include' });
        if (convRes.ok) {
          const updatedConv = await convRes.json();
          setActiveConversation(updatedConv);
        }
        setShowAddMemberModal(false);
      }
    } catch (err) {
      console.error("Error adding member to group", err);
    }
  };

  // Toggle user selection in modal
  const toggleSelectUser = (id) => {
    if (modalTab === 'direct') {
      setSelectedUserIds([id]);
    } else {
      setSelectedUserIds(prev => 
        prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
      );
    }
  };

  // Formatting timestamp helper
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    return name ? name.substring(0, 2) : 'CH';
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    const title = c.type === 'group' 
      ? c.name 
      : c.members?.find(m => m._id !== user.id)?.username || 'Chat';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filtered users for conversation modal
  const filteredUsers = systemUsers.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(modalSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(modalSearch.toLowerCase());
    return matchesSearch && u._id !== user.id;
  });

  // Filtered users to add to current group
  const filteredAddMemberUsers = systemUsers.filter(u => {
    if (!activeConversation) return false;
    const matchesSearch = u.username.toLowerCase().includes(addMemberSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(addMemberSearch.toLowerCase());
    const isAlreadyMember = activeConversation.members?.some(m => m._id === u._id);
    return matchesSearch && !isAlreadyMember && u._id !== user.id;
  });

  // Determine chat detail display info
  const getChatDetails = () => {
    if (!activeConversation) return null;
    if (activeConversation.type === 'group') {
      return {
        name: activeConversation.name,
        avatarText: getInitials(activeConversation.name),
        statusText: `${activeConversation.members?.length || 0} members`
      };
    } else {
      const otherMember = activeConversation.members?.find(m => m._id !== user.id) || {};
      const otherMemberPresence = onlineUsers[otherMember._id] || otherMember.status || 'offline';
      
      return {
        name: otherMember.username || 'Deleted User',
        avatarText: getInitials(otherMember.username),
        statusText: otherMemberPresence === 'online' ? 'Online' : 'Offline',
        isOnline: otherMemberPresence === 'online',
        avatarUrl: otherMember.avatarUrl
      };
    }
  };

  const chatDetails = getChatDetails();

  // Active room typing user indicator text
  const getTypingText = () => {
    if (!activeConversation) return null;
    const activeTypists = typingUsers[activeConversation._id] || [];
    const otherTypists = activeTypists.filter(username => username !== user.username);
    if (otherTypists.length === 0) return null;
    if (otherTypists.length === 1) return `${otherTypists[0]} is typing...`;
    return 'Multiple users typing...';
  };
  const typingText = getTypingText();

  return (
    <div className="chat-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="profile-bar">
            <div className="user-info">
              <div className="avatar">
                {getInitials(user.username)}
                <div className="status-badge online"></div>
              </div>
              <div className="user-details">
                <h3>{user.username}</h3>
                <div className="user-status-text">Active Session</div>
              </div>
            </div>
            <div className="profile-actions">
              <button className="icon-btn primary" title="New Chat" onClick={() => { fetchUsers(); setShowNewChatModal(true); }}>
                <PlusIcon />
              </button>
              <button className="icon-btn" title="Logout" onClick={onLogout}>
                <LogoutIcon />
              </button>
            </div>
          </div>

          <div className="search-wrapper">
            <span className="search-icon"><SearchIcon /></span>
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list stream */}
        <div className="conversation-list">
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No chats found. Click the '+' button to start one!
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = activeConversation && activeConversation._id === conv._id;
              
              // Resolve name/presence for display
              let displayName = 'Chat';
              let displayInitials = 'CH';
              let displayStatus = 'offline';
              let displayAvatarUrl = null;

              if (conv.type === 'group') {
                displayName = conv.name || 'Group Chat';
                displayInitials = getInitials(displayName);
              } else {
                // Find other member
                const otherMember = conv.members?.find(m => m._id !== user.id) || {};
                displayName = otherMember.username || 'Chat User';
                displayInitials = getInitials(displayName);
                displayStatus = onlineUsers[otherMember._id] || otherMember.status || 'offline';
                displayAvatarUrl = otherMember.avatarUrl;
              }

              const hasLastMessage = conv.lastMessage;
              const lastMsgText = hasLastMessage ? conv.lastMessage.text : 'No messages yet';
              const lastMsgTime = hasLastMessage ? formatTime(conv.lastMessage.sentAt) : '';

              return (
                <div 
                  key={conv._id} 
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveConversation(conv)}
                >
                  <div className="avatar">
                    {displayAvatarUrl ? (
                      <img src={displayAvatarUrl} alt={displayName} className="avatar-img" />
                    ) : (
                      displayInitials
                    )}
                    {conv.type !== 'group' && (
                      <div className={`status-badge ${displayStatus}`}></div>
                    )}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-meta">
                      <div className="conversation-name">{displayName}</div>
                      <div className="conversation-time">{lastMsgTime}</div>
                    </div>
                    <div className="conversation-preview">
                      {lastMsgText}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ACTIVE CHAT WINDOW */}
      <div className="chat-window">
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <div className="chat-title-info">
                <div className="avatar">
                  {chatDetails.avatarUrl ? (
                    <img src={chatDetails.avatarUrl} alt={chatDetails.name} className="avatar-img" />
                  ) : (
                    chatDetails.avatarText
                  )}
                  {activeConversation.type !== 'group' && (
                    <div className={`status-badge ${chatDetails.isOnline ? 'online' : 'offline'}`}></div>
                  )}
                </div>
                <div>
                  <div className="chat-name">{chatDetails.name}</div>
                  <div className="chat-status">
                    {typingText ? (
                      <span className="typing-header-text">{typingText}</span>
                    ) : (
                      <>
                        {activeConversation.type === 'group' ? <UsersIcon /> : <UserIcon />}
                        <span>{chatDetails.statusText}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="chat-actions">
                {activeConversation.type === 'group' && (
                  <button className="icon-btn primary" title="Add Group Member" onClick={() => { fetchUsers(); setShowAddMemberModal(true); }}>
                    <PlusIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Message stream area */}
            <div className="messages-pane">
              {nextCursor && (
                <button 
                  onClick={loadMoreMessages} 
                  className="btn-secondary" 
                  style={{ alignSelf: 'center', margin: '8px 0', fontSize: '12px', padding: '6px 12px' }}
                  disabled={loadingHistory}
                >
                  {loadingHistory ? 'Loading...' : 'Load older messages'}
                </button>
              )}

              {messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  Say hello! There are no messages yet.
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutgoing = msg.senderId === user.id || msg.senderId?._id === user.id;
                  
                  // If system message
                  if (msg.type === 'system') {
                    return (
                      <div key={msg._id} className="message-system">
                        {msg.text}
                      </div>
                    );
                  }

                  // Resolve sender name (if group chat)
                  let senderName = '';
                  if (activeConversation.type === 'group' && !isOutgoing) {
                    const senderObj = activeConversation.members?.find(m => m._id === (msg.senderId?._id || msg.senderId));
                    senderName = senderObj ? senderObj.username : 'User';
                  }

                  // Check if anyone else has read this message
                  const readByOthers = msg.readBy?.filter(uid => uid !== user.id) || [];
                  const isRead = readByOthers.length > 0;

                  return (
                    <div 
                      key={msg._id} 
                      className={`message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}
                    >
                      {senderName && <span className="message-sender">{senderName}</span>}
                      <div className="message-bubble">
                        {msg.type === 'image' && msg.attachmentUrl && (
                          <img src={msg.attachmentUrl} alt="attachment" className="message-image" />
                        )}
                        {msg.text}
                      </div>
                      <div className="message-footer">
                        <span>{formatTime(msg.createdAt)}</span>
                        {isOutgoing && (
                          <span className="read-icon">
                            {isRead ? <DoubleCheckIcon /> : <CheckIcon />}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Real-time typing indicators in chat logs */}
              {typingText && (
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="chat-input-bar">
              {showAttachmentInput && (
                <div className="attachment-preview-box">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                    Image URL: {attachmentUrl}
                  </span>
                  <button className="attachment-remove" onClick={() => { setAttachmentUrl(''); setShowAttachmentInput(false); }}>
                    <CloseIcon />
                  </button>
                </div>
              )}

              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <button 
                  type="button" 
                  className={`icon-btn ${showAttachmentInput ? 'primary' : ''}`} 
                  title="Add Image Link" 
                  onClick={() => setShowAttachmentInput(prev => !prev)}
                >
                  <ImageIcon />
                </button>

                {showAttachmentInput ? (
                  <input 
                    type="text" 
                    placeholder="Paste image link here (e.g. https://images.unsplash.com/...)" 
                    className="chat-input"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="chat-input"
                    value={inputText}
                    onChange={handleInputChange}
                  />
                )}

                <button 
                  type="submit" 
                  className="send-btn" 
                  disabled={!inputText.trim() && !attachmentUrl.trim()}
                >
                  <SendIcon />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-icon"><MessageSquareIcon /></div>
            <h2>No active conversation</h2>
            <p>Select an existing conversation from the sidebar, or click the '+' button at the top to start a new chat.</p>
          </div>
        )}
      </div>

      {/* NEW CHAT MODAL */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => { setShowNewChatModal(false); setSelectedUserIds([]); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Start Conversation</div>
              <button className="icon-btn" onClick={() => { setShowNewChatModal(false); setSelectedUserIds([]); }}>
                <CloseIcon />
              </button>
            </div>

            <div className="tab-toggle">
              <button 
                className={`tab-btn ${modalTab === 'direct' ? 'active' : ''}`}
                onClick={() => { setModalTab('direct'); setSelectedUserIds([]); }}
              >
                1-on-1 Chat
              </button>
              <button 
                className={`tab-btn ${modalTab === 'group' ? 'active' : ''}`}
                onClick={() => { setModalTab('group'); setSelectedUserIds([]); }}
              >
                Group Chat
              </button>
            </div>

            <div className="modal-body">
              {modalTab === 'group' && (
                <div className="form-group">
                  <label htmlFor="groupName">Group Name</label>
                  <input 
                    id="groupName"
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Project Team"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Search Users</label>
                <div className="search-wrapper">
                  <span className="search-icon"><SearchIcon /></span>
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Search by username or email..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{modalTab === 'direct' ? 'Select User' : 'Select Members'}</label>
                <div className="user-select-list">
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No other users found in system
                    </div>
                  ) : (
                    filteredUsers.map(u => {
                      const isSelected = selectedUserIds.includes(u._id);
                      return (
                        <div 
                          key={u._id} 
                          className={`user-select-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleSelectUser(u._id)}
                        >
                          <div className="checkbox-custom">
                            {isSelected && <span className="checkbox-check">✓</span>}
                          </div>
                          <div className="user-select-details">
                            <div className="user-select-name">{u.username}</div>
                            <div className="user-select-email">{u.email}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowNewChatModal(false); setSelectedUserIds([]); }}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleCreateConversation}
                disabled={selectedUserIds.length === 0 || (modalTab === 'group' && !groupName.trim())}
              >
                {modalTab === 'direct' ? 'Start Chat' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBER TO GROUP MODAL */}
      {showAddMemberModal && (
        <div className="modal-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Group Member</div>
              <button className="icon-btn" onClick={() => setShowAddMemberModal(false)}>
                <CloseIcon />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Search Users</label>
                <div className="search-wrapper">
                  <span className="search-icon"><SearchIcon /></span>
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Search by username or email..."
                    value={addMemberSearch}
                    onChange={(e) => setAddMemberSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Select User to Add</label>
                <div className="user-select-list" style={{ maxHeight: '300px' }}>
                  {filteredAddMemberUsers.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No other users available to add
                    </div>
                  ) : (
                    filteredAddMemberUsers.map(u => (
                      <div 
                        key={u._id} 
                        className="user-select-item"
                        style={{ padding: '10px 12px' }}
                        onClick={() => handleAddMember(u._id)}
                      >
                        <div className="user-select-details">
                          <div className="user-select-name">{u.username}</div>
                          <div className="user-select-email">{u.email}</div>
                        </div>
                        <button className="btn-primary" style={{ fontSize: '12px', padding: '4px 8px' }}>
                          Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddMemberModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
