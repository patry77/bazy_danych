const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');

// ======= ROOM OPERATIONS =======

// Get all rooms
router.get('/rooms', async (req, res) => {
  try {
    // Pobierz wszystkie roomId z Redis Set
    const roomIds = await chatService.getAllRoomIds();
    const rooms = [];
    
    for (const roomId of roomIds) {
      const roomInfo = await chatService.getRoomInfo(roomId);
      if (roomInfo) {
        rooms.push(roomInfo);
      }
    }
    
    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get room info
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const roomInfo = await chatService.getRoomInfo(roomId);
    
    if (!roomInfo) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    res.json({
      success: true,
      data: roomInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create room
router.post('/rooms', async (req, res) => {
  try {
    const { roomId, name, createdBy } = req.body;
    
    if (!roomId || !name) {
      return res.status(400).json({
        success: false,
        error: 'Room ID and name are required'
      });
    }
    
    const room = await chatService.createRoom(roomId, name, createdBy || 'anonymous');
    
    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======= MESSAGE OPERATIONS =======

// Get messages for room
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50 } = req.query;
    
    const messages = await chatService.getMessages(roomId, parseInt(limit));
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send message (REST endpoint - głównie do testów)
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, username, message } = req.body;
    
    if (!userId || !username || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    
    const messageObj = await chatService.sendMessage(roomId, userId, username, message);
    
    if (!messageObj) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }
    
    res.status(201).json({
      success: true,
      data: messageObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======= USER OPERATIONS =======

// Get user stats
router.get('/users/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await chatService.getUserStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user profile
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await chatService.getUserProfile(userId);
    
    if (!profile || !profile.id) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create/Update user profile
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileData = req.body;
    
    profileData.id = userId;
    profileData.updatedAt = Date.now();
    
    const success = await chatService.createUserProfile(userId, profileData);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
    
    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get online users
router.get('/users/online', async (req, res) => {
  try {
    const onlineUsers = await chatService.getOnlineUsers();
    
    res.json({
      success: true,
      data: onlineUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======= STATISTICS =======

// Get top users
router.get('/stats/top-users', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topUsers = await chatService.getTopUsers(parseInt(limit));
    
    res.json({
      success: true,
      data: topUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get leaderboard
router.get('/stats/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const leaderboard = await chatService.getLeaderboard(parseInt(limit));
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======= CRUD DEMONSTRATIONS =======

// String CRUD
router.post('/demo/session', async (req, res) => {
  try {
    const { userId, sessionData } = req.body;
    const success = await chatService.createUserSession(userId, sessionData);
    
    res.json({
      success,
      message: 'Session created using Redis STRING type',
      redisCommand: `SET chat:session:${userId} "${JSON.stringify(sessionData)}" EX 3600`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/demo/session/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const session = await chatService.getUserSession(userId);
    
    res.json({
      success: true,
      data: session,
      message: 'Session retrieved using Redis STRING type',
      redisCommand: `GET chat:session:${userId}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Hash CRUD
router.post('/demo/profile', async (req, res) => {
  try {
    const { userId, profileData } = req.body;
    const success = await chatService.createUserProfile(userId, profileData);
    
    res.json({
      success,
      message: 'Profile created using Redis HASH type',
      redisCommand: `HSET chat:profile:${userId} ${Object.entries(profileData).flat().join(' ')}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List CRUD
router.post('/demo/history/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    
    const success = await chatService.addToChatHistory(roomId, message);
    
    res.json({
      success,
      message: 'Message added to history using Redis LIST type',
      redisCommand: `LPUSH chat:history:${roomId} "${JSON.stringify(message)}"`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/demo/history/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 10 } = req.query;
    
    const history = await chatService.getChatHistory(roomId, parseInt(limit));
    
    res.json({
      success: true,
      data: history,
      message: 'History retrieved using Redis LIST type',
      redisCommand: `LRANGE chat:history:${roomId} 0 ${limit - 1}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set CRUD
router.post('/demo/members/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    const success = await chatService.addRoomMember(roomId, userId);
    
    res.json({
      success,
      message: 'Member added using Redis SET type',
      redisCommand: `SADD chat:room:${roomId}:members ${userId}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/demo/members/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const members = await chatService.getRoomMembers(roomId);
    
    res.json({
      success: true,
      data: members,
      message: 'Members retrieved using Redis SET type',
      redisCommand: `SMEMBERS chat:room:${roomId}:members`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sorted Set CRUD
router.post('/demo/leaderboard', async (req, res) => {
  try {
    const { userId, score } = req.body;
    const success = await chatService.updateUserScore(userId, score);
    
    res.json({
      success,
      message: 'Score updated using Redis SORTED SET type',
      redisCommand: `ZADD chat:leaderboard ${score} ${userId}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= PERSISTENCE DEMONSTRATION =======
router.get('/demo/persistence', async (req, res) => {
  try {
    const success = await chatService.demonstratePersistence();
    
    res.json({
      success,
      message: 'Redis persistence demonstration',
      persistenceMethods: {
        RDB: {
          description: 'Redis Database - Point-in-time snapshots',
          commands: ['SAVE', 'BGSAVE'],
          config: 'CONFIG SET save "60 1000"'
        },
        AOF: {
          description: 'Append Only File - Log of all operations',
          commands: ['CONFIG SET appendonly yes'],
          config: 'CONFIG SET appendfsync everysec'
        },
        Hybrid: {
          description: 'Combination of RDB + AOF',
          benefit: 'Fast recovery with data safety'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DEBUG: Get raw room IDs from Redis
router.get('/debug/rooms/raw', async (req, res) => {
  try {
    const roomIds = await chatService.getAllRoomIds();
    res.json({
      success: true,
      roomIds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======= LEADERBOARD ENDPOINTS =======
// Dodaj/aktualizuj wynik użytkownika
router.post('/leaderboard', async (req, res) => {
  try {
    const { userId, score, username } = req.body;
    if (!userId || typeof score === 'undefined') {
      return res.status(400).json({ success: false, error: 'userId and score required' });
    }
    // Jeśli score === '+1', inkrementuj wynik w Redis
    if (score === '+1') {
      // Pobierz aktualny username
      let uname = username;
      if (!uname) {
        const profile = await chatService.getUserProfile(userId);
        uname = profile && profile.username ? profile.username : userId;
      }
      await chatService.updateUserScore(userId, '+1', uname);
    } else {
      await chatService.updateUserScore(userId, score, username);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pobierz top N użytkowników
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const leaderboard = await chatService.getLeaderboard(Number(limit));
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pobierz pozycję użytkownika
router.get('/leaderboard/:userId/rank', async (req, res) => {
  try {
    const { userId } = req.params;
    const rank = await chatService.getUserRank(userId);
    res.json({ success: true, rank });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Usuń użytkownika z rankingu
router.delete('/leaderboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await chatService.removeFromLeaderboard(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;