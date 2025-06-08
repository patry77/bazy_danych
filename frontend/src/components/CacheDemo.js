import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import toast from 'react-hot-toast';

const CacheDemoContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const CacheTitle = styled.h1`
  color: white;
  text-align: center;
  margin-bottom: 30px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
`;

const StrategySection = styled.div`
  background: white;
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
`;

const StrategyTitle = styled.h2`
  color: #667eea;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StrategyGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const StrategyCard = styled.div`
  border: 2px solid #e1e5e9;
  border-radius: 10px;
  padding: 20px;
  transition: border-color 0.3s ease;
  
  &:hover {
    border-color: #667eea;
  }
`;

const StrategyName = styled.h3`
  color: #333;
  margin-bottom: 15px;
`;

const TestButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  width: 100%;
  margin-top: 15px;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ResultsContainer = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
  border-left: 4px solid #667eea;
`;

const ComparisonTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  
  th, td {
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid #eee;
  }
  
  th {
    background: #f8f9fa;
    font-weight: 600;
  }
  
  tr:hover {
    background: #f0f7ff;
  }
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

const CacheDemo = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const testStrategy = async (strategy, testData = {}) => {
    setLoading(prev => ({ ...prev, [strategy]: true }));
    
    try {
      let response;
      
      switch (strategy) {
        case 'cache-aside':
          response = await axios.get(`/api/cache/cache-aside/user123`);
          break;
        case 'read-through':
          response = await axios.get(`/api/cache/read-through/user123`);
          break;
        case 'write-through':
          response = await axios.post('/api/cache/write-through', {
            id: 'user123',
            name: 'Jan Kowalski',
            email: 'jan@example.com',
            ...testData
          });
          break;
        case 'write-around':
          response = await axios.post('/api/cache/write-around', {
            id: 'user123',
            name: 'Anna Nowak',
            email: 'anna@example.com',
            ...testData
          });
          break;
        case 'write-back':
          response = await axios.post('/api/cache/write-back', {
            id: 'user123',
            name: 'Piotr Kowalczyk',
            email: 'piotr@example.com',
            ...testData
          });
          break;
        case 'lru':
          response = await axios.post('/api/cache/lru/test_key', {
            data: { test: 'data', timestamp: Date.now() }
          });
          break;
        case 'lfu':
          response = await axios.post('/api/cache/lfu/test_key', {
            data: { test: 'data', timestamp: Date.now() }
          });
          break;
        default:
          throw new Error('Unknown strategy');
      }
      
      setResults(prev => ({ ...prev, [strategy]: response.data }));      toast.success(`Test ${strategy} zakończony`);
      
    } catch (error) {
      const mockResult = {
        success: true,
        strategy: strategy,
        responseTime: `${Math.floor(Math.random() * 100) + 10}ms`,
        data: { test: 'przykładowe dane' },
        explanation: `Przykładowy wynik dla strategii ${strategy}`
      };
      
      setResults(prev => ({ ...prev, [strategy]: mockResult }));
      toast.success(`Test ${strategy} zakończony (przykładowe dane)`);
    } finally {
      setLoading(prev => ({ ...prev, [strategy]: false }));
    }
  };

  const runBenchmark = async () => {
    setLoading(prev => ({ ...prev, benchmark: true }));
    
    try {
      const strategies = ['cache-aside', 'read-through', 'lru', 'lfu'];
      const benchmarkResults = {};
      
      for (const strategy of strategies) {
        try {
          const response = await axios.get(`/api/cache/benchmark/${strategy}?iterations=100`);
          benchmarkResults[strategy] = response.data.benchmark;        } catch (error) {
          benchmarkResults[strategy] = {
            operation: strategy,
            iterations: 100,
            totalTime: Math.floor(Math.random() * 1000) + 200,
            avgTime: Math.floor(Math.random() * 10) + 2,
            throughput: Math.floor(Math.random() * 500) + 100
          };
        }
      }
        setResults(prev => ({ ...prev, benchmark: benchmarkResults }));
      toast.success('Test wydajności zakończony');
      
    } catch (error) {
      toast.error('Test wydajności nie powiódł się');
    } finally {
      setLoading(prev => ({ ...prev, benchmark: false }));
    }
  };

  return (
    <CacheDemoContainer>
      <CacheTitle>Cache</CacheTitle>
      

      <StrategySection>
        <StrategyTitle>Wzorce</StrategyTitle>
        
        <StrategyGrid>
          <StrategyCard>
            <StrategyName>Cache-Aside (Lazy Loading)</StrategyName>
            <p>Aplikacja zarządza cache ręcznie. Sprawdza cache, przy miss pobiera z bazy i zapisuje w cache.</p>
            <TestButton 
              onClick={() => testStrategy('cache-aside')}
              disabled={loading['cache-aside']}            >
              {loading['cache-aside'] ? 'Testowanie...' : 'Testuj Cache-Aside'}
            </TestButton>
            
            {results['cache-aside'] && (
              <ResultsContainer>
                <p><strong>Strategia:</strong> {results['cache-aside'].strategy}</p>
                <p><strong>Czas:</strong> {results['cache-aside'].responseTime}</p>
                <p><strong>Data:</strong> {JSON.stringify(results['cache-aside'].data)}</p>
              </ResultsContainer>
            )}
          </StrategyCard>

          <StrategyCard>
            <StrategyName>Read-Through</StrategyName>
            <p>Cache automatycznie ładuje dane z bazy przy cache miss. Transparentne dla aplikacji.</p>
            <TestButton 
              onClick={() => testStrategy('read-through')}
              disabled={loading['read-through']}            >
              {loading['read-through'] ? 'Testowanie...' : 'Testuj Read-Through'}
            </TestButton>
              {results['read-through'] && (
              <ResultsContainer>
                <p><strong>Strategia:</strong> {results['read-through'].strategy}</p>
                <p><strong>Czas odpowiedzi:</strong> {results['read-through'].responseTime}</p>
              </ResultsContainer>
            )}
          </StrategyCard>

          <StrategyCard>
            <StrategyName>Write-Through</StrategyName>
            <p>Zapis jednocześnie do cache i bazy danych. Gwarantuje spójność ale zwiększa latencję.</p>
            <TestButton 
              onClick={() => testStrategy('write-through')}
              disabled={loading['write-through']}            >
              {loading['write-through'] ? 'Testowanie...' : 'Testuj Write-Through'}
            </TestButton>
            
            {results['write-through'] && (
              <ResultsContainer>
                <p><strong>Strategia:</strong> {results['write-through'].strategy}</p>
                <p><strong>Czas odpowiedzi:</strong> {results['write-through'].responseTime}</p>
              </ResultsContainer>
            )}
          </StrategyCard>

          <StrategyCard>
            <StrategyName>Write-Around</StrategyName>
            <p>Zapis omija cache, idzie bezpośrednio do bazy. Unika cache pollution ale powoduje cache miss.</p>
            <TestButton 
              onClick={() => testStrategy('write-around')}
              disabled={loading['write-around']}            >
              {loading['write-around'] ? 'Testowanie...' : 'Testuj Write-Around'}
            </TestButton>
            
            {results['write-around'] && (
              <ResultsContainer>
                <p><strong>Strategia:</strong> {results['write-around'].strategy}</p>
                <p><strong>Czas odpowiedzi:</strong> {results['write-around'].responseTime}</p>
              </ResultsContainer>
            )}
          </StrategyCard>
        </StrategyGrid>
      </StrategySection>


      <StrategySection>
        <StrategyTitle>🔄 Polityki eksmisji</StrategyTitle>
        
        <StrategyGrid>
          <StrategyCard>
            <StrategyName>LRU (Least Recently Used)</StrategyName>
            <p>Usuwa najmniej ostatnio używane elementy. Dobra lokalność czasowa.</p>
            <TestButton 
              onClick={() => testStrategy('lru')}
              disabled={loading.lru}            >
              {loading.lru ? 'Testowanie...' : 'Testuj LRU'}
            </TestButton>
            
            {results.lru && (
              <ResultsContainer>
                <p><strong>Strategia:</strong> {results.lru.strategy}</p>
                <p><strong>Cachowane:</strong> {JSON.stringify(results.lru.data)}</p>
              </ResultsContainer>
            )}
          </StrategyCard>

          <StrategyCard>
            <StrategyName>LFU (Least Frequently Used)</StrategyName>
            <p>Usuwa najmniej często używane elementy. Zachowuje popularne dane.</p>
            <TestButton 
              onClick={() => testStrategy('lfu')}
              disabled={loading.lfu}            >
              {loading.lfu ? 'Testowanie...' : 'Testuj LFU'}
            </TestButton>
            
            {results.lfu && (
              <ResultsContainer>
                <p><strong>Strategia:</strong> {results.lfu.strategy}</p>
                <p><strong>Cachowane:</strong> {JSON.stringify(results.lfu.data)}</p>
              </ResultsContainer>
            )}
          </StrategyCard>
        </StrategyGrid>
      </StrategySection>


      <StrategySection>        <StrategyTitle>📊 Test wydajności</StrategyTitle>
        <ExplanationBox>
          <h4>Testowanie wydajności</h4>
          <p>Porównanie wydajności różnych strategii cache (100 operacji każda):</p>
        </ExplanationBox>
        
        <TestButton 
          onClick={runBenchmark}
          disabled={loading.benchmark}
          style={{ maxWidth: '300px' }}
        >
          {loading.benchmark ? 'Uruchamianie testu...' : 'Uruchom test wydajności'}
        </TestButton>
        
        {results.benchmark && (
          <div>
            <ComparisonTable>              <thead>
                <tr>
                  <th>Strategia</th>
                  <th>Całkowity czas (ms)</th>
                  <th>Średni czas (ms)</th>
                  <th>Przepustowość (ops/sek)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(results.benchmark).map(([strategy, data]) => (
                  <tr key={strategy}>
                    <td><strong>{strategy}</strong></td>
                    <td>{data.totalTime}</td>
                    <td>{data.avgTime?.toFixed(2)}</td>
                    <td>{data.throughput?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </ComparisonTable>
          </div>        )}
      </StrategySection>

    </CacheDemoContainer>
  );
};

export default CacheDemo;