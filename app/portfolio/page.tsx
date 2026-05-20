'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PortfolioPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/proxy/portfolio/overview').then(r => r.json()),
      fetch('/api/proxy/portfolio/holdings').then(r => r.json())
    ]).then(([overview, holdings]) => {
      setData({ overview, holdings: holdings.holdings });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-white">Loading...</div>;
  if (!data) return <div className="p-8 text-red-500">Error loading portfolio</div>;

  const fmt = (n: number) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : `₹${(n/1e5).toFixed(2)}L`;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Portfolio Command Center</h1>
          <div className="flex gap-3">
            <Link
              href="/portfolio/sectors"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
            >
              Sector Analysis
            </Link>
            <Link
              href="/portfolio/analytics"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium"
            >
              Performance Analytics
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 p-4 rounded">
            <div className="text-sm text-slate-400">Total Value</div>
            <div className="text-2xl font-bold text-emerald-400">{fmt(data.overview.totalValue)}</div>
          </div>
          <div className="bg-slate-900 p-4 rounded">
            <div className="text-sm text-slate-400">Total P&L</div>
            <div className={`text-2xl font-bold ${data.overview.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmt(data.overview.totalPL)}
            </div>
          </div>
          <div className="bg-slate-900 p-4 rounded">
            <div className="text-sm text-slate-400">Returns</div>
            <div className="text-2xl font-bold text-emerald-400">{data.overview.totalReturnPct.toFixed(2)}%</div>
          </div>
          <div className="bg-slate-900 p-4 rounded">
            <div className="text-sm text-slate-400">Holdings</div>
            <div className="text-2xl font-bold text-white">{data.overview.holdingsCount}</div>
          </div>
        </div>

        <div className="bg-slate-900 rounded p-6">
          <h2 className="text-xl font-bold text-white mb-4">Holdings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-2 text-slate-400">Stock</th>
                  <th className="text-right p-2 text-slate-400">Qty</th>
                  <th className="text-right p-2 text-slate-400">Price</th>
                  <th className="text-right p-2 text-slate-400">Value</th>
                  <th className="text-right p-2 text-slate-400">P&L</th>
                  <th className="text-right p-2 text-slate-400">Returns</th>
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h: any) => (
                  <tr key={h.symbol} className="border-b border-slate-800 hover:bg-slate-800">
                    <td className="p-2">
                      <Link href={`/portfolio/company/${h.symbol}`}>
                        <div className="font-medium text-white hover:text-blue-400 cursor-pointer">{h.name}</div>
                        <div className="text-xs text-slate-500">{h.symbol}</div>
                      </Link>
                    </td>
                    <td className="text-right p-2 text-slate-300">{h.quantity}</td>
                    <td className="text-right p-2 text-slate-300">₹{h.currentPrice.toFixed(2)}</td>
                    <td className="text-right p-2 text-white font-medium">{fmt(h.currentValue)}</td>
                    <td className={`text-right p-2 font-medium ${h.unrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(Math.abs(h.unrealizedPL))}
                    </td>
                    <td className={`text-right p-2 font-bold ${h.returnsPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.returnsPct >= 0 ? '+' : ''}{h.returnsPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
