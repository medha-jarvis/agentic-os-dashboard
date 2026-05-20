'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SectorsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/proxy/portfolio/sectors/allocation').then(r => r.json()),
      fetch('/api/proxy/portfolio/sectors/concentration').then(r => r.json())
    ])
      .then(([allocation, concentration]) => {
        setData({ allocation, concentration });
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading sectors:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-white">Loading Sector Analysis...</div>;
  if (!data) return <div className="p-8 text-red-500">Error loading sector data</div>;

  const { allocation, concentration } = data;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/portfolio" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Portfolio
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Sector Analysis</h1>
          <p className="text-gray-400">Phase 2B: Sector-level portfolio breakdown</p>
        </div>

        {/* Concentration Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Total Sectors</div>
            <div className="text-2xl font-bold text-white">{concentration.total_sectors}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Top 3 Concentration</div>
            <div className="text-2xl font-bold text-white">
              {concentration.top3_concentration_pct.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Top 5 Concentration</div>
            <div className="text-2xl font-bold text-white">
              {concentration.top5_concentration_pct.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Diversification</div>
            <div className="text-2xl font-bold text-green-400">
              {concentration.diversification_score}
            </div>
            <div className="text-xs text-gray-500 mt-1">HHI: {concentration.herfindahl_index.toFixed(0)}</div>
          </div>
        </div>

        {/* Sector Allocation Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-700 border-b border-gray-600">
            <h2 className="text-xl font-bold text-white">Sector Allocation</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 text-gray-300 text-sm">
                <tr>
                  <th className="px-4 py-3 text-left">Sector</th>
                  <th className="px-4 py-3 text-right">Holdings</th>
                  <th className="px-4 py-3 text-right">Value (₹)</th>
                  <th className="px-4 py-3 text-right">Allocation</th>
                  <th className="px-4 py-3 text-right">Return %</th>
                  <th className="px-4 py-3 text-right">P&L (₹)</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {allocation.sectors.map((sector: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <div className="font-medium">{sector.sector}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {sector.holdings.slice(0, 3).map((h: any) => h.symbol).join(', ')}
                        {sector.holdings.length > 3 && ` +${sector.holdings.length - 3}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{sector.holdings_count}</td>
                    <td className="px-4 py-3 text-right">
                      ₹{(sector.total_value / 100000).toFixed(2)}L
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end">
                        <div className="w-20 bg-gray-700 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(sector.allocation_pct, 100)}%` }}
                          />
                        </div>
                        <span>{sector.allocation_pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      sector.return_pct >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {sector.return_pct >= 0 ? '+' : ''}{sector.return_pct.toFixed(2)}%
                    </td>
                    <td className={`px-4 py-3 text-right ${
                      sector.unrealized_pl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {sector.unrealized_pl >= 0 ? '+' : ''}₹{(sector.unrealized_pl / 100000).toFixed(2)}L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          Data as of {allocation.date} • Phase 2B Complete
        </div>
      </div>
    </div>
  );
}
