const express = require('express');
const router = express.Router();
const redisService = require('../services/redisService');

// ======= STRING OPERATIONS =======

router.post('/string', async (req, res) => {
  try {
    const { key, value, ttl } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Key and value are required'
      });
    }
    
    const success = await redisService.setString(key, value, ttl);
    
    res.json({
      success,
      message: 'String value set',
      redisCommand: ttl ? `SETEX ${key} ${ttl} "${value}"` : `SET ${key} "${value}"`,
      dataType: 'STRING',
      explanation: 'Redis przechowuje wartości jako stringi. Liczby są automatycznie konwertowane.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/string/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await redisService.getString(key);
    const ttl = await redisService.getTTL(key);
    
    res.json({
      success: true,
      data: { key, value, ttl },
      redisCommand: `GET ${key}`,
      dataType: 'STRING',
      explanation: 'TTL -1 oznacza brak wygaśnięcia, -2 oznacza że klucz nie istnieje'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Numeric operations
router.post('/string/:key/increment', async (req, res) => {
  try {
    const { key } = req.params;
    const { amount = 1 } = req.body;
    
    const newValue = await redisService.incrementNumber(key, amount);
    
    res.json({
      success: true,
      data: { key, newValue },
      redisCommand: amount === 1 ? `INCR ${key}` : `INCRBY ${key} ${amount}`,
      dataType: 'STRING (Numeric)',
      explanation: 'Redis przechowuje liczby jako stringi, ale pozwala na operacje matematyczne'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/string/:key/decrement', async (req, res) => {
  try {
    const { key } = req.params;
    const { amount = 1 } = req.body;
    
    const newValue = await redisService.decrementNumber(key, amount);
    
    res.json({
      success: true,
      data: { key, newValue },
      redisCommand: amount === 1 ? `DECR ${key}` : `DECRBY ${key} ${amount}`,
      dataType: 'STRING (Numeric)',
      explanation: 'Operacje INCR/DECR są atomowe - bezpieczne w środowisku wielowątkowym'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= HASH OPERATIONS =======

router.post('/hash', async (req, res) => {
  try {
    const { key, data, ttl } = req.body;
    
    if (!key || !data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Key and data object are required'
      });
    }
    
    const success = await redisService.setHashObject(key, data, ttl);
    
    const fields = Object.entries(data).flat().join(' ');
    
    res.json({
      success,
      message: 'Hash object set',
      redisCommand: `HSET ${key} ${fields}`,
      dataType: 'HASH',
      explanation: 'Hash to mapa klucz-wartość, idealna dla obiektów. Każde pole może być modyfikowane niezależnie.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/hash/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const hash = await redisService.getHash(key);
    
    res.json({
      success: true,
      data: { key, hash },
      redisCommand: `HGETALL ${key}`,
      dataType: 'HASH',
      explanation: 'HGETALL pobiera wszystkie pola i wartości z hash\'a'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/hash/:key/field', async (req, res) => {
  try {
    const { key } = req.params;
    const { field, value } = req.body;
    
    if (!field || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Field and value are required'
      });
    }
    
    const success = await redisService.setHash(key, field, value);
    
    res.json({
      success,
      message: 'Hash field set',
      redisCommand: `HSET ${key} ${field} "${value}"`,
      dataType: 'HASH',
      explanation: 'Można modyfikować pojedyncze pola bez wpływu na inne'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/hash/:key/:field', async (req, res) => {
  try {
    const { key, field } = req.params;
    const value = await redisService.getHashField(key, field);
    
    res.json({
      success: true,
      data: { key, field, value },
      redisCommand: `HGET ${key} ${field}`,
      dataType: 'HASH',
      explanation: 'HGET pobiera wartość konkretnego pola z hash\'a'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= LIST OPERATIONS =======

router.post('/list/:key/push', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, direction = 'left' } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required'
      });
    }
    
    const length = direction === 'left' 
      ? await redisService.push(key, value)
      : await redisService.enqueue(key, value);
    
    const command = direction === 'left' ? 'LPUSH' : 'RPUSH';
    
    res.json({
      success: true,
      data: { key, length },
      redisCommand: `${command} ${key} "${JSON.stringify(value)}"`,
      dataType: 'LIST',
      explanation: `${direction === 'left' ? 'LPUSH' : 'RPUSH'} - Lista może służyć jako stos (LIFO) lub kolejka (FIFO)`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/list/:key/pop', async (req, res) => {
  try {
    const { key } = req.params;
    const { direction = 'left' } = req.body;
    
    const value = direction === 'left' 
      ? await redisService.pop(key)
      : await redisService.dequeue(key);
    
    const command = direction === 'left' ? 'LPOP' : 'RPOP';
    
    res.json({
      success: true,
      data: { key, value },
      redisCommand: `${command} ${key}`,
      dataType: 'LIST',
      explanation: `${command} - ${direction === 'left' ? 'Stos (LIFO)' : 'Kolejka (FIFO)'}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/list/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { start = 0, end = -1 } = req.query;
    
    const list = await redisService.getList(key, parseInt(start), parseInt(end));
    
    res.json({
      success: true,
      data: { key, list, length: list.length },
      redisCommand: `LRANGE ${key} ${start} ${end}`,
      dataType: 'LIST',
      explanation: 'LRANGE pobiera elementy z zakresu. -1 oznacza koniec listy'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= SET OPERATIONS =======

router.post('/set/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { values } = req.body;
    
    if (!Array.isArray(values) || values.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Values array is required'
      });
    }
    
    const added = await redisService.addToSet(key, ...values);
    
    res.json({
      success: true,
      data: { key, added },
      redisCommand: `SADD ${key} ${values.join(' ')}`,
      dataType: 'SET',
      explanation: 'Set przechowuje unikalne wartości. Duplikaty są automatycznie odrzucane'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/set/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const set = await redisService.getSet(key);
    
    res.json({
      success: true,
      data: { key, set, size: set.length },
      redisCommand: `SMEMBERS ${key}`,
      dataType: 'SET',
      explanation: 'SMEMBERS zwraca wszystkie elementy zbioru'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/set/:key/contains/:value', async (req, res) => {
  try {
    const { key, value } = req.params;
    const isMember = await redisService.isInSet(key, value);
    
    res.json({
      success: true,
      data: { key, value, isMember },
      redisCommand: `SISMEMBER ${key} ${value}`,
      dataType: 'SET',
      explanation: 'SISMEMBER sprawdza czy element należy do zbioru - operacja O(1)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= SORTED SET OPERATIONS =======

router.post('/sortedset/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { score, value } = req.body;
    
    if (score === undefined || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Score and value are required'
      });
    }
    
    const added = await redisService.addToSortedSet(key, score, value);
    
    res.json({
      success: true,
      data: { key, added },
      redisCommand: `ZADD ${key} ${score} ${value}`,
      dataType: 'SORTED SET',
      explanation: 'Sorted Set przechowuje elementy z wynikami, automatycznie sortowane'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sortedset/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { start = 0, end = -1, reverse = false } = req.query;
    
    const sortedSet = await redisService.getSortedSetWithScores(key, parseInt(start), parseInt(end));
    
    const command = reverse === 'true' ? 'ZREVRANGE' : 'ZRANGE';
    
    res.json({
      success: true,
      data: { key, sortedSet },
      redisCommand: `${command} ${key} ${start} ${end} WITHSCORES`,
      dataType: 'SORTED SET',
      explanation: `${command} - ${reverse === 'true' ? 'Od najwyższego' : 'Od najniższego'} wyniku`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= KEY MANAGEMENT =======

router.post('/key/:key/ttl', async (req, res) => {
  try {
    const { key } = req.params;
    const { seconds } = req.body;
    
    if (!seconds || seconds <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid seconds value is required'
      });
    }
    
    const success = await redisService.setTTL(key, seconds);
    
    res.json({
      success,
      message: 'TTL set',
      redisCommand: `EXPIRE ${key} ${seconds}`,
      explanation: 'TTL (Time To Live) - czas życia klucza w sekundach'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/key/:key/ttl', async (req, res) => {
  try {
    const { key } = req.params;
    const ttl = await redisService.getTTL(key);
    
    let explanation;
    if (ttl === -1) explanation = 'Klucz nie ma ustawionego TTL';
    else if (ttl === -2) explanation = 'Klucz nie istnieje';
    else explanation = `Klucz wygaśnie za ${ttl} sekund`;
    
    res.json({
      success: true,
      data: { key, ttl },
      redisCommand: `TTL ${key}`,
      explanation
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/key/:key/exists', async (req, res) => {
  try {
    const { key } = req.params;
    const exists = await redisService.exists(key);
    
    res.json({
      success: true,
      data: { key, exists: exists === 1 },
      redisCommand: `EXISTS ${key}`,
      explanation: 'EXISTS zwraca 1 jeśli klucz istnieje, 0 jeśli nie'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/key/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const deleted = await redisService.deleteKey(key);
    
    res.json({
      success: true,
      data: { key, deleted },
      redisCommand: `DEL ${key}`,
      explanation: 'DEL usuwa klucz i zwraca liczbę usuniętych kluczy'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/keys/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    const keys = await redisService.findKeys(pattern);
    
    res.json({
      success: true,
      data: { pattern, keys, count: keys.length },
      redisCommand: `KEYS ${pattern}`,
      explanation: 'KEYS znajduje klucze według wzorca (* = wszystko, ? = jeden znak)',
      warning: 'KEYS może być kosztowne na dużych bazach - użyj SCAN w produkcji'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= COMPARISON WITH MONGODB =======

router.get('/comparison', (req, res) => {
  res.json({
    title: 'Porównanie Redis (klucz-wartość) vs MongoDB (dokumentowy)',
    redis: {
      model: 'Klucz-wartość',
      struktura: 'Płaska hierarchia kluczy',
      typy: ['STRING', 'HASH', 'LIST', 'SET', 'SORTED SET'],
      zalety: [
        'Bardzo szybki dostęp O(1)',
        'Proste operacje atomowe',
        'Wbudowane struktury danych',
        'Doskonały do cache\'owania'
      ],
      wady: [
        'Brak złożonych zapytań',
        'Ograniczona pamięć RAM',
        'Brak relacji między kluczami'
      ],
      przypadki: [
        'Cache',
        'Sesje użytkowników',
        'Kolejki/stosy',
        'Liczniki w czasie rzeczywistym',
        'Leaderboards'
      ]
    },
    mongodb: {
      model: 'Dokumentowy',
      struktura: 'Kolekcje dokumentów JSON/BSON',
      typy: ['Object', 'Array', 'String', 'Number', 'Date', 'Binary'],
      zalety: [
        'Złożone zapytania i agregacje',
        'Schematless/flexible schema',
        'Indeksy wtórne',
        'Replikacja i sharding'
      ],
      wady: [
        'Wolniejszy od Redis',
        'Większe zużycie pamięci',
        'Złożoność konfiguracji'
      ],
      przypadki: [
        'Aplikacje webowe',
        'CMS',
        'Analityka',
        'IoT data',
        'Content management'
      ]
    },
    hybridApproach: {
      description: 'Użycie Redis jako cache dla MongoDB',
      benefits: [
        'Szybkość Redis + funkcjonalność MongoDB',
        'Zmniejszenie obciążenia głównej bazy',
        'Lepsza skalowalność'
      ]
    }
  });
});

module.exports = router;