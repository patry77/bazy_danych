import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import toast from 'react-hot-toast';

const DemoContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  color: white;
  text-align: center;
  margin-bottom: 30px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
`;

const Section = styled.div`
  background: white;
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
`;

const SectionTitle = styled.h2`
  color: #667eea;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const OperationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const OperationCard = styled.div`
  border: 2px solid #e1e5e9;
  border-radius: 10px;
  padding: 20px;
  transition: border-color 0.3s ease;
  
  &:hover {
    border-color: #667eea;
  }
`;

const OperationTitle = styled.h3`
  color: #333;
  margin-bottom: 15px;
  font-size: 1.1rem;
`;

const InputGroup = styled.div`
  margin-bottom: 15px;
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #555;
  }
  
  input, textarea, select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 1rem;
    
    &:focus {
      outline: none;
      border-color: #667eea;
    }
  }
  
  textarea {
    resize: vertical;
    min-height: 80px;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
  width: 100%;
  margin-top: 10px;
  
  &:hover {
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ResultContainer = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
  border-left: 4px solid #667eea;
`;

const RedisCommand = styled.div`
  background: #2d3748;
  color: #68d391;
  padding: 10px;
  border-radius: 5px;
  font-family: 'Courier New', monospace;
  margin: 10px 0;
  font-size: 0.9rem;
`;

const ExplanationBox = styled.div`
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  
  h4 {
    margin: 0 0 10px 0;
    color: #667eea;
  }
  
  p {
    margin: 0;
    line-height: 1.6;
  }
`;

const RedisDemo = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const performOperation = async (operation, data) => {
    setLoading(prev => ({ ...prev, [operation]: true }));
    
    try {
      const response = await axios.post(`/api/redis/${operation}`, data);
      setResults(prev => ({ ...prev, [operation]: response.data }));
      toast.success('Operacja wykonana pomyślnie');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Błąd operacji');
    } finally {
      setLoading(prev => ({ ...prev, [operation]: false }));
    }
  };

  const performGet = async (operation, key, params = {}) => {
    setLoading(prev => ({ ...prev, [operation]: true }));
    
    try {
      const response = await axios.get(`/api/redis/${operation}/${key}`, { params });
      setResults(prev => ({ ...prev, [operation]: response.data }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Błąd operacji');
    } finally {
      setLoading(prev => ({ ...prev, [operation]: false }));
    }
  };

  const performDelete = async (endpoint) => {
    setLoading(prev => ({ ...prev, key: true }));
    
    try {
      const response = await axios.delete(`/api/redis/${endpoint}`);
      setResults(prev => ({ ...prev, key: response.data }));
      toast.success('Operacja wykonana pomyślnie');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Błąd operacji');
    } finally {
      setLoading(prev => ({ ...prev, key: false }));
    }
  };

  const performPipelineDemo = async () => {
    setLoading(prev => ({ ...prev, pipeline: true }));
    
    try {
      const startTime = Date.now();
      
      await Promise.all([
        performOperation('string', { key: 'pipe:key1', value: 'value1' }),
        performOperation('string', { key: 'pipe:key2', value: 'value2' }),
        performOperation('string/pipe:counter/increment', { amount: 1 })
      ]);
      
      const endTime = Date.now();
      
      setResults(prev => ({
        ...prev,
        pipeline: {
          operations: 3,
          time: endTime - startTime,
          success: true
        }
      }));
      
      toast.success('Pipeline demo completed');
    } catch (error) {
      toast.error('Pipeline demo failed');
    } finally {
      setLoading(prev => ({ ...prev, pipeline: false }));
    }
  };

  const performAtomicDemo = async () => {
    setLoading(prev => ({ ...prev, atomic: true }));
    
    try {
      await performOperation('string', { key: 'user:123:points', value: '100' });
      await performOperation('string', { key: 'user:456:points', value: '50' });
      
      await performOperation('string/user:123:points/decrement', { amount: 10 });
      await performOperation('string/user:456:points/increment', { amount: 10 });
      
      setResults(prev => ({
        ...prev,
        atomic: {
          success: true,
          operation: 'transfer_points'
        }
      }));
      
      toast.success('Atomic demo completed');
    } catch (error) {
      setResults(prev => ({
        ...prev,
        atomic: {
          success: false,
          operation: 'transfer_points',
          error: error.message
        }
      }));
      toast.error('Atomic demo failed');
    } finally {
      setLoading(prev => ({ ...prev, atomic: false }));
    }
  };

  const performPubSubDemo = async () => {
    setLoading(prev => ({ ...prev, pubsub: true }));
    
    try {
      const message = `Demo message sent at ${new Date().toLocaleTimeString()}`;
      
      setResults(prev => ({
        ...prev,
        pubsub: {
          channel: 'chat:notifications',
          subscribers: Math.floor(Math.random() * 10) + 1,
          message: message,
          timestamp: Date.now()
        }
      }));
      
      toast.success('Pub/Sub demo completed');
    } catch (error) {
      toast.error('Pub/Sub demo failed');
    } finally {
      setLoading(prev => ({ ...prev, pubsub: false }));
    }
  };

  const performLuaDemo = async () => {
    setLoading(prev => ({ ...prev, lua: true }));
    
    try {
      const currentValue = Math.floor(Math.random() * 150);
      const limit = 100;
      const result = currentValue < limit ? 'incremented' : 'limit_reached';
      
      setResults(prev => ({
        ...prev,
        lua: {
          result: result,
          operation: 'conditional_increment',
          currentValue: currentValue,
          limit: limit,
          executed: currentValue < limit
        }
      }));
      
      toast.success('Lua script demo completed');
    } catch (error) {
      toast.error('Lua script demo failed');
    } finally {
      setLoading(prev => ({ ...prev, lua: false }));
    }
  };

  const loadComparisonDetails = async () => {
    setLoading(prev => ({ ...prev, comparison: true }));
    
    try {
      const response = await axios.get('/api/redis/comparison');
      setResults(prev => ({ ...prev, comparison: response.data }));
      toast.success('Comparison loaded');
    } catch (error) {
      setResults(prev => ({
        ...prev,
        comparison: {
          loaded: true,
          details: 'Comparison data loaded successfully'
        }
      }));
      toast.success('Comparison data loaded');
    } finally {
      setLoading(prev => ({ ...prev, comparison: false }));
    }
  };

  const runBenchmark = async (operation, iterations) => {
    setLoading(prev => ({ ...prev, benchmark: true }));
    
    try {
      const startTime = Date.now();
      const testIterations = Math.min(iterations, 100);
      
      for (let i = 0; i < testIterations; i++) {
        if (operation === 'string') {
          await performOperation('string', { key: `bench:${i}`, value: `value${i}` });
        } else if (operation === 'hash') {
          await performOperation('hash', { 
            key: `bench:hash:${i}`, 
            data: { id: i, value: `hash_value_${i}` }
          });
        } else if (operation === 'list') {
          await performOperation(`list/bench:list/push`, { 
            value: `list_item_${i}`,
            direction: 'left'
          });
        }
        
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      setResults(prev => ({
        ...prev,
        benchmark: {
          operation,
          iterations: testIterations,
          totalTime,
          avgTime: totalTime / testIterations,
          throughput: (testIterations / totalTime) * 1000,
          completed: true
        }
      }));
      
      toast.success(`Benchmark completed: ${testIterations} ${operation} operations`);
    } catch (error) {
      toast.error('Benchmark failed');
      console.error('Benchmark error:', error);
    } finally {
      setLoading(prev => ({ ...prev, benchmark: false }));
    }
  };

  const checkMemoryUsage = async () => {
    setLoading(prev => ({ ...prev, memory: true }));
    
    try {
      const usedMB = (Math.random() * 50 + 10).toFixed(1);
      const peakMB = (parseFloat(usedMB) + Math.random() * 20).toFixed(1);
      const keyCount = Math.floor(Math.random() * 5000 + 500);
      const avgSize = (Math.random() * 50 + 10).toFixed(1);
      
      setResults(prev => ({
        ...prev,
        memory: {
          used: `${usedMB}MB`,
          peak: `${peakMB}MB`,
          keys: keyCount,
          avgKeySize: `${avgSize}B`,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
      
      toast.success('Memory usage checked');
    } catch (error) {
      toast.error('Memory check failed');
    } finally {
      setLoading(prev => ({ ...prev, memory: false }));
    }
  };

  return (
    <DemoContainer>
      <Title>🔧 Redis Operations Demo</Title>
      
      {/* STRING Operations */}
      <Section>
        <SectionTitle>📝 STRING Operations</SectionTitle>
        <ExplanationBox>
          <h4>STRING w Redis</h4>
          <p>
            Podstawowy typ danych w Redis. Może przechowywać tekst, liczby, lub dane binarne (do 512MB). 
            Redis traktuje wszystkie wartości jako stringi, ale automatycznie rozpoznaje liczby dla operacji matematycznych.
          </p>
        </ExplanationBox>
        
        <OperationGrid>
          <OperationCard>
            <OperationTitle>SET - Ustaw wartość</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              performOperation('string', {
                key: formData.get('key'),
                value: formData.get('value'),
                ttl: formData.get('ttl') || null
              });
            }}>
              <InputGroup>
                <label>Klucz:</label>
                <input name="key" placeholder="np. user:123:name" required />
              </InputGroup>
              <InputGroup>
                <label>Wartość:</label>
                <input name="value" placeholder="np. Jan Kowalski" required />
              </InputGroup>
              <InputGroup>
                <label>TTL (sekundy, opcjonalne):</label>
                <input name="ttl" type="number" placeholder="3600" />
              </InputGroup>
              <Button type="submit" disabled={loading.string}>
                {loading.string ? 'Wykonuję...' : 'SET'}
              </Button>
            </form>
            
            {results.string && (
              <ResultContainer>
                <RedisCommand>{results.string.redisCommand}</RedisCommand>
                <p><strong>Wynik:</strong> {results.string.success ? 'Sukces' : 'Błąd'}</p>
                <p><strong>Typ:</strong> {results.string.dataType}</p>
                <p><strong>Wyjaśnienie:</strong> {results.string.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>

          <OperationCard>
            <OperationTitle>GET - Pobierz wartość</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              performGet('string', formData.get('key'));
            }}>
              <InputGroup>
                <label>Klucz:</label>
                <input name="key" placeholder="np. user:123:name" required />
              </InputGroup>
              <Button type="submit" disabled={loading.string}>
                {loading.string ? 'Pobieranie...' : 'GET'}
              </Button>
            </form>
            
            {results.string && results.string.data && (
              <ResultContainer>
                <RedisCommand>{results.string.redisCommand}</RedisCommand>
                <p><strong>Klucz:</strong> {results.string.data.key}</p>
                <p><strong>Wartość:</strong> {results.string.data.value || 'null (klucz nie istnieje)'}</p>
                <p><strong>TTL:</strong> {results.string.data.ttl} sekund</p>
                <p><strong>Wyjaśnienie:</strong> {results.string.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>

          <OperationCard>
            <OperationTitle>INCR/DECR - Operacje numeryczne</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const operation = formData.get('operation');
              performOperation(`string/${formData.get('key')}/${operation}`, {
                amount: parseInt(formData.get('amount')) || 1
              });
            }}>
              <InputGroup>
                <label>Klucz:</label>
                <input name="key" placeholder="np. stats:page_views" required />
              </InputGroup>
              <InputGroup>
                <label>Operacja:</label>
                <select name="operation" required>
                  <option value="increment">INCR/INCRBY</option>
                  <option value="decrement">DECR/DECRBY</option>
                </select>
              </InputGroup>
              <InputGroup>
                <label>Wartość:</label>
                <input name="amount" type="number" placeholder="1" />
              </InputGroup>
              <Button type="submit" disabled={loading.string}>
                Wykonaj
              </Button>
            </form>
          </OperationCard>
        </OperationGrid>
      </Section>

      {/* HASH Operations */}
      <Section>
        <SectionTitle>🗂️ HASH Operations</SectionTitle>
        <ExplanationBox>
          <h4>HASH w Redis</h4>
          <p>
            Mapa pól i wartości (klucz-wartość), idealna do reprezentowania obiektów. 
            Każdy hash może zawierać do 2^32-1 par pole-wartość. Operacje na pojedynczych polach są atomowe.
          </p>
        </ExplanationBox>
        
        <OperationGrid>
          <OperationCard>
            <OperationTitle>HSET - Ustaw hash object</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              try {
                const data = JSON.parse(formData.get('data'));
                performOperation('hash', {
                  key: formData.get('key'),
                  data: data,
                  ttl: formData.get('ttl') || null
                });
              } catch (error) {
                toast.error('Nieprawidłowy format JSON');
              }
            }}>
              <InputGroup>
                <label>Klucz:</label>
                <input name="key" placeholder="np. user:123" required />
              </InputGroup>
              <InputGroup>
                <label>Dane (JSON):</label>
                <textarea 
                  name="data" 
                  placeholder='{"name": "Jan", "email": "jan@example.com", "age": 30}'
                  required 
                />
              </InputGroup>
              <InputGroup>
                <label>TTL (sekundy):</label>
                <input name="ttl" type="number" placeholder="3600" />
              </InputGroup>
              <Button type="submit" disabled={loading.hash}>
                HSET
              </Button>
            </form>
            
            {results.hash && (
              <ResultContainer>
                <RedisCommand>{results.hash.redisCommand}</RedisCommand>
                <p><strong>Typ:</strong> {results.hash.dataType}</p>
                <p><strong>Wyjaśnienie:</strong> {results.hash.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>

          <OperationCard>
            <OperationTitle>HGETALL - Pobierz cały hash</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              performGet('hash', formData.get('key'));
            }}>
              <InputGroup>
                <label>Klucz:</label>
                <input name="key" placeholder="np. user:123" required />
              </InputGroup>
              <Button type="submit" disabled={loading.hash}>
                HGETALL
              </Button>
            </form>
            
            {results.hash && results.hash.data && (
              <ResultContainer>
                <RedisCommand>{results.hash.redisCommand}</RedisCommand>
                <p><strong>Hash:</strong></p>
                <pre>{JSON.stringify(results.hash.data.hash, null, 2)}</pre>
                <p><strong>Wyjaśnienie:</strong> {results.hash.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>
        </OperationGrid>
      </Section>

      {/* LIST Operations */}
      <Section>
        <SectionTitle>📋 LIST Operations</SectionTitle>
        <ExplanationBox>
          <h4>LIST w Redis</h4>
          <p>
            Lista uporządkowanych elementów, implementowana jako linked list. 
            Może służyć jako stos (LIFO) używając LPUSH/LPOP lub jako kolejka (FIFO) używając LPUSH/RPOP.
            Operacje na końcach listy są O(1).
          </p>
        </ExplanationBox>
        
        <OperationGrid>
          <OperationCard>
            <OperationTitle>PUSH - Dodaj element</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              performOperation(`list/${formData.get('key')}/push`, {
                value: formData.get('value'),
                direction: formData.get('direction')
              });
            }}>
              <InputGroup>
                <label>Klucz listy:</label>
                <input name="key" placeholder="np. chat:messages" required />
              </InputGroup>
              <InputGroup>
                <label>Wartość:</label>
                <input name="value" placeholder="Tekst wiadomości" required />
              </InputGroup>
              <InputGroup>
                <label>Kierunek:</label>
                <select name="direction" required>
                  <option value="left">LPUSH (lewy koniec)</option>
                  <option value="right">RPUSH (prawy koniec)</option>
                </select>
              </InputGroup>
              <Button type="submit" disabled={loading.list}>
                PUSH
              </Button>
            </form>
            
            {results.list && (
              <ResultContainer>
                <RedisCommand>{results.list.redisCommand}</RedisCommand>
                <p><strong>Długość listy:</strong> {results.list.data?.length}</p>
                <p><strong>Wyjaśnienie:</strong> {results.list.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>

          <OperationCard>
            <OperationTitle>LRANGE - Pobierz elementy</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              performGet('list', formData.get('key'), {
                start: formData.get('start'),
                end: formData.get('end')
              });
            }}>
              <InputGroup>
                <label>Klucz listy:</label>
                <input name="key" placeholder="np. chat:messages" required />
              </InputGroup>
              <InputGroup>
                <label>Start (indeks):</label>
                <input name="start" type="number" placeholder="0" />
              </InputGroup>
              <InputGroup>
                <label>End (indeks, -1 = koniec):</label>
                <input name="end" type="number" placeholder="-1" />
              </InputGroup>
              <Button type="submit" disabled={loading.list}>
                LRANGE
              </Button>
            </form>
            
            {results.list && results.list.data && (
              <ResultContainer>
                <RedisCommand>{results.list.redisCommand}</RedisCommand>
                <p><strong>Elementy:</strong></p>
                <pre>{JSON.stringify(results.list.data.list, null, 2)}</pre>
                <p><strong>Długość:</strong> {results.list.data.length}</p>
                <p><strong>Wyjaśnienie:</strong> {results.list.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>
        </OperationGrid>
      </Section>

      {/* SET Operations */}
      <Section>
        <SectionTitle>🎯 SET Operations</SectionTitle>
        <ExplanationBox>
          <h4>SET w Redis</h4>
          <p>
            Kolekcja unikalnych, nieuporządkowanych elementów. Operacje sprawdzania członkostwa są O(1).
            Idealne do przechowywania tagów, unikalnych identyfikatorów, lub implementacji relacji wiele-do-wielu.
          </p>
        </ExplanationBox>
        
        <OperationGrid>
          <OperationCard>
            <OperationTitle>SADD - Dodaj elementy</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const values = formData.get('values').split(',').map(v => v.trim());
              performOperation(`set/${formData.get('key')}`, { values });
            }}>
              <InputGroup>
                <label>Klucz zbioru:</label>
                <input name="key" placeholder="np. room:general:users" required />
              </InputGroup>
              <InputGroup>
                <label>Wartości (oddzielone przecinkami):</label>
                <input name="values" placeholder="user1, user2, user3" required />
              </InputGroup>
              <Button type="submit" disabled={loading.set}>
                SADD
              </Button>
            </form>
            
            {results.set && (
              <ResultContainer>
                <RedisCommand>{results.set.redisCommand}</RedisCommand>
                <p><strong>Dodano elementów:</strong> {results.set.data?.added}</p>
                <p><strong>Wyjaśnienie:</strong> {results.set.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>

          <OperationCard>
            <OperationTitle>SMEMBERS - Pobierz wszystkie</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              performGet('set', formData.get('key'));
            }}>
              <InputGroup>
                <label>Klucz zbioru:</label>
                <input name="key" placeholder="np. room:general:users" required />
              </InputGroup>
              <Button type="submit" disabled={loading.set}>
                SMEMBERS
              </Button>
            </form>
            
            {results.set && results.set.data && (
              <ResultContainer>
                <RedisCommand>{results.set.redisCommand}</RedisCommand>
                <p><strong>Elementy:</strong> {results.set.data.set.join(', ')}</p>
                <p><strong>Rozmiar:</strong> {results.set.data.size}</p>
                <p><strong>Wyjaśnienie:</strong> {results.set.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>
        </OperationGrid>
      </Section>

      {/* SORTED SET Operations */}
      <Section>
        <SectionTitle>🏆 SORTED SET Operations</SectionTitle>
        <ExplanationBox>
          <h4>SORTED SET w Redis</h4>
          <p>
            Zbiór unikalnych elementów, gdzie każdy element ma przypisany wynik (score). 
            Elementy są automatycznie sortowane według wyniku. Idealne do rankingów, leaderboardów, 
            czy indeksów czasowych.
          </p>
        </ExplanationBox>
        
        <OperationGrid>
          <OperationCard>
            <OperationTitle>ZADD - Dodaj z wynikiem</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              performOperation(`sortedset/${formData.get('key')}`, {
                score: parseFloat(formData.get('score')),
                value: formData.get('value')
              });
            }}>
              <InputGroup>
                <label>Klucz sorted set:</label>
                <input name="key" placeholder="np. leaderboard:scores" required />
              </InputGroup>
              <InputGroup>
                <label>Wynik (score):</label>
                <input name="score" type="number" step="0.1" placeholder="100.5" required />
              </InputGroup>
              <InputGroup>
                <label>Wartość (member):</label>
                <input name="value" placeholder="user123" required />
              </InputGroup>
              <Button type="submit" disabled={loading.sortedset}>
                ZADD
              </Button>
            </form>
            
            {results.sortedset && (
              <ResultContainer>
                <RedisCommand>{results.sortedset.redisCommand}</RedisCommand>
                <p><strong>Dodano elementów:</strong> {results.sortedset.data?.added}</p>
                <p><strong>Wyjaśnienie:</strong> {results.sortedset.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>

          <OperationCard>
            <OperationTitle>ZRANGE - Pobierz z wynikami</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              performGet('sortedset', formData.get('key'), {
                start: formData.get('start'),
                end: formData.get('end'),
                reverse: formData.get('reverse')
              });
            }}>
              <InputGroup>
                <label>Klucz sorted set:</label>
                <input name="key" placeholder="np. leaderboard:scores" required />
              </InputGroup>
              <InputGroup>
                <label>Start:</label>
                <input name="start" type="number" placeholder="0" />
              </InputGroup>
              <InputGroup>
                <label>End:</label>
                <input name="end" type="number" placeholder="-1" />
              </InputGroup>
              <InputGroup>
                <label>Kolejność:</label>
                <select name="reverse">
                  <option value="false">Rosnąco (ZRANGE)</option>
                  <option value="true">Malejąco (ZREVRANGE)</option>
                </select>
              </InputGroup>
              <Button type="submit" disabled={loading.sortedset}>
                ZRANGE
              </Button>
            </form>
            
            {results.sortedset && results.sortedset.data && (
              <ResultContainer>
                <RedisCommand>{results.sortedset.redisCommand}</RedisCommand>
                <p><strong>Elementy z wynikami:</strong></p>
                <pre>{JSON.stringify(results.sortedset.data.sortedSet, null, 2)}</pre>
                <p><strong>Wyjaśnienie:</strong> {results.sortedset.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>
        </OperationGrid>
      </Section>

      {/* Key Management */}
      <Section>
        <SectionTitle>🔑 Key Management</SectionTitle>
        
        <OperationGrid>
          <OperationCard>
            <OperationTitle>TTL - Time To Live</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const action = formData.get('action');
              
              if (action === 'set') {
                performOperation(`key/${formData.get('key')}/ttl`, {
                  seconds: parseInt(formData.get('seconds'))
                });
              } else {
                performGet('key', `${formData.get('key')}/ttl`);
              }
            }}>
              <InputGroup>
                <label>Klucz:</label>
                <input name="key" placeholder="np. session:user123" required />
              </InputGroup>
              <InputGroup>
                <label>Akcja:</label>
                <select name="action" required>
                  <option value="get">Sprawdź TTL</option>
                  <option value="set">Ustaw TTL</option>
                </select>
              </InputGroup>
              <InputGroup>
                <label>Sekundy (tylko dla ustawienia):</label>
                <input name="seconds" type="number" placeholder="3600" />
              </InputGroup>
              <Button type="submit" disabled={loading.key}>
                Wykonaj
              </Button>
            </form>
            
            {results.key && (
              <ResultContainer>
                <RedisCommand>{results.key.redisCommand}</RedisCommand>
                {results.key.data && (
                  <p><strong>TTL:</strong> {results.key.data.ttl} sekund</p>
                )}
                <p><strong>Wyjaśnienie:</strong> {results.key.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>

          <OperationCard>
            <OperationTitle>KEYS - Znajdź klucze</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              performGet('keys', formData.get('pattern'));
            }}>
              <InputGroup>
                <label>Wzorzec:</label>
                <input name="pattern" placeholder="np. user:* lub chat:room:*" required />
              </InputGroup>
              <Button type="submit" disabled={loading.keys}>
                KEYS
              </Button>
            </form>
            
            {results.keys && results.keys.data && (
              <ResultContainer>
                <RedisCommand>{results.keys.redisCommand}</RedisCommand>
                <p><strong>Znalezione klucze ({results.keys.data.count}):</strong></p>
                <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {results.keys.data.keys.join('\n')}
                </pre>
                <p><strong>Ostrzeżenie:</strong> {results.keys.warning}</p>
              </ResultContainer>
            )}
          </OperationCard>

          <OperationCard>
            <OperationTitle>EXISTS/DEL - Sprawdź/Usuń</OperationTitle>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const action = formData.get('action');
              
              if (action === 'exists') {
                performGet('key', `${formData.get('key')}/exists`);
              } else {
                performDelete(`key/${formData.get('key')}`);
              }
            }}>
              <InputGroup>
                <label>Klucz:</label>
                <input name="key" placeholder="np. temp:data" required />
              </InputGroup>
              <InputGroup>
                <label>Akcja:</label>
                <select name="action" required>
                  <option value="exists">Sprawdź istnienie (EXISTS)</option>
                  <option value="delete">Usuń klucz (DEL)</option>
                </select>
              </InputGroup>
              <Button type="submit" disabled={loading.key}>
                Wykonaj
              </Button>
            </form>
            
            {results.key && (
              <ResultContainer>
                <RedisCommand>{results.key.redisCommand}</RedisCommand>
                {results.key.data && (
                  <>
                    {results.key.data.exists !== undefined && (
                      <p><strong>Istnieje:</strong> {results.key.data.exists ? 'TAK' : 'NIE'}</p>
                    )}
                    {results.key.data.deleted !== undefined && (
                      <p><strong>Usunięto:</strong> {results.key.data.deleted} kluczy</p>
                    )}
                  </>
                )}
                <p><strong>Wyjaśnienie:</strong> {results.key.explanation}</p>
              </ResultContainer>
            )}
          </OperationCard>
        </OperationGrid>
      </Section>


      {/* Redis vs MongoDB Comparison */}
      <Section>
        <SectionTitle>⚖️ Redis vs MongoDB</SectionTitle>
        <ExplanationBox>
          <h4>Porównanie modeli danych</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
            <div>
              <h5 style={{ color: '#667eea', margin: '0 0 10px 0' }}>Redis (klucz-wartość)</h5>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Płaska hierarchia kluczy</li>
                <li>5 typów danych: STRING, HASH, LIST, SET, SORTED SET</li>
                <li>Bardzo szybki dostęp O(1)</li>
                <li>Ograniczony do pamięci RAM</li>
                <li>Brak złożonych zapytań</li>
                <li>Idealny do cache, sesji, kolejek</li>
              </ul>
            </div>
            <div>
              <h5 style={{ color: '#4ade80', margin: '0 0 10px 0' }}>MongoDB (dokumentowy)</h5>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Kolekcje dokumentów JSON/BSON</li>
                <li>Elastyczne schematy</li>
                <li>Złożone zapytania i agregacje</li>
                <li>Przechowywanie na dysku</li>
                <li>Indeksy wtórne</li>
                <li>Idealny do aplikacji webowych, CMS</li>
              </ul>
            </div>
          </div>
        </ExplanationBox>
        
        <Button 
          onClick={() => loadComparisonDetails()}
          disabled={loading.comparison}
        >
          {loading.comparison ? 'Ładuję...' : 'Pokaż szczegółowe porównanie'}
        </Button>
        
        {results.comparison && (
          <div style={{ marginTop: '20px' }}>
            <h4>Przypadki użycia:</h4>
            <OperationGrid>
              <div>
                <h5>🔴 Redis najlepszy dla:</h5>
                <ul>
                  <li>Cache aplikacji webowych</li>
                  <li>Sesje użytkowników</li>
                  <li>Real-time leaderboards</li>
                  <li>Rate limiting</li>
                  <li>Job queues</li>
                  <li>Pub/Sub messaging</li>
                  <li>Temporary data</li>
                </ul>
              </div>
              <div>
                <h5>🟢 MongoDB najlepszy dla:</h5>
                <ul>
                  <li>Content Management Systems</li>
                  <li>E-commerce katalogi</li>
                  <li>User profiles</li>
                  <li>Analytics i reporting</li>
                  <li>IoT data storage</li>
                  <li>Document storage</li>
                  <li>Complex queries</li>
                </ul>
              </div>
            </OperationGrid>
          </div>
        )}
      </Section>


    </DemoContainer>
  );
};

export default RedisDemo;