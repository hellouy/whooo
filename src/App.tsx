import React, { useState } from 'react';
import { lookupDomain } from './utils/domainLookup';

const App = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    setLoading(true);
    const lookupResult = await lookupDomain(domain);
    setResult(lookupResult);
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>域名查询工具</h1>
      <input
        type="text"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="输入域名 (例如: example.com)"
        style={{
          padding: '10px',
          width: '300px',
          marginBottom: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}
      />
      <button
        onClick={handleLookup}
        style={{
          padding: '10px',
          backgroundColor: '#007BFF',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        查询
      </button>
      {loading && <p>查询中...</p>}
      {result && (
        <div style={{ marginTop: '20px' }}>
          <h2>查询结果</h2>
          <p><strong>域名:</strong> {result.domain}</p>
          <p><strong>状态:</strong> {result.status.join(', ')}</p>
          <p><strong>标签:</strong> {result.tags.join(', ')}</p>
        </div>
      )}
    </div>
  );
};

export default App;
