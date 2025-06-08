require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import services
const { connectRedis, pubSubClient } = require('./config/redis');
const chatService = require('./services/chatService');
const redisService = require('./services/redisService');
const cacheService = require('./services/cacheService');

// Import routes
const chatRoutes = require('./routes/chatRoutes');
const redisRoutes = require('./routes/redisRoutes');
const cacheRoutes = require('./routes/cacheRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/redis', redisRoutes);
app.use('/api/cache', cacheRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join room
  socket.on('join-room', async (data) => {
    const { roomId, userId, username } = data;
    
    try {
      // Join socket room
      socket.join(roomId);
      
      // Update Redis
      await chatService.joinRoom(userId, roomId, username);
      await chatService.setUserOnline(userId);
      
      // Notify room
      socket.to(roomId).emit('user-joined', {
        userId,
        username,
        message: `${username} dołączył do pokoju`
      });
      
      // Send room info
      const roomInfo = await chatService.getRoomInfo(roomId);
      socket.emit('room-info', roomInfo);
      
      // Send recent messages
      const messages = await chatService.getMessages(roomId, 50);
      socket.emit('messages-history', messages);
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Nie udało się dołączyć do pokoju' });
    }
  });
  
  // Send message
  socket.on('send-message', async (data) => {
    const { roomId, userId, username, message } = data;
    
    try {
      // Save message to Redis
      const messageObj = await chatService.sendMessage(roomId, userId, username, message);
      
      if (messageObj) {
        // Broadcast to room
        io.to(roomId).emit('new-message', messageObj);
        
        // Update user activity
        await chatService.setUserOnline(userId);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Nie udało się wysłać wiadomości' });
    }
  });
  
  // Leave room
  socket.on('leave-room', async (data) => {
    const { roomId, userId, username } = data;
    
    try {
      socket.leave(roomId);
      await chatService.leaveRoom(userId, roomId);
      
      socket.to(roomId).emit('user-left', {
        userId,
        username,
        message: `${username} opuścił pokój`
      });
      
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });
  
  // Typing indicator
  socket.on('typing-start', (data) => {
    socket.to(data.roomId).emit('user-typing', {
      userId: data.userId,
      username: data.username
    });
  });
  
  socket.on('typing-stop', (data) => {
    socket.to(data.roomId).emit('user-stopped-typing', {
      userId: data.userId
    });
  });
  
  // Disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    // W prawdziwej aplikacji należałoby zapisać userId w socket session
    // i zaktualizować status offline
  });
});

// Redis Pub/Sub for multi-server scaling
pubSubClient.subscribe('chat:broadcast', (message) => {
  const data = JSON.parse(message);
  io.to(data.roomId).emit(data.event, data.payload);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test Redis connection
    await redisService.setString('health:check', 'ok', 10);
    const test = await redisService.getString('health:check');
    
    res.json({
      status: 'OK',
      redis: test === 'ok' ? 'Connected' : 'Error',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      redis: 'Disconnected',
      error: error.message
    });
  }
});

// Redis CLI Examples endpoint
app.get('/redis-examples', (req, res) => {
  res.json({
    title: 'Redis CLI Examples for Chat Application',
    examples: {
      'String Operations': {
        'Set session': 'SET chat:session:user123 "{\\"userId\\":\\"123\\",\\"token\\":\\"abc\\"}" EX 3600',
        'Get session': 'GET chat:session:user123',
        'Increment counter': 'INCR chat:room:general:message_count',
        'Set with TTL': 'SETEX chat:user:123:last_seen 3600 1640995200'
      },
      'Hash Operations': {
        'Set user profile': 'HSET chat:user:123 username "john" email "john@example.com" status "online"',
        'Get user profile': 'HGETALL chat:user:123',
        'Get specific field': 'HGET chat:user:123 username',
        'Check field exists': 'HEXISTS chat:user:123 email'
      },
      'List Operations (Queue/Stack)': {
        'Add message (queue)': 'LPUSH chat:room:general:messages "{\\"user\\":\\"john\\",\\"text\\":\\"hello\\"}"',
        'Get messages': 'LRANGE chat:room:general:messages 0 -1',
        'Pop message (FIFO)': 'RPOP chat:room:general:messages',
        'Trim old messages': 'LTRIM chat:room:general:messages 0 99'
      },
      'Set Operations': {
        'Add user to room': 'SADD chat:room:general:users user123',
        'Get room users': 'SMEMBERS chat:room:general:users',
        'Check membership': 'SISMEMBER chat:room:general:users user123',
        'Remove user': 'SREM chat:room:general:users user123'
      },
      'Sorted Set Operations': {
        'Add to leaderboard': 'ZADD chat:leaderboard 100 user123',
        'Get top users': 'ZREVRANGE chat:leaderboard 0 9 WITHSCORES',
        'Get user rank': 'ZRANK chat:leaderboard user123',
        'Increment score': 'ZINCRBY chat:leaderboard 10 user123'
      },
      'Key Management': {
        'Set TTL': 'EXPIRE chat:session:user123 3600',
        'Check TTL': 'TTL chat:session:user123',
        'Find keys': 'KEYS chat:user:*',
        'Delete key': 'DEL chat:session:user123'
      },
      'Advanced Operations': {
        'Transaction': 'MULTI\\nINCR chat:stats:messages\\nSADD chat:active:users user123\\nEXEC',
        'Pipeline': 'Pipeline multiple commands for better performance',
        'Pub/Sub': 'PUBLISH chat:room:general "{\\"type\\":\\"message\\",\\"data\\":\\"hello\\"}"',
        'Subscribe': 'SUBSCRIBE chat:room:general'
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    
    // Initialize demo data
    await initializeDemoData();
    
    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📝 Redis examples: http://localhost:${PORT}/redis-examples`);
      console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
      console.log(`🔧 Redis API: http://localhost:${PORT}/api/redis`);
      console.log(`⚡ Cache API: http://localhost:${PORT}/api/cache`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize demo data
async function initializeDemoData() {
  try {
    console.log('Initializing demo data...');
    
    // Create demo rooms
    await chatService.createRoom('general', 'Pokój Główny', 'system');
    await chatService.createRoom('random', 'Losowe', 'system');
    
    // Add some demo messages
    
    // Demonstrate different Redis data types
    await redisService.setString('chat:stats:total_users', '0');
    await redisService.setString('chat:stats:total_messages', '0');
    
    // Demonstrate numeric operations
    await redisService.incrementNumber('chat:stats:server_starts');
    
    console.log('✅ Demo data initialized');
    
  } catch (error) {
    console.error('Error initializing demo data:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();