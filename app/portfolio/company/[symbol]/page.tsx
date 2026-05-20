'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CompanyPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/proxy/portfolio/company/${symbol}`)
      .then(r => r.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading company:', err);
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return <div className="p-8 text-white">Loading {symbol}...</div>;
  if (!data || data.error) {
    return (
      <div className="p-8 text-red-500">
        Error loading {symbol}: {data?.error || 'Unknown error'}
      </div>
    );
  }

  const fmt = (n: number) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : `₹${(n/1e5).toFixed(2)}L`;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/portfolio" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Portfolio
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">{symbol}</h1>
          <p className="text-gray-400">{data.sector}</p>
        </div>

        {/* Price & Position Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Current Price</div>
            <div className="text-3xl font-bold text-white">₹{data.current_price.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">Avg: ₹{data.avg_price.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Your Position</div>
            <div className="text-3xl font-bold text-white">{fmt(data.current_value)}</div>
            <div className="text-xs text-gray-500 mt-1">{data.quantity} shares</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Unrealized P&L</div>
            <div className={`text-3xl font-bold ${
              data.unrealized_pl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {data.unrealized_pl >= 0 ? '+' : ''}{fmt(Math.abs(data.unrealized_pl))}
            </div>
            <div className={`text-xs mt-1 ${
              data.unrealized_pl_pct >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {data.unrealized_pl_pct >= 0 ? '+' : ''}{data.unrealized_pl_pct.toFixed(2)}%
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Portfolio Weight</div>
            <div className="text-3xl font-bold text-white">
              {data.portfolio_weight_pct.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">of total portfolio</div>
          </div>
        </div>

        {/* 52-Week Range */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">52-Week Range (Estimated)</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-gray-400 text-sm mb-2">52W Low</div>
              <div className="text-2xl font-bold text-red-400">
                ₹{data['52_week_low'].toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Current is {data.price_from_52w_low_pct.toFixed(1)}% above
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">Current</div>
              <div className="text-2xl font-bold text-white">
                ₹{data.current_price.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">52W High</div>
              <div className="text-2xl font-bold text-green-400">
                ₹{data['52_week_high'].toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Current is {Math.abs(data.price_from_52w_high_pct).toFixed(1)}% below
              </div>
            </div>
          </div>
        </div>

        {/* Position Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Position Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Quantity</span>
                <span className="text-white font-medium">{data.quantity} shares</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Long-Term (LTCG)</span>
                <span className="text-green-400 font-medium">{data.quantity_long_term} shares</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Short-Term (STCG)</span>
                <span className="text-yellow-400 font-medium">{data.quantity_short_term} shares</span>
              </div>
              <div className="border-t border-gray-700 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">LTCG Eligible</span>
                  <span className="text-white font-bold">{data.ltcg_eligible_pct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Value Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Average Price</span>
                <span className="text-white font-medium">₹{data.avg_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Price</span>
                <span className="text-white font-medium">₹{data.current_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Invested Value</span>
                <span className="text-white font-medium">{fmt(data.invested)}</span>
              </div>
              <div className="border-t border-gray-700 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Value</span>
                  <span className="text-white font-bold">{fmt(data.current_value)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wiki Analysis */}
        {data.wiki_analysis && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Investment Thesis (from Hermes Wiki)</h2>
            <div className="space-y-4">
              {data.wiki_analysis.thesis && (
                <div>
                  <div className="text-sm font-medium text-gray-400 mb-1">Thesis</div>
                  <div className="text-white">{data.wiki_analysis.thesis}</div>
                </div>
              )}
              {data.wiki_analysis.moat && (
                <div>
                  <div className="text-sm font-medium text-gray-400 mb-1">Moat</div>
                  <div className="text-white">{data.wiki_analysis.moat}</div>
                </div>
              )}
              {data.wiki_analysis.management_quality && (
                <div>
                  <div className="text-sm font-medium text-gray-400 mb-1">Management Quality</div>
                  <div className="text-white">{data.wiki_analysis.management_quality}</div>
                </div>
              )}
              {data.wiki_analysis.risk_factors && (
                <div>
                  <div className="text-sm font-medium text-gray-400 mb-1">Risk Factors</div>
                  <div className="text-white">{data.wiki_analysis.risk_factors}</div>
                </div>
              )}
              {data.wiki_analysis.content_preview && (
                <div className="mt-4 p-4 bg-gray-700 rounded">
                  <div className="text-sm text-gray-300 line-clamp-6">
                    {data.wiki_analysis.content_preview}
                  </div>
                  <a
                    href={`/docker/hermes-agent-owlt/data/wiki/entities/${data.wiki_analysis.wiki_file}`}
                    className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                  >
                    Read full analysis →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {!data.wiki_analysis && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-center">
              No wiki analysis available for {symbol}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          Data as of {data.date} • Phase 2C: Company Deep Dive
        </div>
      </div>
    </div>
  );
}
