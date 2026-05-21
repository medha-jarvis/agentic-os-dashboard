'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react';

type SortColumn = 'stock' | 'quantity' | 'portfolioPct' | 'invested' | 'avgPrice' |
  'currentPrice' | 'value' | 'pl' | 'returns' | 'dayPL' | 'dayReturns' | 'action';
type SortDirection = 'asc' | 'desc';

interface Holding {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  quantityFormatted: string;
  portfolioWeightPct: number;
  portfolioWeightFormatted: string;
  invested: number;
  investedFormatted: string;
  avgPrice: number;
  avgPriceFormatted: string;
  currentPrice: number;
  currentPriceFormatted: string;
  currentValue: number;
  currentValueFormatted: string;
  unrealizedPL: number;
  unrealizedPLFormatted: string;
  returnsPct: number;
  dayPL: number;
  dayPLFormatted: string;
  dayReturnPct: number;
  recommendedAction: string;
  recommendedActionColor: string;
  recommendedActionReason: string;
}

interface Overview {
  totalValue: number;
  totalValueFormatted: string;
  totalInvested: number;
  totalInvestedFormatted: string;
  totalPL: number;
  totalPLFormatted: string;
  totalReturnPct: number;
  holdingsCount: number;
  dayPL: number;
  dayPLFormatted: string;
  dayReturnPct: number;
}

interface ChartData {
  topHoldings: Array<{ name: string; value: number; valueFormatted: string }>;
  sectorAllocation: Array<{ name: string; value: number; valueFormatted: string; percentage: string }>;
  plDistribution: { gainers: number; losers: number; breakeven: number };
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

const ACTION_COLORS = {
  ADD: 'text-emerald-500 bg-emerald-500/10',
  ACCUMULATE: 'text-blue-500 bg-blue-500/10',
  HOLD: 'text-green-500 bg-green-500/10',
  REVIEW: 'text-orange-500 bg-orange-500/10',
  TRIM: 'text-yellow-500 bg-yellow-500/10',
  SELL: 'text-red-500 bg-red-500/10',
};

export default function EnhancedPortfolioPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortColumn, setSortColumn] = useState<SortColumn>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewRes, holdingsRes, chartsRes] = await Promise.all([
        fetch('/api/proxy/portfolio/enhanced/overview'),
        fetch('/api/proxy/portfolio/enhanced/holdings'),
        fetch('/api/proxy/portfolio/charts'),
      ]);

      if (!overviewRes.ok || !holdingsRes.ok || !chartsRes.ok) {
        throw new Error('Failed to fetch portfolio data');
      }

      const overviewData = await overviewRes.json();
      const holdingsData = await holdingsRes.json();
      const chartsData = await chartsRes.json();

      setOverview(overviewData);
      setHoldings(holdingsData.holdings || holdingsData);
      setChartData(chartsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load portfolio data');
      console.error('Portfolio fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      console.log('[Refresh] Starting price refresh (takes ~76 seconds)...');

      const response = await fetch('/api/proxy/portfolio/refresh', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh prices');
      }

      const result = await response.json();
      console.log('[Refresh] Price refresh completed:', result);

      // Immediately refetch data to show updated prices and day P&L
      await fetchData();
      setRefreshing(false);
    } catch (err: any) {
      console.error('Refresh error:', err);
      setError('Failed to refresh prices. Please try again.');
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedHoldings = [...holdings].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    switch (sortColumn) {
      case 'stock': return direction * a.name.localeCompare(b.name);
      case 'quantity': return direction * (a.quantity - b.quantity);
      case 'portfolioPct': return direction * (a.portfolioWeightPct - b.portfolioWeightPct);
      case 'invested': return direction * (a.invested - b.invested);
      case 'avgPrice': return direction * (a.avgPrice - b.avgPrice);
      case 'currentPrice': return direction * (a.currentPrice - b.currentPrice);
      case 'value': return direction * (a.currentValue - b.currentValue);
      case 'pl': return direction * (a.unrealizedPL - b.unrealizedPL);
      case 'returns': return direction * (a.returnsPct - b.returnsPct);
      case 'dayPL': return direction * (a.dayPL - b.dayPL);
      case 'dayReturns': return direction * (a.dayReturnPct - b.dayReturnPct);
      case 'action': return direction * a.recommendedAction.localeCompare(b.recommendedAction);
      default: return 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading portfolio data...</div>
      </div>
    );
  }

  if (error || !overview || !chartData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-500 text-xl">Error: {error || 'Failed to load data'}</div>
      </div>
    );
  }

  const bestPerformer = holdings.reduce((best, h) =>
    h.returnsPct > best.returnsPct ? h : best, holdings[0]
  );

  const worstPerformer = holdings.reduce((worst, h) =>
    h.returnsPct < worst.returnsPct ? h : worst, holdings[0]
  );

  const gainersToday = holdings.filter(h => h.dayReturnPct > 0).length;
  const losersToday = holdings.filter(h => h.dayReturnPct < 0).length;

  const SortIcon = ({ column }: { column: SortColumn }) => (
    <span className="ml-1 text-xs">
      {sortColumn === column && (sortDirection === 'asc' ? '▲' : '▼')}
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Portfolio Command Center</h1>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded text-sm font-medium flex items-center gap-2"
              title={refreshing ? 'Fetching live prices from Zerodha (~76 seconds)' : 'Click to refresh prices'}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing (~76s)...' : 'Refresh Prices'}
            </button>
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

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <div className="text-sm text-slate-400 mb-1">Total Value</div>
            <div className="text-xl md:text-2xl font-bold text-emerald-400">
              {overview.totalValueFormatted}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Invested: {overview.totalInvestedFormatted}
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <div className="text-sm text-slate-400 mb-1">Total P&L</div>
            <div className={`text-xl md:text-2xl font-bold ${overview.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {overview.totalPLFormatted}
            </div>
            <div className={`text-xs font-semibold mt-1 ${overview.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {overview.totalReturnPct >= 0 ? '+' : ''}{overview.totalReturnPct.toFixed(2)}%
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <div className="text-sm text-slate-400 mb-1">Day's Change</div>
            <div className={`text-xl md:text-2xl font-bold ${overview.dayPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {overview.dayPLFormatted}
            </div>
            <div className={`text-xs font-semibold mt-1 ${overview.dayReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {overview.dayReturnPct >= 0 ? '+' : ''}{overview.dayReturnPct.toFixed(2)}%
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <div className="text-sm text-slate-400 mb-1">Holdings</div>
            <div className="text-xl md:text-2xl font-bold text-white">
              {overview.holdingsCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Total stocks
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-slate-900 p-3 md:p-4 rounded-lg border border-emerald-800/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <div className="text-xs text-slate-400">Gainers Today</div>
            </div>
            <div className="text-lg md:text-xl font-bold text-emerald-400">{gainersToday}</div>
          </div>

          <div className="bg-slate-900 p-3 md:p-4 rounded-lg border border-red-800/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <div className="text-xs text-slate-400">Losers Today</div>
            </div>
            <div className="text-lg md:text-xl font-bold text-red-400">{losersToday}</div>
          </div>

          <div className="bg-slate-900 p-3 md:p-4 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <div className="text-xs text-slate-400">Best Performer</div>
            </div>
            <div className="text-sm font-bold text-white truncate">{bestPerformer.symbol}</div>
            <div className="text-xs text-emerald-400">+{bestPerformer.returnsPct.toFixed(1)}%</div>
          </div>

          <div className="bg-slate-900 p-3 md:p-4 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-red-400" />
              <div className="text-xs text-slate-400">Worst Performer</div>
            </div>
            <div className="text-sm font-bold text-white truncate">{worstPerformer.symbol}</div>
            <div className="text-xs text-red-400">{worstPerformer.returnsPct.toFixed(1)}%</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top 10 Holdings Bar Chart */}
          <div className="bg-slate-900 p-4 md:p-6 rounded-lg border border-slate-800">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">Top 10 Holdings</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.topHoldings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(value: any, name: any, props: any) => [props.payload.valueFormatted, 'Value']}
                />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sector Allocation Pie Chart */}
          <div className="bg-slate-900 p-4 md:p-6 rounded-lg border border-slate-800">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">Sector Allocation</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.sectorAllocation}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.name}: ${props.percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.sectorAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  formatter={(value: any, name: any, props: any) => [props.payload.valueFormatted, 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-slate-900 rounded-lg p-4 md:p-6 border border-slate-800">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4">Holdings Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th
                    className="text-left p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('stock')}
                  >
                    Stock <SortIcon column="stock" />
                  </th>
                  <th
                    className="text-right p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('quantity')}
                  >
                    Qty <SortIcon column="quantity" />
                  </th>
                  <th
                    className="text-right p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('portfolioPct')}
                  >
                    % Portfolio <SortIcon column="portfolioPct" />
                  </th>
                  <th
                    className="text-right p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('invested')}
                  >
                    Invested <SortIcon column="invested" />
                  </th>
                  <th
                    className="text-right p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('avgPrice')}
                  >
                    Avg Price <SortIcon column="avgPrice" />
                  </th>
                  <th
                    className="text-right p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('currentPrice')}
                  >
                    Current <SortIcon column="currentPrice" />
                  </th>
                  <th
                    className="text-right p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('value')}
                  >
                    Value <SortIcon column="value" />
                  </th>
                  <th
                    className="text-right p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('pl')}
                  >
                    P&L <SortIcon column="pl" />
                  </th>
                  <th
                    className="text-right p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('returns')}
                  >
                    Returns % <SortIcon column="returns" />
                  </th>
                  <th
                    className="text-right p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('dayPL')}
                  >
                    Day P&L <SortIcon column="dayPL" />
                  </th>
                  <th
                    className="text-right p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('dayReturns')}
                  >
                    Day % <SortIcon column="dayReturns" />
                  </th>
                  <th
                    className="text-center p-2 text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('action')}
                  >
                    Action <SortIcon column="action" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.map((h) => (
                  <tr key={h.symbol} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="p-2">
                      <Link href={`/portfolio/company/${h.symbol}`}>
                        <div className="font-medium text-white hover:text-blue-400 cursor-pointer">
                          {h.name}
                        </div>
                        <div className="text-xs text-slate-500">{h.symbol}</div>
                      </Link>
                    </td>
                    <td className="text-right p-2 text-slate-300">{h.quantityFormatted}</td>
                    <td className="text-right p-2 text-slate-300 font-medium">
                      {h.portfolioWeightFormatted}
                    </td>
                    <td className="text-right p-2 text-slate-300">{h.investedFormatted}</td>
                    <td className="text-right p-2 text-slate-300">{h.avgPriceFormatted}</td>
                    <td className="text-right p-2 text-slate-300">{h.currentPriceFormatted}</td>
                    <td className="text-right p-2 text-white font-medium">
                      {h.currentValueFormatted}
                    </td>
                    <td className={`text-right p-2 font-medium ${h.unrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.unrealizedPLFormatted}
                    </td>
                    <td className={`text-right p-2 font-bold ${h.returnsPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.returnsPct >= 0 ? '+' : ''}{h.returnsPct.toFixed(2)}%
                    </td>
                    <td className={`text-right p-2 text-xs ${h.dayPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.dayPLFormatted}
                    </td>
                    <td className={`text-right p-2 text-xs ${h.dayReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.dayReturnPct >= 0 ? '+' : ''}{h.dayReturnPct.toFixed(2)}%
                    </td>
                    <td className="text-center p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${ACTION_COLORS[h.recommendedAction as keyof typeof ACTION_COLORS] || 'text-slate-400 bg-slate-800'}`}
                        title={h.recommendedActionReason}
                      >
                        {h.recommendedAction}
                      </span>
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
