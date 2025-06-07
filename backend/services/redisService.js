const { redisClient, cacheClient } = require('../config/redis');

class RedisService {
  // ======= STRING OPERATIONS =======
  
  /**
   * Klucze w Redis - demonstracja dobrych praktyk nazewnictwa
   * Używamy separatora ':' do hierarchii kluczy
   * Format: aplikacja:typ:identyfikator:atrybyt
   */
  
  // Ustaw wartość string z TTL
  async setString(key, value, ttl = null) {
    try {
      if (ttl) {
        await redisClient.setEx(key, ttl, value);
      } else {
        await redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Error setting string:', error);
      return false;
    }
  }

  // Pobierz wartość string
  async getString(key) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error('Error getting string:', error);
      return null;
    }
  }

  // Operacje numeryczne - Redis przechowuje liczby jako stringi
  async incrementNumber(key, amount = 1) {
    try {
      return await redisClient.incrBy(key, amount);
    } catch (error) {
      console.error('Error incrementing:', error);
      return null;
    }
  }

  async decrementNumber(key, amount = 1) {
    try {
      return await redisClient.decrBy(key, amount);
    } catch (error) {
      console.error('Error decrementing:', error);
      return null;
    }
  }

  // ======= HASH OPERATIONS =======
  
  // Ustaw hash field
  async setHash(key, field, value) {
    try {
      await redisClient.hSet(key, field, value);
      return true;
    } catch (error) {
      console.error('Error setting hash:', error);
      return false;
    }
  }

  // Ustaw cały hash object
  async setHashObject(key, obj, ttl = null) {
    try {
      await redisClient.hSet(key, obj);
      if (ttl) {
        await redisClient.expire(key, ttl);
      }
      return true;
    } catch (error) {
      console.error('Error setting hash object:', error);
      return false;
    }
  }

  // Pobierz cały hash
  async getHash(key) {
    try {
      return await redisClient.hGetAll(key);
    } catch (error) {
      console.error('Error getting hash:', error);
      return null;
    }
  }

  // Pobierz field z hash
  async getHashField(key, field) {
    try {
      return await redisClient.hGet(key, field);
    } catch (error) {
      console.error('Error getting hash field:', error);
      return null;
    }
  }

  // ======= LIST OPERATIONS (Queue/Stack) =======
  
  // QUEUE (FIFO) - push left, pop right
  async enqueue(key, value) {
    try {
      return await redisClient.lPush(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error enqueuing:', error);
      return null;
    }
  }

  async dequeue(key) {
    try {
      const value = await redisClient.rPop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error dequeuing:', error);
      return null;
    }
  }

  // STACK (LIFO) - push left, pop left
  async push(key, value) {
    try {
      return await redisClient.lPush(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error pushing:', error);
      return null;
    }
  }

  async pop(key) {
    try {
      const value = await redisClient.lPop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error popping:', error);
      return null;
    }
  }

  // Pobierz elementy z listy
  async getList(key, start = 0, end = -1) {
    try {
      const values = await redisClient.lRange(key, start, end);
      return values.map(v => {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      });
    } catch (error) {
      console.error('Error getting list:', error);
      return [];
    }
  }

  // ======= SET OPERATIONS =======
  
  // Dodaj do zbioru
  async addToSet(key, ...values) {
    try {
      return await redisClient.sAdd(key, ...values);
    } catch (error) {
      console.error('Error adding to set:', error);
      return null;
    }
  }

  // Pobierz wszystkie elementy zbioru
  async getSet(key) {
    try {
      return await redisClient.sMembers(key);
    } catch (error) {
      console.error('Error getting set:', error);
      return [];
    }
  }

  // Sprawdź czy element jest w zbiorze
  async isInSet(key, value) {
    try {
      return await redisClient.sIsMember(key, value);
    } catch (error) {
      console.error('Error checking set membership:', error);
      return false;
    }
  }

  // ======= SORTED SET OPERATIONS =======
  
  // Dodaj do sorted set
  async addToSortedSet(key, score, value) {
    try {
      return await redisClient.zAdd(key, { score, value });
    } catch (error) {
      console.error('Error adding to sorted set:', error);
      return null;
    }
  }

  // Pobierz z sorted set (z wynikami)
  async getSortedSetWithScores(key, start = 0, end = -1) {
    try {
      return await redisClient.zRangeWithScores(key, start, end);
    } catch (error) {
      console.error('Error getting sorted set:', error);
      return [];
    }
  }

  // ======= KEY MANAGEMENT =======
  
  // Ustaw TTL
  async setTTL(key, seconds) {
    try {
      return await redisClient.expire(key, seconds);
    } catch (error) {
      console.error('Error setting TTL:', error);
      return false;
    }
  }

  // Sprawdź TTL
  async getTTL(key) {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      console.error('Error getting TTL:', error);
      return -1;
    }
  }

  // Usuń klucz
  async deleteKey(key) {
    try {
      return await redisClient.del(key);
    } catch (error) {
      console.error('Error deleting key:', error);
      return 0;
    }
  }

  // Sprawdź czy klucz istnieje
  async exists(key) {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      console.error('Error checking existence:', error);
      return 0;
    }
  }

  // Znajdź klucze według wzorca
  async findKeys(pattern) {
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      console.error('Error finding keys:', error);
      return [];
    }
  }
}

module.exports = new RedisService();