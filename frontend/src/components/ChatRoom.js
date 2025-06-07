import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import {
  joinRoom,
  leaveRoom,
  sendMessage,
  startTyping,
  stopTyping,
  onNewMessage,
  onUserJoined,
  onUserLeft,
  onRoomInfo,
  onMessagesHistory,
  onUserTyping,
  onUserStoppedTyping,
  removeAllListeners
} from '../services/socketService';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
`;

const ChatHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RoomInfo = styled.div`
  h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  p {
    margin: 5px 0 0 0;
    opacity: 0.8;
    font-size: 0.9rem;
  }
`;

const OnlineUsers = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  
  span {
    font-size: 0.9rem;
    opacity: 0.8;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
`;

const Message = styled.div`
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
`;

const MessageBubble = styled.div`
  background: ${props => props.isOwn ? '#667eea' : 'white'};
  color: ${props => props.isOwn ? 'white' : '#333'};
  padding: 12px 16px;
  border-radius: 18px;
  max-width: 70%;
  word-wrap: break-word;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  
  ${props => props.isOwn ? 
    'border-bottom-right-radius: 4px;' : 
    'border-bottom-left-radius: 4px;'
  }
`;

const MessageMeta = styled.div`
  font-size: 0.8rem;
  opacity: 0.6;
  margin: 5px 10px 0 10px;
  display: flex;
  gap: 10px;
`;

const SystemMessage = styled.div`
  text-align: center;
  color: #666;
  font-style: italic;
  margin: 10px 0;
  font-size: 0.9rem;
`;

const TypingIndicator = styled.div`
  padding: 10px 20px;
  color: #666;
  font-style: italic;
  font-size: 0.9rem;
  min-height: 30px;
`;

const MessageInputContainer = styled.div`
  padding: 20px;
  border-top: 1px solid #eee;
  background: white;
`;

const MessageInputForm = styled.form`
  display: flex;
  gap: 10px;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 25px;
  outline: none;
  font-size: 1rem;
  
  &:focus {
    border-color: #667eea;
  }
`;

const SendButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const RedisInfo = styled.div`
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 10px;
  padding: 15px;
  margin: 20px;
  font-size: 0.9rem;
  
  h4 {
    margin: 0 0 10px 0;
    color: #667eea;
  }
  
  ul {
    margin: 0;
    padding-left: 20px;
  }
  
  li {
    margin: 5px 0;
  }
  
  code {
    background: rgba(0,0,0,0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 80px);
  color: #667eea;
  
  h2 {
    margin-top: 20px;
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 80px);
  color: #ff6b6b;
  text-align: center;
  padding: 20px;
  
  h2 {
    margin-bottom: 10px;
  }
  
  button {
    margin-top: 20px;
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
`;

const ChatRoom = ({ user, room, onLeaveRoom }) => {
  // WSZYSTKIE HOOKI MUSZĄ BYĆ NA POCZĄTKU - PRZED JAKIMKOLWIEK RETURN!
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomInfo, setRoomInfo] = useState(room || null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Sprawdzenie czy dane są prawidłowe
  const hasValidData = user && room;

  // useEffect dla scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Główny useEffect dla inicjalizacji pokoju
  useEffect(() => {
    // Jeśli nie mamy prawidłowych danych, ustaw błąd i zakończ
    if (!hasValidData) {
      setError(!user ? 'Brak danych użytkownika' : 'Brak danych pokoju');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ustaw domyślne roomInfo jeśli room nie ma wszystkich pól
      const defaultRoomInfo = {
        id: room.id || 'unknown',
        name: room.name || room.id || 'Unnamed Room',
        userCount: room.userCount || 0,
        messageCount: room.messageCount || 0,
        ...room
      };

      setRoomInfo(defaultRoomInfo);

      // Join room when component mounts
      joinRoom({
        roomId: defaultRoomInfo.id,
        userId: user.id,
        username: user.username
      });

      // Set up event listeners
      onNewMessage((message) => {
        if (message && message.id) {
          setMessages(prev => [...prev, message]);
        }
      });

      onUserJoined((data) => {
        if (data && data.username) {
          toast.success(`${data.username} dołączył do pokoju`);
          setMessages(prev => [...prev, {
            id: `system_${Date.now()}`,
            type: 'system',
            message: data.message || `${data.username} dołączył do pokoju`,
            timestamp: Date.now()
          }]);
        }
      });

      onUserLeft((data) => {
        if (data && data.username) {
          toast.info(`${data.username} opuścił pokój`);
          setMessages(prev => [...prev, {
            id: `system_${Date.now()}`,
            type: 'system',
            message: data.message || `${data.username} opuścił pokój`,
            timestamp: Date.now()
          }]);
        }
      });

      onRoomInfo((info) => {
        if (info) {
          setRoomInfo(prev => ({
            ...prev,
            ...info
          }));
        }
      });

      onMessagesHistory((history) => {
        if (Array.isArray(history)) {
          setMessages(history);
        }
      });

      onUserTyping((data) => {
        if (data && data.userId && data.userId !== user.id) {
          setTypingUsers(prev => {
            if (!prev.find(u => u.userId === data.userId)) {
              return [...prev, data];
            }
            return prev;
          });
        }
      });

      onUserStoppedTyping((data) => {
        if (data && data.userId) {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }
      });

      // Mock some initial messages
      const mockMessages = [
        {
          id: 'welcome_msg',
          userId: 'system',
          username: 'System',
          message: `Witaj w pokoju ${defaultRoomInfo.name}! 🎉`,
          timestamp: Date.now() - 60000,
          roomId: defaultRoomInfo.id
        }
      ];
      
      // Set mock messages after a short delay
      setTimeout(() => {
        setMessages(prev => prev.length === 0 ? mockMessages : prev);
        setLoading(false);
      }, 1000);

    } catch (err) {
      console.error('Error setting up chat room:', err);
      setError('Błąd podczas ładowania pokoju');
      setLoading(false);
    }

    // Cleanup function
    return () => {
      try {
        if (room && user) {
          leaveRoom({
            roomId: room.id || 'unknown',
            userId: user.id,
            username: user.username
          });
        }
        removeAllListeners();
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
    };
  }, [hasValidData, room, user]); // Dependencies

  // Helper functions
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (newMessage.trim() && roomInfo && user) {
      // const messageObj = {
      //   id: `msg_${Date.now()}_${user.id}`,
      //   userId: user.id,
      //   username: user.username,
      //   message: newMessage.trim(),
      //   timestamp: Date.now(),
      //   roomId: roomInfo.id
      // };

      // // Add message immediately for better UX
      // setMessages(prev => [...prev, messageObj]);
      
      // Send via socket
      try {
        sendMessage({
          roomId: roomInfo.id,
          userId: user.id,
          username: user.username,
          message: newMessage.trim()
        });
      } catch (err) {
        console.error('Error sending message:', err);
        toast.error('Błąd wysyłania wiadomości');
      }
      
      setNewMessage('');
      handleStopTyping();
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && e.target.value.trim() && roomInfo && user) {
      setIsTyping(true);
      try {
        startTyping({
          roomId: roomInfo.id,
          userId: user.id,
          username: user.username
        });
      } catch (err) {
        console.error('Error starting typing:', err);
      }
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping && roomInfo && user) {
      setIsTyping(false);
      try {
        stopTyping({
          roomId: roomInfo.id,
          userId: user.id,
          username: user.username
        });
      } catch (err) {
        console.error('Error stopping typing:', err);
      }
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid time';
    }
  };

  const formatDate = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleDateString('pl-PL');
    } catch (err) {
      return 'Invalid date';
    }
  };

  // RENDER LOGIC - PO WSZYSTKICH HOOKACH
  
  // Error state for missing user
  if (!user) {
    return (
      <ErrorContainer>
        <h2>Błąd: Brak danych użytkownika</h2>
        <p>Nie można załadować czatu bez danych użytkownika.</p>
        <button onClick={() => window.location.reload()}>
          Odśwież stronę
        </button>
      </ErrorContainer>
    );
  }

  // Error state for missing room
  if (!room) {
    return (
      <ErrorContainer>
        <h2>Błąd: Brak danych pokoju</h2>
        <p>Nie można załadować czatu bez danych pokoju.</p>
        <button onClick={onLeaveRoom}>
          Powrót do listy pokoi
        </button>
      </ErrorContainer>
    );
  }

  // Loading state
  if (loading) {
    return (
      <LoadingContainer>
        <div>⏳</div>
        <h2>Ładowanie pokoju...</h2>
        <p>Przygotowywanie czatu...</p>
      </LoadingContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorContainer>
        <h2>Błąd ładowania pokoju</h2>
        <p>{error}</p>
        <button onClick={onLeaveRoom}>
          Powrót do listy pokoi
        </button>
      </ErrorContainer>
    );
  }

  // Sprawdź ponownie czy roomInfo jest prawidłowe
  const currentRoomInfo = roomInfo || {
    id: room?.id || 'unknown',
    name: room?.name || room?.id || 'Unknown Room',
    userCount: 0,
    messageCount: messages.length
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <RoomInfo>
          <h2>#{currentRoomInfo.name}</h2>
          <p>
            {currentRoomInfo.messageCount || messages.length} wiadomości • {' '}
            {currentRoomInfo.userCount || 1} użytkowników
          </p>
        </RoomInfo>
        <OnlineUsers>
          <span>Pokój ID: {currentRoomInfo.id}</span>
        </OnlineUsers>
      </ChatHeader>

      <RedisInfo>
        <h4>🔧 Redis Operations w tym komponencie:</h4>
        <ul>
          <li><code>LIST</code> - Wiadomości jako kolejka FIFO: <code>LPUSH chat:room:{currentRoomInfo.id}:messages</code></li>
          <li><code>SET</code> - Użytkownicy online: <code>SADD chat:room:{currentRoomInfo.id}:users {user.id}</code></li>
          <li><code>HASH</code> - Metadane pokoju: <code>HGETALL chat:room:{currentRoomInfo.id}</code></li>
          <li><code>STRING</code> - Liczniki: <code>INCR chat:room:{currentRoomInfo.id}:message_count</code></li>
          <li><code>SORTED SET</code> - Ranking aktywności: <code>ZADD chat:users:ranking 1 {user.id}</code></li>
        </ul>
      </RedisInfo>

      <MessagesContainer>
        {messages.map((message) => {
          if (!message || !message.id) return null;

          if (message.type === 'system') {
            return (
              <SystemMessage key={message.id}>
                {message.message}
              </SystemMessage>
            );
          }

          const isOwn = message.userId === user.id;
          
          return (
            <Message key={message.id} isOwn={isOwn}>
              <MessageBubble isOwn={isOwn}>
                {message.message}
              </MessageBubble>
              <MessageMeta>
                <span>{message.username || 'Unknown User'}</span>
                <span>{formatTime(message.timestamp)}</span>
                <span>{formatDate(message.timestamp)}</span>
              </MessageMeta>
            </Message>
          );
        })}
        
        <TypingIndicator>
          {typingUsers.length > 0 && (
            <span>
              {typingUsers.map(u => u.username).join(', ')} 
              {typingUsers.length === 1 ? ' pisze...' : ' piszą...'}
            </span>
          )}
        </TypingIndicator>
        
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <MessageInputContainer>
        <MessageInputForm onSubmit={handleSendMessage}>
          <MessageInput
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Napisz wiadomość..."
            maxLength={500}
          />
          <SendButton type="submit" disabled={!newMessage.trim()}>
            Wyślij
          </SendButton>
        </MessageInputForm>
      </MessageInputContainer>
    </ChatContainer>
  );
};

export default ChatRoom;