'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// Color palette
const COLORS = {
  primary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  success: '#22c55e',
  muted: '#6b7280',
};

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#a855f7'
];

// Indian number formatting
const formatIndian = (num: number): string => {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 10000000) {
    return `${sign}₹${(absNum / 10000000).toFixed(2)} Cr`;
  } else if (absNum >= 100000) {
    return `${sign}₹${(absNum / 100000).toFixed(2)} L`;
  } else if (absNum >= 1000) {
    return `${sign}₹${(absNum / 1000).toFixed(2)} K`;
  }
  return `${sign}₹${absNum.toFixed(0)}`;
};

const formatIndianNoDecimal = (num: number): string => {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 10000000) {
    return `${sign}₹${Math.round(absNum / 10000000)} Cr`;
  } else if (absNum >= 100000) {
    return `${sign}₹${Math.round(absNum / 100000)} L`;
  } else if (absNum >= 1000) {
    return `${sign}₹${Math.round(absNum / 1000)} K`;
  }
  return `${sign}₹${Math.round(absNum)}`;
};

// Performance color based on return
const getPerformanceColor = (returnPct: number): string => {
  if (returnPct >= 50) return 'text-emerald-400';
  if (returnPct >= 20) return 'text-green-400';
  if (returnPct >= 0) return 'text-green-300';
  if (returnPct >= -10) return 'text-orange-400';
  return 'text-red-400';
};

const getPerformanceBg = (returnPct: number): string => {
  if (returnPct >= 50) return 'bg-emerald-500/20';
  if (returnPct >= 20) return 'bg-green-500/20';
  if (returnPct >= 0) return 'bg-green-500/10';
  if (returnPct >= -10) return 'bg-orange-500/10';
  return 'bg-red-500/20';
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  takeaway?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  takeaway,
  trend,
  color = 'text-white'
}) => (
  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-all">
    <div className="flex items-start justify-between mb-2">
      <div className="text-sm text-gray-400">{title}</div>
      {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
      {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
      {trend === 'neutral' && <Info className="w-4 h-4 text-blue-400" />}
    </div>
    <div className={`text-2xl md:text-3xl font-bold ${color} mb-1`}>
      {value}
    </div>
    {subtitle && (
      <div className="text-xs text-gray-500 mb-2">{subtitle}</div>
    )}
    {takeaway && (
      <div className="text-xs text-gray-300 bg-gray-750 px-2 py-1 rounded mt-2">
        {takeaway}
      </div>
    )}
  </div>
);

type SortColumn = 'symbol' | 'return_pct' | 'value' | 'invested';
type SortDirection = 'asc' | 'desc';

export default function EnhancedAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('return_pct');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
        setError(err.message || 'Failed to load analytics data');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading Performance Analytics...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-xl">Error: {error || 'Failed to load data'}</div>
      </div>
    );
  }

  const { returns, performers, concentration, risk, quality } = data;

  // Sort performers for table
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const allPerformers = [
    ...performers.top_performers,
    ...performers.bottom_performers
  ];

  const sortedPerformers = [...allPerformers].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    switch (sortColumn) {
      case 'symbol': return direction * a.symbol.localeCompare(b.symbol);
      case 'return_pct': return direction * (a.return_pct - b.return_pct);
      case 'value': return direction * (a.current_value - b.current_value);
      case 'invested': return direction * (a.invested - b.invested);
      default: return 0;
    }
  });

  // Prepare chart data
  const performersBarData = [
    ...performers.top_performers.slice(0, 5).map((p: any) => ({
      name: p.symbol,
      return: p.return_pct,
      fill: COLORS.success
    })),
    ...performers.bottom_performers.slice(0, 5).reverse().map((p: any) => ({
      name: p.symbol,
      return: p.return_pct,
      fill: COLORS.danger
    }))
  ];

  // Risk-return scatter data
  const scatterData = allPerformers.map((p: any) => ({
    x: Math.abs(p.return_pct), // Using absolute return as proxy for risk
    y: p.return_pct,
    symbol: p.symbol,
    size: p.current_value,
  }));

  // Concentration pie data
  const concentrationData = [
    { name: 'Top 1', value: concentration.top1_pct, color: CHART_COLORS[0] },
    { name: 'Top 2-3', value: concentration.top3_pct - concentration.top1_pct, color: CHART_COLORS[1] },
    { name: 'Top 4-5', value: concentration.top5_pct - concentration.top3_pct, color: CHART_COLORS[2] },
    { name: 'Top 6-10', value: concentration.top10_pct - concentration.top5_pct, color: CHART_COLORS[3] },
    { name: 'Others', value: 100 - concentration.top10_pct, color: CHART_COLORS[4] }
  ];

  // Tax efficiency data
  const taxData = [
    { name: 'Long-Term', value: quality.long_term.pct_of_portfolio, color: COLORS.success },
    { name: 'Short-Term', value: quality.short_term.pct_of_portfolio, color: COLORS.warning }
  ];

  const SortIcon = ({ column }: { column: SortColumn }) => (
    <span className="ml-1 text-xs">
      {sortColumn === column && (sortDirection === 'asc' ? '▲' : '▼')}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Link href="/portfolio" className="hover:text-emerald-400 transition-colors">
                Portfolio
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Performance Analytics</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Performance Analytics
            </h1>
            <p className="text-gray-400">
              Comprehensive risk metrics, returns analysis, and portfolio insights
            </p>
          </div>
          <Link
            href="/portfolio"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            ← Back to Portfolio
          </Link>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <MetricCard
            title="All-Time Return"
            value={`+${returns.returns.all_time.return_pct.toFixed(2)}%`}
            subtitle={formatIndianNoDecimal(returns.returns.all_time.return_value)}
            takeaway={returns.returns.all_time.takeaway}
            trend="up"
            color="text-emerald-400"
          />
          <MetricCard
            title="Sharpe Ratio"
            value={risk.sharpe_ratio.toFixed(2)}
            subtitle={risk.risk_assessment}
            takeaway={risk.sharpe_takeaway}
            trend={risk.sharpe_ratio > 1 ? 'up' : risk.sharpe_ratio > 0.5 ? 'neutral' : 'down'}
            color={
              risk.sharpe_ratio > 1 ? 'text-green-400' :
              risk.sharpe_ratio > 0.5 ? 'text-yellow-400' : 'text-red-400'
            }
          />
          <MetricCard
            title="Volatility (Std Dev)"
            value={`${risk.volatility_stddev.toFixed(1)}%`}
            subtitle="Portfolio dispersion"
            trend="neutral"
            color="text-orange-400"
          />
          <MetricCard
            title="Diversification"
            value={concentration.diversification_score}
            subtitle={`HHI: ${Math.round(concentration.herfindahl_index)}`}
            takeaway={concentration.diversification_takeaway}
            trend="up"
            color="text-green-400"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Max Gain</div>
            <div className="text-lg font-bold text-green-400">
              +{risk.max_gain_pct.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Max Loss</div>
            <div className="text-lg font-bold text-red-400">
              {risk.max_loss_pct.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Max Drawdown</div>
            <div className="text-lg font-bold text-red-400">
              {risk.max_drawdown_pct.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Top 3 Conc.</div>
            <div className="text-lg font-bold text-white">
              {concentration.top3_pct.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">{concentration.concentration_takeaway}</div>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">LTCG Eligible</div>
            <div className="text-lg font-bold text-green-400">
              {quality.long_term.pct_of_portfolio.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Tax Efficiency</div>
            <div className={`text-lg font-bold ${
              quality.tax_efficiency_score === 'Excellent' ? 'text-green-400' :
              quality.tax_efficiency_score === 'Good' ? 'text-blue-400' :
              quality.tax_efficiency_score === 'Fair' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {quality.tax_efficiency_score}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top/Bottom Performers Bar Chart */}
          <div className="bg-gray-800 p-4 md:p-6 rounded-lg border border-gray-700">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">
              Top 5 vs Bottom 5 Performers
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={performersBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => `${value.toFixed(2)}%`}
                />
                <Bar dataKey="return" radius={[0, 4, 4, 0]}>
                  {performersBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk-Return Scatter */}
          <div className="bg-gray-800 p-4 md:p-6 rounded-lg border border-gray-700">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">
              Risk-Return Profile
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Risk"
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Volatility (%)', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Return"
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Return (%)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === 'y') return [`${value.toFixed(2)}%`, 'Return'];
                    if (name === 'x') return [`${value.toFixed(2)}%`, 'Risk'];
                    return [value, String(name || '')];
                  }}
                  labelFormatter={(label: any, payload: any) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.symbol;
                    }
                    return label;
                  }}
                />
                <Scatter data={scatterData} fill={COLORS.info}>
                  {scatterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.y >= 0 ? COLORS.success : COLORS.danger}
                      opacity={0.7}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Concentration Visualization */}
          <div className="bg-gray-800 p-4 md:p-6 rounded-lg border border-gray-700">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">
              Portfolio Concentration
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={concentrationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {concentrationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => `${value.toFixed(2)}%`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Top 1 ({concentration.top1_symbol}):</span>
                <span className="font-bold">{concentration.top1_pct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Top 3 ({concentration.top3_symbols.slice(0, 2).join(', ')}, +1):</span>
                <span className="font-bold">{concentration.top3_pct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Top 10:</span>
                <span className="font-bold">{concentration.top10_pct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Tax Efficiency Pie */}
          <div className="bg-gray-800 p-4 md:p-6 rounded-lg border border-gray-700">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">
              Tax Efficiency & Holdings Quality
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taxData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taxData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => `${value.toFixed(2)}%`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-green-900/20 border border-green-700/30 rounded">
                <div className="text-xs text-gray-400 mb-1">Long-Term (LTCG)</div>
                <div className="text-lg font-bold text-green-400">
                  {formatIndianNoDecimal(quality.long_term.value)}
                </div>
                <div className="text-xs text-green-300 mt-1">
                  Unrealized: {formatIndianNoDecimal(quality.long_term.unrealized_gains)}
                </div>
              </div>
              <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded">
                <div className="text-xs text-gray-400 mb-1">Short-Term (STCG)</div>
                <div className="text-lg font-bold text-yellow-400">
                  {formatIndianNoDecimal(quality.short_term.value)}
                </div>
                <div className="text-xs text-yellow-300 mt-1">
                  Unrealized: {formatIndianNoDecimal(quality.short_term.unrealized_gains)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All Performers Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mb-6">
          <div className="p-4 md:p-6 bg-gray-750 border-b border-gray-600">
            <h2 className="text-lg md:text-xl font-bold text-white">
              All Holdings Performance
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Click on any symbol to view company deep dive
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700 text-gray-300">
                <tr>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-white"
                    onClick={() => handleSort('symbol')}
                  >
                    Stock <SortIcon column="symbol" />
                  </th>
                  <th className="px-4 py-3 text-left">Sector</th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort('return_pct')}
                  >
                    Return % <SortIcon column="return_pct" />
                  </th>
                  <th className="px-4 py-3 text-right">P&L</th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort('value')}
                  >
                    Current Value <SortIcon column="value" />
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort('invested')}
                  >
                    Invested <SortIcon column="invested" />
                  </th>
                </tr>
              </thead>
              <tbody className="text-white">
                {sortedPerformers.map((stock: any, idx: number) => (
                  <tr
                    key={idx}
                    className={`border-b border-gray-700 hover:bg-gray-750 transition-colors ${getPerformanceBg(stock.return_pct)}`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/portfolio/company/${stock.symbol}`}
                        className="font-medium text-white hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        {stock.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {stock.sector}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${getPerformanceColor(stock.return_pct)}`}>
                      {stock.return_pct >= 0 ? '+' : ''}{stock.return_pct.toFixed(2)}%
                    </td>
                    <td className={`px-4 py-3 text-right ${getPerformanceColor(stock.return_pct)}`}>
                      {stock.return_value >= 0 ? '+' : ''}{formatIndian(stock.return_value)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatIndian(stock.current_value)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatIndian(stock.invested)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border border-emerald-700/30 rounded-lg p-4 md:p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Key Takeaways
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></div>
              <div className="text-sm">
                <span className="text-gray-400">Portfolio Return: </span>
                <span className="text-white font-medium">{returns.returns.all_time.takeaway}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
              <div className="text-sm">
                <span className="text-gray-400">Risk Profile: </span>
                <span className="text-white font-medium">{risk.sharpe_takeaway}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
              <div className="text-sm">
                <span className="text-gray-400">Diversification: </span>
                <span className="text-white font-medium">{concentration.diversification_takeaway}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></div>
              <div className="text-sm">
                <span className="text-gray-400">Concentration: </span>
                <span className="text-white font-medium">{concentration.concentration_takeaway}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5"></div>
              <div className="text-sm">
                <span className="text-gray-400">Best Performer: </span>
                <Link
                  href={`/portfolio/company/${performers.top_performers[0].symbol}`}
                  className="text-white font-medium hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {performers.top_performers[0].symbol} (+{performers.top_performers[0].return_pct.toFixed(1)}%)
                </Link>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
              <div className="text-sm">
                <span className="text-gray-400">Needs Review: </span>
                <Link
                  href={`/portfolio/company/${performers.bottom_performers[0].symbol}`}
                  className="text-white font-medium hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {performers.bottom_performers[0].symbol} ({performers.bottom_performers[0].return_pct.toFixed(1)}%)
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-xs md:text-sm">
          Data as of {returns.date} • Click stock symbols to view detailed thesis • {risk.note}
        </div>
      </div>
    </div>
  );
}
