'use client';

import { useEffect, useState } from 'react';

export default function PortfolioTest() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Test] Starting fetch...');

    fetch('/api/proxy/portfolio/overview')
      .then(res => {
        console.log('[Test] Response received:', res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('[Test] Data:', data);
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('[Test] Error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-white">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl mb-4">Portfolio Test</h1>
      <pre className="bg-slate-800 p-4 rounded overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
