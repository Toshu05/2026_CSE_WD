import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL, API_URL } from './config';
import LoginRegister from './components/LoginRegister';
import ChatWindow from './components/ChatWindow';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  // Real-time tracking maps
  const [onlineUsers, setOnlineUsers] = useState({}); // userId -> 'online' | 'offline'
  const [typingUsers, setTypingUsers] = useState({}); // conversationId -> Array of usernames

  // Fetch user conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/conversations`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  }, []);

  // Check auth session status on boot
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Set up socket connection and event handlers when user changes
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect socket with credentials (sends session cookies)
    const newSocket = io(BACKEND_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    // Listen for new messages
    newSocket.on('message:new', (message) => {
      setMessages((prev) => {
        // Prevent duplicate messages in display state
        if (prev.some((m) => m._id === message._id)) return prev;
        
        // Append only if the message belongs to current room
        if (activeConversation && message.conversationId === activeConversation._id) {
          return [...prev, message];
        }
        return prev;
      });

      // Update last message in the sidebar list
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv._id === message.conversationId) {
            return {
              ...conv,
              lastMessage: {
                text: message.text || (message.type === 'image' ? 'Sent an image' : ''),
                senderId: message.senderId,
                sentAt: message.createdAt
              },
              updatedAt: message.createdAt
            };
          }
          return conv;
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    });

    // Listen for new conversations created by others
    newSocket.on('conversation:new', (conversation) => {
      setConversations((prev) => {
        if (prev.some((c) => c._id === conversation._id)) return prev;
        return [conversation, ...prev];
      });
    });

    // Listen for presence updates
    newSocket.on('presence:update', ({ userId, status }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: status
      }));
    });

    // Listen for typing indicator updates
    newSocket.on('typing:update', ({ userId, username, typing, conversationId }) => {
      setTypingUsers((prev) => {
        const roomTypists = prev[conversationId] || [];
        if (typing) {
          if (roomTypists.includes(username)) return prev;
          return { ...prev, [conversationId]: [...roomTypists, username] };
        } else {
          return { ...prev, [conversationId]: roomTypists.filter((u) => u !== username) };
        }
      });
    });

    newSocket.on('error', (err) => {
      console.error('Socket error event:', err);
    });

    setSocket(newSocket);
    fetchConversations();

    return () => {
      newSocket.disconnect();
    };
  }, [user, fetchConversations, activeConversation]);

  // Handle active conversation room changes (join/leave socket rooms)
  useEffect(() => {
    if (!socket || !activeConversation) return;

    // Join room
    socket.emit('conversation:join', activeConversation._id);

    return () => {
      // Leave room when switching away
      socket.emit('conversation:leave', activeConversation._id);
    };
  }, [socket, activeConversation]);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        setUser(null);
        setActiveConversation(null);
        setConversations([]);
        setMessages([]);
        setOnlineUsers({});
        setTypingUsers({});
      }
    } catch (err) {
      console.error('Logout request failed:', err);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--primary)',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        Loading Chat Room...
      </div>
    );
  }

  return (
    <div className="app-container">
      {user ? (
        <ChatWindow
          user={user}
          conversations={conversations}
          activeConversation={activeConversation}
          setActiveConversation={setActiveConversation}
          messages={messages}
          setMessages={setMessages}
          socket={socket}
          onLogout={handleLogout}
          typingUsers={typingUsers}
          onlineUsers={onlineUsers}
          refreshConversations={fetchConversations}
        />
      ) : (
        <LoginRegister onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}
