const { cacheClient } = require('../config/redis');

/**
 * Cache Service - implementacja różnych strategii cachowania
 * 
 * Strategie cachowania:
 * 1. Cache-aside (Lazy Loading)
 * 2. Read-through 
 * 3. Write-through
 * 4. Write-around
 * 5. Write-back (Write-behind)
 * 6. LRU (Least Recently Used)
 * 7. LFU (Least Frequently Used)
 */

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 godzina
  }

  // ======= CACHE-ASIDE PATTERN =======
  /**
   * Aplikacja zarządza cache ręcznie
   * Zalety: Prostota, kontrola nad cache
   * Wady: Duplikacja logiki, możliwość niespójności
   */
  
  async cacheAside(key, dataFetcher, ttl = this.defaultTTL) {
    try {
      // 1. Sprawdź cache
      let data = await cacheClient.get(key);
      
      if (data) {
        console.log(`Cache HIT for key: ${key}`);
        return JSON.parse(data);
      }
      
      // 2. Cache MISS - pobierz z źródła
      console.log(`Cache MISS for key: ${key}`);
      data = await dataFetcher();
      
      // 3. Zapisz w cache
      if (data) {
        await cacheClient.setEx(key, ttl, JSON.stringify(data));
      }
      
      return data;
    } catch (error) {
      console.error('Cache-aside error:', error);
      // Fallback - zwróć dane bez cache
      return await dataFetcher();
    }
  }

  // ======= READ-THROUGH PATTERN =======
  /**
   * Cache automatycznie ładuje dane przy miss
   * Zalety: Transparentność dla aplikacji
   * Wady: Złożoność konfiguracji
   */
  
  async readThrough(key, dataFetcher, ttl = this.defaultTTL) {
    try {
      let data = await cacheClient.get(key);
      
      if (!data) {
        // Symulacja read-through - w rzeczywistości cache sam by to zrobił
        data = await dataFetcher();
        if (data) {
          await cacheClient.setEx(key, ttl, JSON.stringify(data));
        }
      } else {
        data = JSON.parse(data);
      }
      
      return data;
    } catch (error) {
      console.error('Read-through error:', error);
      return await dataFetcher();
    }
  }

  // ======= WRITE-THROUGH PATTERN =======
  /**
   * Dane zapisywane jednocześnie do cache i bazy
   * Zalety: Spójność danych
   * Wady: Wolniejsze zapisy
   */
  
  async writeThrough(key, data, dbWriter, ttl = this.defaultTTL) {
    try {
      // 1. Zapisz do bazy danych
      const result = await dbWriter(data);
      
      // 2. Zapisz do cache
      await cacheClient.setEx(key, ttl, JSON.stringify(result));
      
      return result;
    } catch (error) {
      console.error('Write-through error:', error);
      throw error;
    }
  }

  // ======= WRITE-AROUND PATTERN =======
  /**
   * Dane zapisywane tylko do bazy, cache omijany
   * Zalety: Unika cache pollution
   * Wady: Cache miss przy pierwszym odczycie
   */
  
  async writeAround(key, data, dbWriter) {
    try {
      // 1. Zapisz tylko do bazy
      const result = await dbWriter(data);
      
      // 2. Usuń z cache jeśli istnieje (invalidation)
      await cacheClient.del(key);
      
      return result;
    } catch (error) {
      console.error('Write-around error:', error);
      throw error;
    }
  }

  // ======= WRITE-BACK PATTERN =======
  /**
   * Dane zapisywane tylko do cache, asynchronicznie do bazy
   * Zalety: Szybkie zapisy
   * Wady: Ryzyko utraty danych
   */
  
  async writeBack(key, data, dbWriter, ttl = this.defaultTTL) {
    try {
      // 1. Zapisz do cache natychmiast
      await cacheClient.setEx(key, ttl, JSON.stringify(data));
      
      // 2. Zaznacz do asynchronicznego zapisu
      await cacheClient.sAdd('dirty_keys', key);
      
      // 3. Opcjonalnie zapisz asynchronicznie (w prawdziwej implementacji byłby background job)
      setTimeout(async () => {
        try {
          await dbWriter(data);
          await cacheClient.sRem('dirty_keys', key);
        } catch (error) {
          console.error('Async write-back failed:', error);
        }
      }, 1000);
      
      return data;
    } catch (error) {
      console.error('Write-back error:', error);
      throw error;
    }
  }

  // ======= LRU IMPLEMENTATION =======
  /**
   * Least Recently Used - usuwa najmniej ostatnio używane
   */
  
  async lruGet(key, maxSize = 100) {
    try {
      const data = await cacheClient.get(key);
      
      if (data) {
        // Aktualizuj timestamp dostępu
        await cacheClient.zAdd('lru_access', {
          score: Date.now(),
          value: key
        });
        
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      console.error('LRU get error:', error);
      return null;
    }
  }
  
  async lruSet(key, data, ttl = this.defaultTTL, maxSize = 100) {
    try {
      // Sprawdź czy nie przekraczamy limitu
      const currentSize = await cacheClient.zCard('lru_access');
      
      if (currentSize >= maxSize) {
        // Usuń najmniej ostatnio używany
        const oldKeys = await cacheClient.zRange('lru_access', 0, 0);
        if (oldKeys.length > 0) {
          await cacheClient.del(oldKeys[0]);
          await cacheClient.zRem('lru_access', oldKeys[0]);
        }
      }
      
      // Dodaj nowy klucz
      await cacheClient.setEx(key, ttl, JSON.stringify(data));
      await cacheClient.zAdd('lru_access', {
        score: Date.now(),
        value: key
      });
      
      return true;
    } catch (error) {
      console.error('LRU set error:', error);
      return false;
    }
  }

  // ======= LFU IMPLEMENTATION =======
  /**
   * Least Frequently Used - usuwa najmniej często używane
   */
  
  async lfuGet(key) {
    try {
      const data = await cacheClient.get(key);
      
      if (data) {
        // Zwiększ licznik dostępów
        await cacheClient.zIncrBy('lfu_frequency', 1, key);
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      console.error('LFU get error:', error);
      return null;
    }
  }
  
  async lfuSet(key, data, ttl = this.defaultTTL, maxSize = 100) {
    try {
      const currentSize = await cacheClient.zCard('lfu_frequency');
      
      if (currentSize >= maxSize) {
        // Usuń najmniej często używany
        const oldKeys = await cacheClient.zRange('lfu_frequency', 0, 0);
        if (oldKeys.length > 0) {
          await cacheClient.del(oldKeys[0]);
          await cacheClient.zRem('lfu_frequency', oldKeys[0]);
        }
      }
      
      await cacheClient.setEx(key, ttl, JSON.stringify(data));
      await cacheClient.zAdd('lfu_frequency', {
        score: 1,
        value: key
      });
      
      return true;
    } catch (error) {
      console.error('LFU set error:', error);
      return false;
    }
  }

  // ======= CACHE INVALIDATION =======
  
  async invalidate(pattern) {
    try {
      const keys = await cacheClient.keys(pattern);
      if (keys.length > 0) {
        await cacheClient.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }

  // ======= CACHE STATISTICS =======
  
  async getStats() {
    try {
      const info = await cacheClient.info('stats');
      return {
        hits: await cacheClient.get('cache_hits') || 0,
        misses: await cacheClient.get('cache_misses') || 0,
        lruSize: await cacheClient.zCard('lru_access'),
        lfuSize: await cacheClient.zCard('lfu_frequency')
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {};
    }
  }

  // ======= SIMPLE SETTER FOR CACHE =======
  async set(key, value, ttl = this.defaultTTL) {
    try {
      await cacheClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();