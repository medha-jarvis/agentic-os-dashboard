'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/proxy/portfolio/analytics/returns').then(r => r.json()),
      fetch('/api/proxy/portfolio/analytics/performers').then(r => r.json()),
      fetch('/api/proxy/portfolio/analytics/concentration').then(r => r.json()),
      fetch('/api/proxy/portfolio/analytics/risk').then(r => r.json()),
      fetch('/api/proxy/portfolio/analytics/quality').then(r => r.json())
    ])
      .then(([returns, performers, concentration, risk, quality]) => {
        setData({ returns, performers, concentration, risk, quality });
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading analytics:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-white">Loading Performance Analytics...</div>;
  if (!data) return <div className="p-8 text-red-500">Error loading analytics</div>;

  const { returns, performers, concentration, risk, quality } = data;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/portfolio" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Portfolio
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Performance Analytics</h1>
          <p className="text-gray-400">Phase 2D: Risk metrics, returns, and portfolio quality</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">All-Time Return</div>
            <div className="text-3xl font-bold text-green-400">
              +{returns.returns.all_time.return_pct.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ₹{(returns.returns.all_time.return_value / 100000).toFixed(2)}L
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Sharpe Ratio</div>
            <div className={`text-3xl font-bold ${
              risk.sharpe_ratio > 1 ? 'text-green-400' :
              risk.sharpe_ratio > 0.5 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {risk.sharpe_ratio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{risk.risk_assessment}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Volatility</div>
            <div className="text-3xl font-bold text-white">
              {risk.volatility_stddev.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Standard Deviation</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Diversification</div>
            <div className="text-3xl font-bold text-green-400">
              {concentration.diversification_score}
            </div>
            <div className="text-xs text-gray-500 mt-1">HHI: {concentration.herfindahl_index.toFixed(0)}</div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 bg-green-900 bg-opacity-30 border-b border-gray-600">
              <h2 className="text-xl font-bold text-white">Top 5 Performers</h2>
            </div>
            <div className="p-4">
              <table className="w-full">
                <thead className="text-gray-400 text-sm">
                  <tr>
                    <th className="text-left pb-3">Stock</th>
                    <th className="text-right pb-3">Return</th>
                    <th className="text-right pb-3">P&L</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {performers.top_performers.map((stock: any, idx: number) => (
                    <tr key={idx} className="border-t border-gray-700">
                      <td className="py-3">
                        <div className="font-medium">{stock.symbol}</div>
                        <div className="text-xs text-gray-400">{stock.sector}</div>
                      </td>
                      <td className="text-right py-3 text-green-400 font-bold">
                        +{stock.return_pct.toFixed(2)}%
                      </td>
                      <td className="text-right py-3 text-green-400">
                        +₹{(stock.return_value / 100000).toFixed(2)}L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 bg-red-900 bg-opacity-30 border-b border-gray-600">
              <h2 className="text-xl font-bold text-white">Bottom 5 Performers</h2>
            </div>
            <div className="p-4">
              <table className="w-full">
                <thead className="text-gray-400 text-sm">
                  <tr>
                    <th className="text-left pb-3">Stock</th>
                    <th className="text-right pb-3">Return</th>
                    <th className="text-right pb-3">P&L</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {performers.bottom_performers.map((stock: any, idx: number) => (
                    <tr key={idx} className="border-t border-gray-700">
                      <td className="py-3">
                        <div className="font-medium">{stock.symbol}</div>
                        <div className="text-xs text-gray-400">{stock.sector}</div>
                      </td>
                      <td className="text-right py-3 text-red-400 font-bold">
                        {stock.return_pct.toFixed(2)}%
                      </td>
                      <td className="text-right py-3 text-red-400">
                        ₹{(stock.return_value / 100000).toFixed(2)}L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Concentration Analysis */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Concentration Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-gray-400 text-sm mb-2">Top 1 Holding</div>
              <div className="text-2xl font-bold text-white mb-1">
                {concentration.top1_pct.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">{concentration.top1_symbol}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">Top 3 Holdings</div>
              <div className="text-2xl font-bold text-white mb-1">
                {concentration.top3_pct.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">
                {concentration.top3_symbols.join(', ')}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">Top 5 Holdings</div>
              <div className="text-2xl font-bold text-white mb-1">
                {concentration.top5_pct.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">
                {concentration.top5_symbols.slice(0, 2).join(', ')} +3
              </div>
            </div>
          </div>
        </div>

        {/* Tax Efficiency */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Tax Efficiency & Holdings Quality</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-gray-400 text-sm mb-2">Long-Term Holdings</div>
              <div className="text-3xl font-bold text-green-400 mb-1">
                {quality.long_term.pct_of_portfolio.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">
                ₹{(quality.long_term.value / 10000000).toFixed(2)}Cr
              </div>
              <div className="text-xs text-green-400 mt-2">
                LTCG Eligible • Unrealized: ₹{(quality.long_term.unrealized_gains / 100000).toFixed(2)}L
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">Short-Term Holdings</div>
              <div className="text-3xl font-bold text-yellow-400 mb-1">
                {quality.short_term.pct_of_portfolio.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">
                ₹{(quality.short_term.value / 10000000).toFixed(2)}Cr
              </div>
              <div className="text-xs text-yellow-400 mt-2">
                STCG Tax • Unrealized: ₹{(quality.short_term.unrealized_gains / 100000).toFixed(2)}L
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-700 rounded">
            <div className="text-sm text-gray-300">
              <span className="font-bold">Tax Efficiency Score: </span>
              <span className={
                quality.tax_efficiency_score === 'Excellent' ? 'text-green-400' :
                quality.tax_efficiency_score === 'Good' ? 'text-blue-400' :
                quality.tax_efficiency_score === 'Fair' ? 'text-yellow-400' : 'text-red-400'
              }>
                {quality.tax_efficiency_score}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Metrics Detail */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Risk Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-700 rounded">
              <div className="text-gray-400 text-xs mb-1">Max Gain</div>
              <div className="text-xl font-bold text-green-400">
                +{risk.max_gain_pct.toFixed(2)}%
              </div>
            </div>
            <div className="p-3 bg-gray-700 rounded">
              <div className="text-gray-400 text-xs mb-1">Max Loss</div>
              <div className="text-xl font-bold text-red-400">
                {risk.max_loss_pct.toFixed(2)}%
              </div>
            </div>
            <div className="p-3 bg-gray-700 rounded">
              <div className="text-gray-400 text-xs mb-1">Max Drawdown</div>
              <div className="text-xl font-bold text-red-400">
                {risk.max_drawdown_pct.toFixed(2)}%
              </div>
            </div>
            <div className="p-3 bg-gray-700 rounded">
              <div className="text-gray-400 text-xs mb-1">Risk-Free Rate</div>
              <div className="text-xl font-bold text-white">
                {risk.risk_free_rate}%
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            {risk.note}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          Data as of {returns.date} • Phase 2D Complete
        </div>
      </div>
    </div>
  );
}
