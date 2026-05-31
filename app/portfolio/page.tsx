'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Activity, BarChart2, Database } from 'lucide-react';

type SortColumn = 'stock' | 'qty' | 'pct' | 'invested' | 'avgPrice' | 'currentPrice' | 'value' | 'pl' | 'returns' | 'irr';
type SortDirection = 'asc' | 'desc';

interface DbHolding {
  symbol: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  invested: number;
  currentValue: number;
  gainLoss: number;
  gainPct: number;
  irr: number | null;
  portfolioPct: number;
}

interface DbSummary {
  totalInvested: number;
  totalValue: number;
  totalGain: number;
  gainPct: number;
  xirr: number | null;
  twrrAnnualised: number;
  twrrPeriods: { '1yr': number | null; '3yr': number | null; '5yr': number | null; inception: number };
  holdingsCount: number;
  latestNAV: number | null;
}

interface NavPoint {
  month: string;
  portfolioValue: number;
  nav: number | null;
  monthlyReturn: number | null;
  sensex: number | null;
}

interface AnnualReturn {
  year: string | number;
  portfolioReturn: number;
  sensexReturn: number | null;
  alpha: number | null;
}

const COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#a855f7'];

const fmt = (n: number, decimals = 2) =>
  n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(2)}L` : `₹${n.toFixed(0)}`;

const pct = (n: number | null, suffix = '%') => n != null ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}${suffix}` : '—';

const irrColor = (irr: number | null) => {
  if (irr == null) return 'text-slate-400';
  if (irr >= 25) return 'text-emerald-300 font-bold';
  if (irr >= 15) return 'text-emerald-400';
  if (irr >= 0) return 'text-yellow-400';
  return 'text-red-400';
};

const irrBg = (irr: number | null) => {
  if (irr == null) return '';
  if (irr >= 25) return 'bg-emerald-500/20';
  if (irr >= 15) return 'bg-emerald-500/10';
  if (irr >= 0) return 'bg-yellow-500/10';
  return 'bg-red-500/10';
};

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<DbHolding[]>([]);
  const [summary, setSummary] = useState<DbSummary | null>(null);
  const [navSeries, setNavSeries] = useState<NavPoint[]>([]);
  const [annualReturns, setAnnualReturns] = useState<AnnualReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [navView, setNavView] = useState<'nav' | 'value' | 'monthly'>('nav');
  const [navRange, setNavRange] = useState<'all' | '5yr' | '3yr' | '1yr'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/proxy/db/portfolio');
      if (!res.ok) throw new Error('Failed to fetch DB portfolio');
      const data = await res.json();
      setHoldings(data.holdings || []);
      setSummary(data.summary || null);
      setNavSeries(data.navSeries || []);
      setAnnualReturns(data.annualReturns || []);
      setLastUpdated(data.lastUpdated || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/proxy/db/portfolio/refresh', { method: 'POST' });
      await fetchData();
    } catch (err: any) {
      setError('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('desc'); }
  };

  const sorted = [...holdings].sort((a, b) => {
    const d = sortDirection === 'asc' ? 1 : -1;
    switch (sortColumn) {
      case 'stock': return d * a.symbol.localeCompare(b.symbol);
      case 'qty': return d * (a.qty - b.qty);
      case 'pct': return d * (a.portfolioPct - b.portfolioPct);
      case 'invested': return d * (a.invested - b.invested);
      case 'avgPrice': return d * (a.avgPrice - b.avgPrice);
      case 'currentPrice': return d * (a.currentPrice - b.currentPrice);
      case 'value': return d * (a.currentValue - b.currentValue);
      case 'pl': return d * (a.gainLoss - b.gainLoss);
      case 'returns': return d * (a.gainPct - b.gainPct);
      case 'irr': return d * ((a.irr ?? -999) - (b.irr ?? -999));
      default: return 0;
    }
  });

  // Filter NAV series by range
  const filteredNav = (() => {
    if (navRange === 'all') return navSeries;
    const months = navRange === '1yr' ? 12 : navRange === '3yr' ? 36 : 60;
    return navSeries.slice(-months);
  })();

  // Normalise Sensex to same NAV base as portfolio for comparison
  const navChartData = filteredNav.map(d => {
    const firstWithSensex = filteredNav.find(x => x.sensex && x.nav);
    const sensexBase = firstWithSensex?.sensex || 1;
    const navBase = firstWithSensex?.nav || 1;
    return {
      month: d.month.slice(0, 7),
      nav: d.nav,
      sensexNorm: d.sensex ? Math.round((d.sensex / sensexBase) * navBase) : null,
      portfolioValue: d.portfolioValue,
      monthlyReturn: d.monthlyReturn,
    };
  });

  const Th = ({ col, label }: { col: SortColumn; label: string }) => (
    <th className="text-right p-2 text-slate-400 cursor-pointer hover:text-white whitespace-nowrap select-none"
      onClick={() => handleSort(col)}>
      {label} {sortColumn === col ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
    </th>
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-white text-xl flex items-center gap-3">
        <Database className="animate-pulse w-6 h-6 text-emerald-400" />
        Loading from portfolio.db...
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-red-400 text-xl">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-[1920px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Portfolio Command Centre</h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
              <Database className="w-3 h-3" /> Source: portfolio.db · Updated: {lastUpdated}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleRefresh} disabled={refreshing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-sm font-medium flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh DB'}
            </button>
            <Link href="/portfolio/sectors" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium">Sectors</Link>
            <Link href="/portfolio/analytics" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium">Analytics</Link>
          </div>
        </div>

        {/* Summary KPIs */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Portfolio Value</div>
              <div className="text-2xl font-bold text-emerald-400">{fmt(summary.totalValue)}</div>
              <div className="text-xs text-slate-500 mt-1">Invested: {fmt(summary.totalInvested)}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Absolute Gain</div>
              <div className={`text-2xl font-bold ${summary.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(summary.totalGain)}
              </div>
              <div className={`text-xs font-semibold mt-1 ${summary.gainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pct(summary.gainPct)}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">XIRR (Money-Weighted)</div>
              <div className={`text-2xl font-bold ${(summary.xirr ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pct(summary.xirr)}
              </div>
              <div className="text-xs text-slate-500 mt-1">vs Sensex ~8.1%</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">NAV (Base 1,000)</div>
              <div className="text-2xl font-bold text-blue-400">{summary.latestNAV?.toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">{holdings.length} holdings</div>
            </div>
          </div>
        )}

        {/* TWRR Cards */}
        {summary && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Time-Weighted Return (TWRR) — True Portfolio Skill</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: '1 Year', val: summary.twrrPeriods['1yr'] },
                { label: '3 Years', val: summary.twrrPeriods['3yr'] },
                { label: '5 Years', val: summary.twrrPeriods['5yr'] },
                { label: 'Since Inception (2015)', val: summary.twrrPeriods.inception },
              ].map(({ label, val }) => (
                <div key={label} className="bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-xs text-slate-400 mb-2">{label}</div>
                  <div className={`text-xl font-bold ${val != null && val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {val != null ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}%` : '—'}
                  </div>
                  {label === 'Since Inception (2015)' && (
                    <div className="text-xs text-slate-500 mt-1">Sensex: +9.4% · Alpha: {val != null ? `+${(val-9.4).toFixed(1)}%` : '—'}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NAV Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <h2 className="text-lg font-bold text-white">Portfolio NAV vs Sensex (Base 1,000)</h2>
            <div className="flex gap-2 flex-wrap">
              {(['all','5yr','3yr','1yr'] as const).map(r => (
                <button key={r} onClick={() => setNavRange(r)}
                  className={`px-3 py-1 text-xs rounded font-medium ${navRange === r ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  {r === 'all' ? 'All' : r.toUpperCase()}
                </button>
              ))}
              <div className="border-l border-slate-700 mx-1" />
              {(['nav','value','monthly'] as const).map(v => (
                <button key={v} onClick={() => setNavView(v)}
                  className={`px-3 py-1 text-xs rounded font-medium capitalize ${navView === v ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  {v === 'nav' ? 'NAV' : v === 'value' ? 'Value (₹L)' : 'Monthly Ret%'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            {navView === 'nav' ? (
              <LineChart data={navChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10 }} interval={navRange === '1yr' ? 1 : navRange === '3yr' ? 5 : 11} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(v: any, name: any) => [typeof v === 'number' ? v.toFixed(0) : v, name === 'nav' ? 'Portfolio NAV' : 'Sensex (normalised)']} />
                <Legend formatter={(v) => v === 'nav' ? 'Portfolio NAV' : 'Sensex (same base)'} />
                <Line type="monotone" dataKey="nav" stroke="#10b981" strokeWidth={2} dot={false} name="nav" />
                <Line type="monotone" dataKey="sensexNorm" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="sensex" />
              </LineChart>
            ) : navView === 'value' ? (
              <LineChart data={navChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10 }} interval={navRange === '1yr' ? 1 : 11} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={v => `${v}L`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: any) => [`₹${v}L`, 'Portfolio Value']} />
                <Line type="monotone" dataKey="portfolioValue" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={navChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10 }} interval={2} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: any) => [`${v?.toFixed(2)}%`, 'Monthly Return']} />
                <ReferenceLine y={0} stroke="#475569" />
                <Bar dataKey="monthlyReturn" name="Monthly Return %" fill="#3b82f6"
                  radius={[2,2,0,0]}
                  style={{ fill: 'url(#barGrad)' }}>
                  {navChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.monthlyReturn != null && entry.monthlyReturn >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Annual Returns Chart */}
        {annualReturns.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">Annual Returns — Portfolio vs Sensex</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={annualReturns} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: any, name: any) => [`${v?.toFixed(1)}%`, name === 'portfolioReturn' ? 'Portfolio' : 'Sensex']} />
                <Legend formatter={v => v === 'portfolioReturn' ? 'Portfolio' : 'Sensex'} />
                <ReferenceLine y={0} stroke="#475569" />
                <Bar dataKey="portfolioReturn" fill="#10b981" radius={[3,3,0,0]} name="portfolioReturn" />
                <Bar dataKey="sensexReturn" fill="#3b82f6" radius={[3,3,0,0]} name="sensexReturn" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Holdings Table with IRR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Holdings — Stock-wise IRR</h2>
            <div className="text-xs text-slate-500">IRR = annualised return since first purchase · Click headers to sort</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs">
                  <th className="text-left p-2 text-slate-400 cursor-pointer hover:text-white" onClick={() => handleSort('stock')}>
                    Stock {sortColumn === 'stock' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <Th col="qty" label="Qty" />
                  <Th col="pct" label="% Port" />
                  <Th col="invested" label="Invested" />
                  <Th col="avgPrice" label="Avg ₹" />
                  <Th col="currentPrice" label="CMP ₹" />
                  <Th col="value" label="Value" />
                  <Th col="pl" label="P&L" />
                  <Th col="returns" label="Gain %" />
                  <Th col="irr" label="IRR %" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(h => (
                  <tr key={h.symbol} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="p-2">
                      <Link href={`/portfolio/company/${h.symbol}`}>
                        <div className="font-semibold text-white hover:text-blue-400">{h.symbol}</div>
                      </Link>
                    </td>
                    <td className="text-right p-2 text-slate-300">{h.qty.toLocaleString()}</td>
                    <td className="text-right p-2 text-slate-400 text-xs">{h.portfolioPct.toFixed(1)}%</td>
                    <td className="text-right p-2 text-slate-300">{fmt(h.invested)}</td>
                    <td className="text-right p-2 text-slate-400">₹{h.avgPrice.toLocaleString()}</td>
                    <td className="text-right p-2 text-slate-300">₹{h.currentPrice.toLocaleString()}</td>
                    <td className="text-right p-2 text-white font-medium">{fmt(h.currentValue)}</td>
                    <td className={`text-right p-2 font-medium ${h.gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.gainLoss >= 0 ? '+' : ''}{fmt(h.gainLoss)}
                    </td>
                    <td className={`text-right p-2 font-bold ${h.gainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pct(h.gainPct)}
                    </td>
                    <td className={`text-right p-2 text-xs rounded-sm ${irrBg(h.irr)}`}>
                      <span className={irrColor(h.irr)}>
                        {h.irr != null ? `${h.irr >= 0 ? '+' : ''}${h.irr.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-600 bg-slate-800/50">
                  <td className="p-2 font-bold text-white text-xs" colSpan={3}>TOTAL ({holdings.length} stocks)</td>
                  <td className="text-right p-2 font-bold text-white">{summary ? fmt(summary.totalInvested) : ''}</td>
                  <td colSpan={2} />
                  <td className="text-right p-2 font-bold text-emerald-400">{summary ? fmt(summary.totalValue) : ''}</td>
                  <td className={`text-right p-2 font-bold ${(summary?.totalGain ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {summary ? fmt(summary.totalGain) : ''}
                  </td>
                  <td className={`text-right p-2 font-bold ${(summary?.gainPct ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pct(summary?.gainPct ?? null)}
                  </td>
                  <td className="text-right p-2 text-xs font-bold text-blue-400">
                    XIRR: {summary?.xirr != null ? `${summary.xirr.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
