import React, { useState } from 'react';
import { lookupDomain } from './utils/domainLookup';

const App = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleLookup = async () => {
    const lookupResult = await lookupDomain(domain);
    setResult(lookupResult);
  };

  return (
    <div>
      <h1>Domain Lookup Tool</h1>
      <input
        type="text"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="Enter a domain (e.g., example.com)"
      />
      <button onClick={handleLookup}>Lookup</button>
      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
};

export default App;
