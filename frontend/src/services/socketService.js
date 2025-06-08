import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import axios from 'axios';

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socket.on('connect', () => {
      console.log('Connected to server');
      toast.success('Połączono z serwerem');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      toast.error('Rozłączono z serwerem');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      toast.error('Błąd połączenia z serwerem');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Błąd połączenia');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      toast.success('Połączono ponownie');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Attempting to reconnect...', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect');
      toast.error('Nie udało się połączyć ponownie');
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const isConnected = () => {
  return socket && socket.connected;
};

export const joinRoom = (roomData) => {
  if (socket && socket.connected) {
    socket.emit('join-room', roomData);
  } else {
    console.warn('Socket not connected, cannot join room');
    toast.error('Brak połączenia z serwerem');
  }
};

export const leaveRoom = (roomData) => {
  if (socket && socket.connected) {
    socket.emit('leave-room', roomData);
  } else {
    console.warn('Socket not connected, cannot leave room');
  }
};

export const sendMessage = (messageData) => {
  if (socket && socket.connected) {
    socket.emit('send-message', messageData);
  } else {
    console.warn('Socket not connected, cannot send message');
    toast.error('Brak połączenia - wiadomość nie została wysłana');
  }
};

export const startTyping = (typingData) => {
  if (socket && socket.connected) {
    socket.emit('typing-start', typingData);
  }
};

export const stopTyping = (typingData) => {
  if (socket && socket.connected) {
    socket.emit('typing-stop', typingData);
  }
};

export const onNewMessage = (callback) => {
  if (socket) {
    socket.off('new-message');
    socket.on('new-message', callback);
  }
};

export const onUserJoined = (callback) => {
  if (socket) {
    socket.off('user-joined');
    socket.on('user-joined', callback);
  }
};

export const onUserLeft = (callback) => {
  if (socket) {
    socket.off('user-left');
    socket.on('user-left', callback);
  }
};

export const onRoomInfo = (callback) => {
  if (socket) {
    socket.off('room-info');
    socket.on('room-info', callback);
  }
};

export const onMessagesHistory = (callback) => {
  if (socket) {
    socket.off('messages-history');
    socket.on('messages-history', callback);
  }
};

export const onUserTyping = (callback) => {
  if (socket) {
    socket.off('user-typing');
    socket.on('user-typing', callback);
  }
};

export const onUserStoppedTyping = (callback) => {
  if (socket) {
    socket.off('user-stopped-typing');
    socket.on('user-stopped-typing', callback);
  }
};

// Remove specific event listeners
export const offNewMessage = () => {
  if (socket) {
    socket.off('new-message');
  }
};

export const offUserJoined = () => {
  if (socket) {
    socket.off('user-joined');
  }
};

export const offUserLeft = () => {
  if (socket) {
    socket.off('user-left');
  }
};

export const offRoomInfo = () => {
  if (socket) {
    socket.off('room-info');
  }
};

export const offMessagesHistory = () => {
  if (socket) {
    socket.off('messages-history');
  }
};

export const offUserTyping = () => {
  if (socket) {
    socket.off('user-typing');
  }
};

export const offUserStoppedTyping = () => {
  if (socket) {
    socket.off('user-stopped-typing');
  }
};

export const removeAllListeners = () => {
  if (socket) {
    socket.removeAllListeners();
  }
};

export const emitCustomEvent = (eventName, data) => {
  if (socket && socket.connected) {
    socket.emit(eventName, data);
  } else {
    console.warn(`Socket not connected, cannot emit ${eventName}`);
  }
};

export const onCustomEvent = (eventName, callback) => {
  if (socket) {
    socket.off(eventName);
    socket.on(eventName, callback);
  }
};

export const offCustomEvent = (eventName) => {
  if (socket) {
    socket.off(eventName);
  }
};

export const waitForConnection = (timeout = 5000) => {
  return new Promise((resolve, reject) => {
    if (socket && socket.connected) {
      resolve(socket);
      return;
    }

    if (!socket) {
      connectSocket();
    }    const timer = setTimeout(() => {
      reject(new Error('Przekroczono czas połączenia'));
    }, timeout);

    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

export const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await waitForConnection();
      return await operation();
    } catch (error) {
      console.warn(`Operacja nieudana, próba ${i + 1}/${maxRetries}:`, error);
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

export const sendMessageWithRetry = async (messageData) => {
  return withRetry(() => {
    return new Promise((resolve, reject) => {
      if (!socket || !socket.connected) {
        reject(new Error('Socket nie jest połączony'));
        return;
      }

      socket.emit('send-message', messageData);
      
      const timeout = setTimeout(() => {
        reject(new Error('Przekroczono czas wysyłania wiadomości'));
      }, 5000);

      clearTimeout(timeout);
      resolve();
    });
  });
};

export const joinRoomWithRetry = async (roomData) => {
  return withRetry(() => {
    return new Promise((resolve, reject) => {
      if (!socket || !socket.connected) {
        reject(new Error('Socket nie jest połączony'));
        return;
      }

      socket.emit('join-room', roomData);
      
      const timeout = setTimeout(() => {
        socket.off('room-info', onRoomInfo);
        reject(new Error('Przekroczono czas dołączania do pokoju'));
      }, 10000);

      const onRoomInfo = (info) => {
        clearTimeout(timeout);
        socket.off('room-info', onRoomInfo);
        resolve(info);
      };

      socket.on('room-info', onRoomInfo);
    });
  });
};

export const fetchLeaderboard = async (limit = 10) => {
  const response = await axios.get('/api/chat/leaderboard?limit=' + limit);
  return response.data.data;
};

export const updateUserScore = async (userId, score, username) => {
  if (score === '+1') {
    await axios.post('/api/chat/leaderboard', { userId, score: '+1', username });
  } else {
    await axios.post('/api/chat/leaderboard', { userId, score, username });
  }
};

export const getConnectionState = () => {
  if (!socket) {
    return 'disconnected';
  }
  
  if (socket.connected) {
    return 'connected';
  }
  
  if (socket.connecting) {
    return 'connecting';
  }
  
  return 'disconnected';
};

export const getSocketInfo = () => {
  if (!socket) {
    return { status: 'nie_zainicjalizowany' };
  }

  return {
    id: socket.id,
    connected: socket.connected,
    disconnected: socket.disconnected,
    url: socket.io.uri,
    transport: socket.io.engine?.transport?.name,
    readyState: socket.io.engine?.readyState,
    ping: socket.io.engine?.ping,
    listeners: Object.keys(socket._callbacks || {}),
    status: getConnectionState()
  };
};


export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  isConnected,
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
  removeAllListeners,
  getConnectionState,
  getSocketInfo,
  sendMessageWithRetry,
  joinRoomWithRetry,
  fetchLeaderboard,
  updateUserScore
};