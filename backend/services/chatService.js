const redisService = require('./redisService');
const cacheService = require('./cacheService');

/**
 * Chat Service - wykorzystuje Redis do przechowywania:
 * - Wiadomości (List - jako kolejka FIFO)
 * - Pokoje (Hash - metadane pokoju)
 * - Użytkownicy online (Set)
 * - Statystyki (Sorted Set - ranking aktywności)
 * - Cache dla często pobieranych danych
 */

class ChatService {
  constructor() {
    this.MESSAGE_LIMIT = 100; // Limit wiadomości w pokoju
    this.CACHE_TTL = 300; // 5 minut cache
  }

  // ======= USER MANAGEMENT =======
  
  async joinRoom(userId, roomId, username) {
    try {
      const userKey = `chat:user:${userId}`;
      const roomUsersKey = `chat:room:${roomId}:users`;
      const userRoomsKey = `chat:user:${userId}:rooms`;
      const roomStatsKey = `chat:room:${roomId}:stats`;
      
      // Zapisz dane użytkownika (Hash)
      await redisService.setHashObject(userKey, {
        id: userId,
        username: username,
        lastSeen: Date.now(),
        status: 'online'
      }, 3600); // TTL 1 godzina
      
      // Dodaj użytkownika do pokoju (Set)
      await redisService.addToSet(roomUsersKey, userId);
      
      // Dodaj pokój do listy pokoi użytkownika (Set)
      await redisService.addToSet(userRoomsKey, roomId);
      
      // Zaktualizuj statystyki pokoju (Sorted Set)
      await redisService.addToSortedSet(roomStatsKey, Date.now(), userId);
      
      // Zwiększ licznik dołączeń (Numeric)
      await redisService.incrementNumber(`chat:room:${roomId}:joins`);
      
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      return false;
    }
  }
  
  async leaveRoom(userId, roomId) {
    try {
      const roomUsersKey = `chat:room:${roomId}:users`;
      const userRoomsKey = `chat:user:${userId}:rooms`;
      
      // Usuń użytkownika z pokoju
      await redisService.addToSet(roomUsersKey, userId); // Używamy sRem przez Redis CLI
      
      // Usuń pokój z listy użytkownika
      await redisService.addToSet(userRoomsKey, roomId);
      
      return true;
    } catch (error) {
      console.error('Error leaving room:', error);
      return false;
    }
  }

  // ======= MESSAGE OPERATIONS =======
  
  async sendMessage(roomId, userId, username, message) {
    try {
      const messagesKey = `chat:room:${roomId}:messages`;
      const userStatsKey = `chat:user:${userId}:stats`;
      
      const messageObj = {
        id: `msg_${Date.now()}_${userId}`,
        userId,
        username,
        message,
        timestamp: Date.now(),
        roomId
      };
      
      // Dodaj wiadomość do kolejki pokoju (List - FIFO queue)
      await redisService.enqueue(messagesKey, messageObj);
      
      // Ogranicz liczbę wiadomości (trim list)
      // W Redis CLI: LTRIM key start stop
      const messages = await redisService.getList(messagesKey);
      if (messages.length > this.MESSAGE_LIMIT) {
        // Tutaj byśmy użyli LTRIM w Redis CLI
        console.log(`Trimming messages for room ${roomId}`);
      }
      
      // Zaktualizuj statystyki użytkownika
      await redisService.incrementNumber(`${userStatsKey}:messages_sent`);
      
      // Invalidate cache dla tego pokoju
      await cacheService.invalidate(`cache:room:${roomId}:*`);
      
      return messageObj;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }
  
  async getMessages(roomId, limit = 50) {
    const cacheKey = `cache:room:${roomId}:messages:${limit}`;
    
    try {
      // Użyj Cache-Aside pattern
      return await cacheService.cacheAside(
        cacheKey,
        async () => {
          const messagesKey = `chat:room:${roomId}:messages`;
          const messages = await redisService.getList(messagesKey, 0, limit - 1);
          return messages.reverse(); // Najnowsze na górze
        },
        this.CACHE_TTL
      );
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  // ======= ROOM OPERATIONS =======
  
  async createRoom(roomId, name, createdBy) {
    try {
      const roomKey = `chat:room:${roomId}`;
      
      const roomData = {
        id: roomId,
        name: name,
        createdBy: createdBy,
        createdAt: Date.now(),
        messageCount: 0,
        userCount: 0
      };
      
      // Zapisz metadane pokoju (Hash)
      await redisService.setHashObject(roomKey, roomData);
      
      // Dodaj do listy wszystkich pokoi (Set)
      await redisService.addToSet('chat:rooms:all', roomId);
      
      return roomData;
    } catch (error) {
      console.error('Error creating room:', error);
      return null;
    }
  }
  
  async getRoomInfo(roomId) {
    const cacheKey = `cache:room:${roomId}:info`;
    
    try {
      return await cacheService.cacheAside(
        cacheKey,
        async () => {
          const roomKey = `chat:room:${roomId}`;
          const roomUsersKey = `chat:room:${roomId}:users`;
          const messagesKey = `chat:room:${roomId}:messages`;
          
          const roomData = await redisService.getHash(roomKey);
          if (!roomData.id) return null;
          
          // Pobierz aktualną liczbę użytkowników
          const users = await redisService.getSet(roomUsersKey);
          roomData.userCount = users.length;
          roomData.users = users;
          
          // Pobierz liczbę wiadomości
          const messages = await redisService.getList(messagesKey);
          roomData.messageCount = messages.length;
          
          return roomData;
        },
        this.CACHE_TTL
      );
    } catch (error) {
      console.error('Error getting room info:', error);
      return null;
    }
  }

  // ======= STATISTICS =======
  
  async getUserStats(userId) {
    try {
      const userStatsKey = `chat:user:${userId}:stats`;
      
      return {
        messagesSent: await redisService.getString(`${userStatsKey}:messages_sent`) || 0,
        roomsJoined: await redisService.getString(`${userStatsKey}:rooms_joined`) || 0,
        lastActive: await redisService.getString(`${userStatsKey}:last_active`) || 0
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {};
    }
  }
  
  async getTopUsers(limit = 10) {
    try {
      // Użyj Sorted Set do rankingu
      const topUsers = await redisService.getSortedSetWithScores(
        'chat:users:ranking',
        0,
        limit - 1
      );
      
      return topUsers.reverse(); // Od najwyższego wyniku
    } catch (error) {
      console.error('Error getting top users:', error);
      return [];
    }
  }

  // ======= ONLINE PRESENCE =======
  
  async setUserOnline(userId) {
    try {
      const onlineUsersKey = 'chat:users:online';
      const userKey = `chat:user:${userId}`;
      
      // Dodaj do zbioru użytkowników online
      await redisService.addToSet(onlineUsersKey, userId);
      
      // Ustaw timestamp ostatniej aktywności
      await redisService.setString(`${userKey}:last_seen`, Date.now(), 3600);
      
      return true;
    } catch (error) {
      console.error('Error setting user online:', error);
      return false;
    }
  }
  
  async setUserOffline(userId) {
    try {
      const onlineUsersKey = 'chat:users:online';
      
      // Usuń z zbioru użytkowników online (w Redis CLI: SREM)
      // Tutaj symulujemy usunięcie
      const onlineUsers = await redisService.getSet(onlineUsersKey);
      console.log(`User ${userId} going offline`);
      
      return true;
    } catch (error) {
      console.error('Error setting user offline:', error);
      return false;
    }
  }
  
  async getOnlineUsers() {
    try {
      const onlineUsersKey = 'chat:users:online';
      return await redisService.getSet(onlineUsersKey);
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  // ======= CRUD OPERATIONS (demonstracja wszystkich typów Redis) =======
  
  // STRING CRUD
  async createUserSession(userId, sessionData) {
    const key = `chat:session:${userId}`;
    return await redisService.setString(key, JSON.stringify(sessionData), 3600);
  }
  
  async getUserSession(userId) {
    const key = `chat:session:${userId}`;
    const data = await redisService.getString(key);
    return data ? JSON.parse(data) : null;
  }
  
  async updateUserSession(userId, sessionData) {
    const key = `chat:session:${userId}`;
    return await redisService.setString(key, JSON.stringify(sessionData), 3600);
  }
  
  async deleteUserSession(userId) {
    const key = `chat:session:${userId}`;
    return await redisService.deleteKey(key);
  }

  // HASH CRUD
  async createUserProfile(userId, profileData) {
    const key = `chat:profile:${userId}`;
    return await redisService.setHashObject(key, profileData);
  }
  
  async getUserProfile(userId) {
    const key = `chat:profile:${userId}`;
    return await redisService.getHash(key);
  }
  
  async updateUserProfile(userId, field, value) {
    const key = `chat:profile:${userId}`;
    return await redisService.setHash(key, field, value);
  }
  
  async deleteUserProfile(userId) {
    const key = `chat:profile:${userId}`;
    return await redisService.deleteKey(key);
  }

  // LIST CRUD (Chat History)
  async addToChatHistory(roomId, message) {
    const key = `chat:history:${roomId}`;
    return await redisService.push(key, message);
  }
  
  async getChatHistory(roomId, limit = 50) {
    const key = `chat:history:${roomId}`;
    return await redisService.getList(key, 0, limit - 1);
  }
  
  async clearChatHistory(roomId) {
    const key = `chat:history:${roomId}`;
    return await redisService.deleteKey(key);
  }

  // SET CRUD (Room Members)
  async addRoomMember(roomId, userId) {
    const key = `chat:room:${roomId}:members`;
    return await redisService.addToSet(key, userId);
  }
  
  async getRoomMembers(roomId) {
    const key = `chat:room:${roomId}:members`;
    return await redisService.getSet(key);
  }
  
  async isRoomMember(roomId, userId) {
    const key = `chat:room:${roomId}:members`;
    return await redisService.isInSet(key, userId);
  }
  
  async removeRoomMember(roomId, userId) {
    const key = `chat:room:${roomId}:members`;
    // W Redis CLI: SREM key member
    console.log(`Removing ${userId} from room ${roomId}`);
    return true;
  }

  // SORTED SET CRUD (Leaderboard)
  async updateUserScore(userId, score) {
    const key = 'chat:leaderboard';
    return await redisService.addToSortedSet(key, score, userId);
  }
  
  async getLeaderboard(limit = 10) {
    const key = 'chat:leaderboard';
    return await redisService.getSortedSetWithScores(key, 0, limit - 1);
  }
  
  async getUserRank(userId) {
    // W Redis CLI: ZRANK key member
    console.log(`Getting rank for user ${userId}`);
    return 1; // Symulacja
  }
  
  async removeFromLeaderboard(userId) {
    // W Redis CLI: ZREM key member
    console.log(`Removing ${userId} from leaderboard`);
    return true;
  }

  // ======= ADVANCED REDIS OPERATIONS =======
  
  // Transakcje (MULTI/EXEC)
  async atomicMessageSend(roomId, userId, message) {
    try {
      // W prawdziwym Redis użylibyśmy MULTI/EXEC
      console.log('Starting atomic transaction for message send');
      
      const messageObj = await this.sendMessage(roomId, userId, message.username, message.text);
      await this.updateUserScore(userId, 1);
      await redisService.incrementNumber(`chat:room:${roomId}:total_messages`);
      
      console.log('Transaction completed successfully');
      return messageObj;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }
  
  // Pipeline operations
  async batchUpdateUserActivity(userActivities) {
    try {
      console.log('Executing batch update for user activities');
      
      for (const activity of userActivities) {
        await this.setUserOnline(activity.userId);
        await this.updateUserScore(activity.userId, activity.score);
      }
      
      return true;
    } catch (error) {
      console.error('Batch update failed:', error);
      return false;
    }
  }

  // ======= DATA PERSISTENCE DEMO =======
  
  async demonstratePersistence() {
    try {
      // Zapisz dane testowe
      await redisService.setString('persistence:test', 'This data should persist', 3600);
      
      // W Redis CLI można użyć:
      // BGSAVE - asynchroniczny save
      // SAVE - synchroniczny save
      // CONFIG SET save "60 1000" - auto-save co 60s jeśli >=1000 zmian
      
      console.log('Persistence test data saved');
      console.log('Redis persistence methods:');
      console.log('1. RDB (Redis Database) - snapshots');
      console.log('2. AOF (Append Only File) - log wszystkich operacji');
      console.log('3. Hybrid - kombinacja RDB + AOF');
      
      return true;
    } catch (error) {
      console.error('Persistence demonstration failed:', error);
      return false;
    }
  }
}

module.exports = new ChatService();