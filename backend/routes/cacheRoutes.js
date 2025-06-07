const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');

// Mock database functions for demonstration
const mockDB = {
  users: {
    '1': { id: '1', name: 'Jan Kowalski', email: 'jan@example.com' },
    '2': { id: '2', name: 'Anna Nowak', email: 'anna@example.com' }
  },
  
  async findUser(id) {
    // Symulacja opóźnienia bazy danych
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.users[id] || null;
  },
  
  async saveUser(user) {
    await new Promise(resolve => setTimeout(resolve, 50));
    this.users[user.id] = user;
    return user;
  }
};

// ======= CACHE STRATEGIES DEMONSTRATION =======

// Cache-Aside (Lazy Loading)
router.get('/cache-aside/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cacheKey = `user:${userId}`;
    
    const startTime = Date.now();
    
    const user = await cacheService.cacheAside(
      cacheKey,
      () => mockDB.findUser(userId),
      300 // 5 minut TTL
    );
    
    const endTime = Date.now();
    
    res.json({
      success: true,
      strategy: 'Cache-Aside',
      data: user,
      responseTime: `${endTime - startTime}ms`,
      explanation: {
        description: 'Aplikacja zarządza cache ręcznie',
        flow: [
          '1. Sprawdź cache',
          '2. Jeśli MISS - pobierz z bazy',
          '3. Zapisz w cache',
          '4. Zwróć dane'
        ],
        zalety: ['Prostota implementacji', 'Kontrola nad cache'],
        wady: ['Duplikacja logiki', 'Możliwość niespójności'],
        przypadki: ['Dane tylko do odczytu', 'Tolerancja na opóźnienia']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Read-Through
router.get('/read-through/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cacheKey = `rt_user:${userId}`;
    
    const startTime = Date.now();
    
    const user = await cacheService.readThrough(
      cacheKey,
      () => mockDB.findUser(userId),
      300
    );
    
    const endTime = Date.now();
    
    res.json({
      success: true,
      strategy: 'Read-Through',
      data: user,
      responseTime: `${endTime - startTime}ms`,
      explanation: {
        description: 'Cache automatycznie ładuje dane przy miss',
        flow: [
          '1. Aplikacja prosi cache o dane',
          '2. Cache sprawdza czy ma dane',
          '3. Jeśli nie - cache pobiera z bazy',
          '4. Cache zwraca dane do aplikacji'
        ],
        zalety: ['Transparentność', 'Centralizacja logiki'],
        wady: ['Złożoność konfiguracji', 'Vendor lock-in'],
        przypadki: ['Często czytane dane', 'Prostota dla dewelopera']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Write-Through
router.post('/write-through', async (req, res) => {
  try {
    const userData = req.body;
    const cacheKey = `wt_user:${userData.id}`;
    
    const startTime = Date.now();
    
    const user = await cacheService.writeThrough(
      cacheKey,
      userData,
      (data) => mockDB.saveUser(data),
      300
    );
    
    const endTime = Date.now();
    
    res.json({
      success: true,
      strategy: 'Write-Through',
      data: user,
      responseTime: `${endTime - startTime}ms`,
      explanation: {
        description: 'Dane zapisywane jednocześnie do cache i bazy',
        flow: [
          '1. Aplikacja zapisuje dane',
          '2. Cache zapisuje do bazy',
          '3. Po sukcesie - cache zapisuje u siebie',
          '4. Zwraca potwierdzenie'
        ],
        zalety: ['Spójność danych', 'Zawsze aktualne dane w cache'],
        wady: ['Wolniejsze zapisy', 'Większa złożoność'],
        przypadki: ['Krytyczne dane', 'Częste odczyty po zapisie']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Write-Around
router.post('/write-around', async (req, res) => {
  try {
    const userData = req.body;
    const cacheKey = `wa_user:${userData.id}`;
    
    const startTime = Date.now();
    
    const user = await cacheService.writeAround(
      cacheKey,
      userData,
      (data) => mockDB.saveUser(data)
    );
    
    const endTime = Date.now();
    
    res.json({
      success: true,
      strategy: 'Write-Around',
      data: user,
      responseTime: `${endTime - startTime}ms`,
      explanation: {
        description: 'Dane zapisywane tylko do bazy, cache omijany',
        flow: [
          '1. Aplikacja zapisuje dane',
          '2. Dane idą bezpośrednio do bazy',
          '3. Cache jest invalidowany/pomijany',
          '4. Następny odczyt będzie cache miss'
        ],
        zalety: ['Unika cache pollution', 'Szybkie zapisy rzadkich danych'],
        wady: ['Cache miss przy pierwszym odczycie', 'Potencjalne opóźnienia'],
        przypadki: ['Dane rzadko czytane', 'Duże pliki', 'Write-heavy workloads']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Write-Back (Write-Behind)
router.post('/write-back', async (req, res) => {
  try {
    const userData = req.body;
    const cacheKey = `wb_user:${userData.id}`;
    
    const startTime = Date.now();
    
    const user = await cacheService.writeBack(
      cacheKey,
      userData,
      (data) => mockDB.saveUser(data),
      300
    );
    
    const endTime = Date.now();
    
    res.json({
      success: true,
      strategy: 'Write-Back',
      data: user,
      responseTime: `${endTime - startTime}ms`,
      explanation: {
        description: 'Dane zapisywane tylko do cache, asynchronicznie do bazy',
        flow: [
          '1. Aplikacja zapisuje dane',
          '2. Cache zapisuje u siebie natychmiast',
          '3. Cache zaznacza dane jako "dirty"',
          '4. Background job zapisuje do bazy później'
        ],
        zalety: ['Bardzo szybkie zapisy', 'Lepsze performance'],
        wady: ['Ryzyko utraty danych', 'Złożoność implementacji'],
        przypadki: ['Gaming scores', 'Analytics', 'High-frequency writes']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= EVICTION POLICIES =======

// LRU (Least Recently Used)
router.post('/lru/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { data } = req.body;
    const { maxSize = 10 } = req.query;
    
    const success = await cacheService.lruSet(key, data, 300, parseInt(maxSize));
    
    res.json({
      success,
      strategy: 'LRU (Least Recently Used)',
      data: { key, cached: data },
      explanation: {
        description: 'Usuwa najmniej ostatnio używane elementy',
        implementation: 'Sorted Set z timestampami dostępu',
        zalety: ['Zachowuje często używane dane', 'Dobra lokalność czasowa'],
        wady: ['Overhead timestampów', 'Nie sprawdza się dla sekwencyjnych skanów'],
        przypadki: ['Web aplikacje', 'Buffer pools', 'Page replacement']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/lru/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { maxSize = 10 } = req.query;
    
    const data = await cacheService.lruGet(key, parseInt(maxSize));
    
    res.json({
      success: true,
      strategy: 'LRU Get',
      data: { key, value: data },
      explanation: 'Odczyt aktualizuje timestamp dostępu w LRU'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// LFU (Least Frequently Used)
router.post('/lfu/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { data } = req.body;
    const { maxSize = 10 } = req.query;
    
    const success = await cacheService.lfuSet(key, data, 300, parseInt(maxSize));
    
    res.json({
      success,
      strategy: 'LFU (Least Frequently Used)',
      data: { key, cached: data },
      explanation: {
        description: 'Usuwa najmniej często używane elementy',
        implementation: 'Sorted Set z licznikami dostępów',
        zalety: ['Zachowuje popularne dane', 'Dobra dla stałych wzorców'],
        wady: ['Powolna adaptacja', 'Problem z nowymi elementami'],
        przypadki: ['CDN', 'Database buffers', 'Statyczne zasoby']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/lfu/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const data = await cacheService.lfuGet(key);
    
    res.json({
      success: true,
      strategy: 'LFU Get',
      data: { key, value: data },
      explanation: 'Odczyt zwiększa licznik częstotliwości w LFU'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= CACHE INVALIDATION =======

router.delete('/invalidate/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    
    const deletedCount = await cacheService.invalidate(pattern);
    
    res.json({
      success: true,
      strategy: 'Cache Invalidation',
      data: { pattern, deletedKeys: deletedCount },
      explanation: {
        description: 'Usunięcie nieaktualnych danych z cache',
        types: [
          'TTL-based - automatyczne wygaśnięcie',
          'Manual - ręczne usunięcie po aktualizacji',
          'Event-based - triggered przez zdarzenia'
        ],
        patterns: [
          'Purge all - usuń wszystko',
          'Tag-based - usuń według tagów',
          'Pattern-based - usuń według wzorca klucza'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= CACHE STATISTICS =======

router.get('/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      success: true,
      data: stats,
      explanation: {
        hitRatio: 'Hit ratio = hits / (hits + misses)',
        optimalRatio: 'Dobry hit ratio to >80% dla większości aplikacji',
        monitoring: [
          'Hit/Miss ratio',
          'Response time',
          'Memory usage',
          'Eviction rate'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======= CACHE STRATEGIES OVERVIEW =======

router.get('/strategies', (req, res) => {
  res.json({
    title: 'Przegląd strategii cachowania',
    cacheStrategies: {
      'Cache-Aside (Lazy Loading)': {
        description: 'Aplikacja zarządza cache ręcznie',
        pattern: 'Check cache → Miss → Load from DB → Store in cache',
        pros: ['Prostota', 'Kontrola', 'Odporność na awarie cache'],
        cons: ['Duplikacja kodu', 'Cache miss penalty', 'Możliwa niespójność'],
        useCase: 'Ogólne zastosowanie, dane tylko do odczytu'
      },
      'Read-Through': {
        description: 'Cache automatycznie ładuje dane',
        pattern: 'App → Cache → (if miss) DB → Cache → App',
        pros: ['Transparentność', 'Centralizacja logiki'],
        cons: ['Vendor lock-in', 'Konfiguracja', 'Single point of failure'],
        useCase: 'Często czytane dane, prostota dla developera'
      },
      'Write-Through': {
        description: 'Zapis do cache i DB jednocześnie',
        pattern: 'App → Cache → DB → Cache → App',
        pros: ['Spójność danych', 'Zawsze świeże dane'],
        cons: ['Wolniejsze zapisy', 'Większa latencja'],
        useCase: 'Krytyczne dane, częste odczyty po zapisie'
      },
      'Write-Around': {
        description: 'Zapis tylko do DB, cache pomijany',
        pattern: 'App → DB (cache invalidated)',
        pros: ['Unika cache pollution', 'Szybkie zapisy'],
        cons: ['Cache miss po zapisie', 'Potencjalne opóźnienia'],
        useCase: 'Dane rzadko czytane, duże pliki'
      },
      'Write-Back (Write-Behind)': {
        description: 'Zapis do cache, asynchronicznie do DB',
        pattern: 'App → Cache → (async) DB',
        pros: ['Bardzo szybkie zapisy', 'Lepsze performance'],
        cons: ['Ryzyko utraty danych', 'Złożoność'],
        useCase: 'Gaming, analytics, wysokie obciążenie'
      }
    },
    evictionPolicies: {
      'LRU (Least Recently Used)': {
        description: 'Usuwa najmniej ostatnio używane',
        mechanism: 'Timestamp ostatniego dostępu',
        complexity: 'O(1) per operation',
        pros: ['Dobra lokalność czasowa', 'Intuicyjny'],
        cons: ['Overhead pamięciowy', 'Słaby dla scan operations'],
        useCase: 'Web aplikacje, general purpose'
      },
      'LFU (Least Frequently Used)': {
        description: 'Usuwa najmniej często używane',
        mechanism: 'Licznik dostępów',
        complexity: 'O(1) per operation (with proper implementation)',
        pros: ['Zachowuje popularne dane', 'Dobry dla stałych wzorców'],
        cons: ['Powolna adaptacja', 'Problem aging'],
        useCase: 'CDN, statyczne zasoby'
      },
      'FIFO (First In, First Out)': {
        description: 'Usuwa najstarsze dane',
        mechanism: 'Kolejka insertion order',
        complexity: 'O(1)',
        pros: ['Prostota', 'Przewidywalność'],
        cons: ['Ignoruje frequency/recency', 'Może usunąć popularne dane'],
        useCase: 'Streaming data, logs'
      },
      'Random': {
        description: 'Usuwa losowe elementy',
        mechanism: 'Random selection',
        complexity: 'O(1)',
        pros: ['Bardzo prosta implementacja', 'Dobra średnia performance'],
        cons: ['Nieprzewidywalność', 'Może usunąć ważne dane'],
        useCase: 'Prototyping, gdy inne nie działają'
      },
      'TTL (Time To Live)': {
        description: 'Automatyczne wygaśnięcie po czasie',
        mechanism: 'Timestamp expiration',
        complexity: 'O(1)',
        pros: ['Automatyczne', 'Dobre dla danych czasowych'],
        cons: ['Może usunąć aktywne dane', 'Wymaga tuningu TTL'],
        useCase: 'Session data, temporary data'
      }
    },
    cacheProblems: {
      'Cache Stampede': {
        description: 'Wiele requestów regeneruje ten sam klucz jednocześnie',
        solution: 'Lock-based loading, pre-warming'
      },
      'Cache Pollution': {
        description: 'Rzadko używane dane wypierają popularne',
        solution: 'Odpowiednia eviction policy, cache layers'
      },
      'Cold Start': {
        description: 'Pusty cache po restarcie',
        solution: 'Cache warming, persistent cache'
      },
      'Thundering Herd': {
        description: 'Wiele instancji aplikacji uderza w DB jednocześnie',
        solution: 'Circuit breaker, exponential backoff'
      }
    },
    redisSpecific: {
      maxmemoryPolicy: {
        'noeviction': 'Błąd gdy brak pamięci',
        'allkeys-lru': 'LRU na wszystkich kluczach',
        'allkeys-lfu': 'LFU na wszystkich kluczach',
        'allkeys-random': 'Random na wszystkich kluczach',
        'volatile-lru': 'LRU tylko na kluczach z TTL',
        'volatile-lfu': 'LFU tylko na kluczach z TTL',
        'volatile-random': 'Random tylko na kluczach z TTL',
        'volatile-ttl': 'Usuwa klucze z najkrótszym TTL'
      },
      configuration: {
        command: 'CONFIG SET maxmemory-policy allkeys-lru',
        monitoring: 'INFO memory, INFO stats'
      }
    }
  });
});

// ======= BENCHMARKING =======

router.get('/benchmark/:strategy', async (req, res) => {
  try {
    const { strategy } = req.params;
    const { iterations = 100 } = req.query;
    
    const testData = { id: 'test', data: 'benchmark data' };
    const results = {
      strategy,
      iterations: parseInt(iterations),
      times: [],
      errors: 0
    };
    
    const startTotal = Date.now();
    
    for (let i = 0; i < parseInt(iterations); i++) {
      const start = Date.now();
      
      try {
        switch (strategy) {
          case 'cache-aside':
            await cacheService.cacheAside(`bench:${i}`, () => Promise.resolve(testData));
            break;
          case 'read-through':
            await cacheService.readThrough(`bench:${i}`, () => Promise.resolve(testData));
            break;
          case 'lru':
            await cacheService.lruSet(`bench:${i}`, testData);
            break;
          case 'lfu':
            await cacheService.lfuSet(`bench:${i}`, testData);
            break;
          default:
            throw new Error('Unknown strategy');
        }
        
        const end = Date.now();
        results.times.push(end - start);
        
      } catch (error) {
        results.errors++;
      }
    }
    
    const endTotal = Date.now();
    
    // Oblicz statystyki
    results.totalTime = endTotal - startTotal;
    results.avgTime = results.times.reduce((a, b) => a + b, 0) / results.times.length;
    results.minTime = Math.min(...results.times);
    results.maxTime = Math.max(...results.times);
    results.throughput = results.iterations / (results.totalTime / 1000); // ops/sec
    
    res.json({
      success: true,
      benchmark: results,
      explanation: `Benchmark dla strategii ${strategy}`
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;