'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertTriangle, AlertCircle, Zap } from 'lucide-react';

type SortDir = 'asc' | 'desc';

interface Thesis {
  symbol: string;
  company_name: string;
  sector: string;
  conviction: 'High' | 'Medium' | 'Low' | null;
  thesis_date: string | null;
  thesis_price: number | null;
  price_target: number | null;
  target_date_computed: string | null;
  thesis_summary: string | null;
  current_price: number | null;
  return_since_thesis: number | null;
  expected_cagr: number | null;
  cagr_required: number | null;
  years_to_target: number | null;
  on_track: boolean | null;
  buy_below: number | null;
  sell_above: number | null;
  stop_loss: number | null;
  in_buy_zone: boolean;
  in_sell_zone: boolean;
  cagr_decay_warning: boolean;
  is_stale: boolean;
  catalyst: string | null;
  catalyst_date: string | null;
  catalyst_urgent: boolean;
  recommended_action: string;
  status: 'Active' | 'Broken' | 'Achieved' | 'Monitoring';
  is_portfolio: boolean;
  wiki_file: string | null;
}

interface ThesisData {
  theses: Thesis[];
  count: number;
  portfolio_count: number;
  watchlist_count: number;
  last_updated: string;
}

type FilterTab = 'all' | 'portfolio' | 'watchlist' | 'buy_zone' | 'needs_review' | 'broken';
type SortColumn = 'symbol' | 'conviction' | 'status' | 'thesis_date' | 'return_since_thesis' | 'expected_cagr' | 'cagr_required' | 'current_price';

// ─────────────────────── FORMATTING ────────────────────
const fmtPrice = (n: number | null): string => {
  if (n === null || n === undefined) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const fmtPct = (n: number | null): string => {
  if (n === null || n === undefined) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
};

const fmtDate = (d: string | null): string => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
};

// ─────────────────────── COLOR UTILITIES ────────────────────
const getConvictionColor = (conv: string | null): string => {
  if (conv === 'High') return 'bg-emerald-500/20 text-emerald-400';
  if (conv === 'Medium') return 'bg-yellow-500/20 text-yellow-400';
  if (conv === 'Low') return 'bg-slate-500/20 text-slate-400';
  return 'bg-slate-500/20 text-slate-500';
};

const getStatusColor = (status: string): string => {
  if (status === 'Active') return 'bg-blue-500/20 text-blue-400';
  if (status === 'Broken') return 'bg-red-500/20 text-red-400';
  if (status === 'Achieved') return 'bg-purple-500/20 text-purple-400';
  if (status === 'Monitoring') return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-slate-500/20 text-slate-400';
};

const getReturnColor = (ret: number | null): string => {
  if (ret === null) return 'text-slate-400';
  if (ret >= 0) return 'text-emerald-400';
  return 'text-red-400';
};

const getCAGRColor = (cagr: number | null): string => {
  if (cagr === null) return 'text-slate-400';
  if (cagr < 15) return 'text-emerald-400';
  if (cagr < 25) return 'text-yellow-400';
  if (cagr < 35) return 'text-orange-400';
  return 'text-red-400';
};

const getHeatmapColor = (thesis: Thesis): string => {
  if (thesis.status === 'Broken') return 'bg-gray-700 text-slate-300';
  if (thesis.in_buy_zone) return 'bg-yellow-500/30 text-yellow-300 border-2 border-yellow-500';
  if (thesis.cagr_decay_warning) return 'bg-orange-500/30 text-orange-300';
  if (thesis.on_track === false) return 'bg-red-500/20 text-red-400';
  if (thesis.on_track === true) return 'bg-emerald-500/30 text-emerald-300';
  return 'bg-slate-700 text-slate-400';
};

// ─────────────────────── MAIN COMPONENT ────────────────────
export default function ThesisTrackerPage() {
  const [data, setData] = useState<ThesisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortCol, setSortCol] = useState<SortColumn>('symbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const tableRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // ─────────────────────── FETCH ────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/proxy/thesis-tracker');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ThesisData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 min
    return () => clearInterval(interval);
  }, [fetchData]);

  // ─────────────────────── FILTERING ────────────────────
  const filtered = useCallback(() => {
    if (!data) return [];
    let result = [...data.theses];

    switch (filter) {
      case 'portfolio':
        result = result.filter(t => t.is_portfolio);
        break;
      case 'watchlist':
        result = result.filter(t => !t.is_portfolio);
        break;
      case 'buy_zone':
        result = result.filter(t => t.in_buy_zone);
        break;
      case 'needs_review':
        result = result.filter(t => t.cagr_decay_warning || t.is_stale);
        break;
      case 'broken':
        result = result.filter(t => t.status === 'Broken');
        break;
      case 'all':
      default:
        break;
    }

    // Sort: portfolio first, then by column
    result.sort((a, b) => {
      // Portfolio bias
      if (a.is_portfolio !== b.is_portfolio) {
        return a.is_portfolio ? -1 : 1;
      }

      let aVal: any, bVal: any;
      switch (sortCol) {
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case 'conviction':
          const convOrder = { 'High': 0, 'Medium': 1, 'Low': 2, null: 3 };
          aVal = convOrder[a.conviction as keyof typeof convOrder] ?? 3;
          bVal = convOrder[b.conviction as keyof typeof convOrder] ?? 3;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'thesis_date':
          aVal = a.thesis_date ? new Date(a.thesis_date).getTime() : 0;
          bVal = b.thesis_date ? new Date(b.thesis_date).getTime() : 0;
          break;
        case 'return_since_thesis':
          aVal = a.return_since_thesis ?? -Infinity;
          bVal = b.return_since_thesis ?? -Infinity;
          break;
        case 'expected_cagr':
          aVal = a.expected_cagr ?? -Infinity;
          bVal = b.expected_cagr ?? -Infinity;
          break;
        case 'cagr_required':
          aVal = a.cagr_required ?? -Infinity;
          bVal = b.cagr_required ?? -Infinity;
          break;
        case 'current_price':
          aVal = a.current_price ?? 0;
          bVal = b.current_price ?? 0;
          break;
        default:
          aVal = a.symbol;
          bVal = b.symbol;
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, filter, sortCol, sortDir]);

  const displayedTheses = filtered();

  // ─────────────────────── ANALYTICS ────────────────────
  const stats = useCallback(() => {
    if (!data) return { broken: 0, buyZone: 0, cagrWarn: 0, active: 0 };
    const broken = data.theses.filter(t => t.status === 'Broken').length;
    const buyZone = data.theses.filter(t => t.in_buy_zone).length;
    const cagrWarn = data.theses.filter(t => t.cagr_decay_warning).length;
    const active = data.theses.filter(t => t.status === 'Active').length;
    return { broken, buyZone, cagrWarn, active };
  }, [data])();

  // ─────────────────────── HEATMAP SCROLL ────────────────────
  const scrollToRow = (symbol: string) => {
    const ref = tableRowRefs.current[symbol];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ref.classList.add('bg-yellow-500/10');
      setTimeout(() => ref.classList.remove('bg-yellow-500/10'), 2000);
    }
  };

  // ─────────────────────── RENDER ────────────────────

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0a0e27] text-slate-200 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full mb-4"></div>
          <p>Loading thesis tracker...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0e27] text-slate-200 p-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/portfolio" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
            ← Portfolio
          </Link>
          <div className="bg-red-500/20 border border-red-500 rounded p-4 text-red-400">
            {error || 'No data available'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] text-slate-200 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* ─────────────────────── HEADER ────────────────────*/}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link href="/portfolio" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
              ← Portfolio
            </Link>
            <h1 className="text-3xl font-bold text-slate-100">Thesis Tracker</h1>
            <p className="text-slate-400 text-sm mt-1">
              {data.count} companies tracked | Last updated {fmtDate(data.last_updated)}
            </p>
          </div>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500 rounded hover:bg-emerald-500/30 disabled:opacity-50 flex items-center gap-2 transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ─────────────────────── SUMMARY CARDS ────────────────────*/}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a1f3a] border border-[#2a3150] rounded p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Total Tracked</p>
            <p className="text-2xl font-bold text-slate-100">{data.count}</p>
          </div>
          <div className="bg-[#1a1f3a] border border-[#2a3150] rounded p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Portfolio</p>
            <p className="text-2xl font-bold text-emerald-400">{data.portfolio_count}</p>
          </div>
          <div className="bg-[#1a1f3a] border border-[#2a3150] rounded p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Watchlist</p>
            <p className="text-2xl font-bold text-blue-400">{data.watchlist_count}</p>
          </div>
          <div className="bg-[#1a1f3a] border border-[#2a3150] rounded p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Broken</p>
            <p className="text-2xl font-bold text-red-400">{stats.broken}</p>
          </div>
        </div>

        {/* ─────────────────────── ALERT BANNERS ────────────────────*/}
        {stats.broken > 0 && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-400">{stats.broken} broken theses — review immediately</p>
              <p className="text-red-300 text-sm mt-1">Click the "Broken" filter to see details</p>
            </div>
          </div>
        )}
        {stats.buyZone > 0 && (
          <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500 rounded flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-yellow-400">{stats.buyZone} stocks in buy zone</p>
              <p className="text-yellow-300 text-sm mt-1">Current prices between thesis price and buy_below</p>
            </div>
          </div>
        )}
        {stats.cagrWarn > 0 && (
          <div className="mb-4 p-4 bg-orange-500/20 border border-orange-500 rounded flex items-start gap-3">
            <Zap size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-orange-400">{stats.cagrWarn} theses need review (CAGR decay)</p>
              <p className="text-orange-300 text-sm mt-1">Required CAGR is exceeding sustainable levels</p>
            </div>
          </div>
        )}

        {/* ─────────────────────── HEATMAP ────────────────────*/}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Portfolio Heatmap</h2>
          <div className="bg-[#1a1f3a] border border-[#2a3150] rounded p-4">
            {/* Portfolio Grid */}
            <div className="mb-6">
              <p className="text-slate-400 text-xs mb-3 uppercase tracking-wide">Portfolio Companies ({data.portfolio_count})</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {data.theses
                  .filter(t => t.is_portfolio)
                  .map(t => (
                    <button
                      key={t.symbol}
                      onClick={() => scrollToRow(t.symbol)}
                      className={`${getHeatmapColor(t)} p-3 rounded border transition hover:ring-2 ring-slate-500 text-center`}
                    >
                      <p className="text-xs font-bold">{t.symbol}</p>
                      <p className={`text-xs mt-1 ${getReturnColor(t.return_since_thesis)}`}>
                        {fmtPct(t.return_since_thesis)}
                      </p>
                      {t.recommended_action && (
                        <p className="text-xs text-slate-300 mt-1 truncate">{t.recommended_action.slice(0, 8)}</p>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {/* Watchlist Grid */}
            {data.watchlist_count > 0 && (
              <div className="opacity-60">
                <p className="text-slate-500 text-xs mb-3 uppercase tracking-wide">Watchlist ({data.watchlist_count})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {data.theses
                    .filter(t => !t.is_portfolio)
                    .map(t => (
                      <button
                        key={t.symbol}
                        onClick={() => scrollToRow(t.symbol)}
                        className={`${getHeatmapColor(t)} p-3 rounded border transition hover:ring-2 ring-slate-500 text-center text-xs`}
                      >
                        <p className="font-bold">{t.symbol}</p>
                        <p className={getReturnColor(t.return_since_thesis)}>
                          {fmtPct(t.return_since_thesis)}
                        </p>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────── FILTER TABS ────────────────────*/}
        <div className="mb-6 flex flex-wrap gap-2">
          {(['all', 'portfolio', 'watchlist', 'buy_zone', 'needs_review', 'broken'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                filter === tab
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#1a1f3a] border border-[#2a3150] text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'all' && 'All'}
              {tab === 'portfolio' && 'Portfolio Only'}
              {tab === 'watchlist' && 'Watchlist Only'}
              {tab === 'buy_zone' && 'In Buy Zone'}
              {tab === 'needs_review' && 'Needs Review'}
              {tab === 'broken' && 'Broken'}
            </button>
          ))}
        </div>

        {/* ─────────────────────── TABLE ────────────────────*/}
        <div className="bg-[#1a1f3a] border border-[#2a3150] rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0f1425] border-b border-[#2a3150]">
              <tr>
                <th className="px-3 py-2 text-left">
                  <SortHeader col="symbol" active={sortCol === 'symbol'} dir={sortDir} onClick={() => handleSort('symbol')} label="Company" />
                </th>
                <th className="px-3 py-2 text-left text-slate-500">Sector</th>
                <th className="px-3 py-2 text-left">
                  <SortHeader col="conviction" active={sortCol === 'conviction'} dir={sortDir} onClick={() => handleSort('conviction')} label="Conv" />
                </th>
                <th className="px-3 py-2 text-left">
                  <SortHeader col="status" active={sortCol === 'status'} dir={sortDir} onClick={() => handleSort('status')} label="Status" />
                </th>
                <th className="px-3 py-2 text-left">
                  <SortHeader col="thesis_date" active={sortCol === 'thesis_date'} dir={sortDir} onClick={() => handleSort('thesis_date')} label="Date" />
                </th>
                <th className="px-3 py-2 text-right">Thesis ₹</th>
                <th className="px-3 py-2 text-right">Current ₹</th>
                <th className="px-3 py-2 text-right">
                  <SortHeader col="return_since_thesis" active={sortCol === 'return_since_thesis'} dir={sortDir} onClick={() => handleSort('return_since_thesis')} label="Return %" />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortHeader col="expected_cagr" active={sortCol === 'expected_cagr'} dir={sortDir} onClick={() => handleSort('expected_cagr')} label="Exp CAGR %" />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortHeader col="cagr_required" active={sortCol === 'cagr_required'} dir={sortDir} onClick={() => handleSort('cagr_required')} label="Req CAGR %" />
                </th>
                <th className="px-3 py-2 text-left">Target Date</th>
                <th className="px-3 py-2 text-right">Buy ₹</th>
                <th className="px-3 py-2 text-right">Sell ₹</th>
                <th className="px-3 py-2 text-right">Stop ₹</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Catalyst</th>
              </tr>
            </thead>
            <tbody>
              {displayedTheses.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-slate-500">
                    No theses match the selected filter
                  </td>
                </tr>
              ) : (
                displayedTheses.map(thesis => (
                  <tr
                    key={thesis.symbol}
                    ref={el => {
                      if (el) tableRowRefs.current[thesis.symbol] = el;
                    }}
                    className="border-b border-[#2a3150] hover:bg-[#2a3150] transition"
                  >
                    <td className="px-3 py-2">
                      <p className="font-bold text-slate-100">{thesis.symbol}</p>
                      <p className="text-xs text-slate-500">{thesis.company_name}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">{thesis.sector}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getConvictionColor(thesis.conviction)}`}>
                        {thesis.conviction || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(thesis.status)}`}>
                        {thesis.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">{fmtDate(thesis.thesis_date)}</td>
                    <td className="px-3 py-2 text-right text-sm">{fmtPrice(thesis.thesis_price)}</td>
                    <td className="px-3 py-2 text-right text-sm">{fmtPrice(thesis.current_price)}</td>
                    <td className={`px-3 py-2 text-right text-sm font-semibold ${getReturnColor(thesis.return_since_thesis)}`}>
                      {fmtPct(thesis.return_since_thesis)}
                    </td>
                    <td className={`px-3 py-2 text-right text-sm font-semibold ${getCAGRColor(thesis.expected_cagr)}`}>
                      {fmtPct(thesis.expected_cagr)}
                    </td>
                    <td className={`px-3 py-2 text-right text-sm font-semibold ${getCAGRColor(thesis.cagr_required)}`}>
                      {fmtPct(thesis.cagr_required)}
                    </td>
                    <td className="px-3 py-2 text-sm">{fmtDate(thesis.target_date_computed)}</td>
                    <td className={`px-3 py-2 text-right text-sm ${thesis.in_buy_zone ? 'bg-emerald-500/20 text-emerald-400 font-bold' : ''}`}>
                      {fmtPrice(thesis.buy_below)}
                    </td>
                    <td className={`px-3 py-2 text-right text-sm ${thesis.in_sell_zone ? 'bg-red-500/20 text-red-400 font-bold' : ''}`}>
                      {fmtPrice(thesis.sell_above)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm">{fmtPrice(thesis.stop_loss)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        thesis.recommended_action === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                        thesis.recommended_action === 'SELL' ? 'bg-red-500/20 text-red-400' :
                        thesis.recommended_action === 'HOLD' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {thesis.recommended_action || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      <div>
                        {thesis.catalyst && (
                          <>
                            {thesis.catalyst_urgent && <span className="text-red-400">🔥 </span>}
                            {thesis.catalyst}
                          </>
                        )}
                        {thesis.cagr_decay_warning && <span className="text-orange-400"> ⚠️</span>}
                        {thesis.is_stale && <span className="text-yellow-400"> 📋</span>}
                        {!thesis.catalyst && !thesis.cagr_decay_warning && !thesis.is_stale && '—'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─────────────────────── FOOTER ────────────────────*/}
        <div className="mt-6 p-4 bg-[#1a1f3a] border border-[#2a3150] rounded text-xs text-slate-500">
          <p>Prices auto-refresh from portfolio DB every 5 min</p>
          <p className="mt-2">Edit thesis data: <code className="bg-[#0a0e27] px-2 py-1 rounded">/root/medha/mission-control/data/thesis_tracker.json</code></p>
        </div>
      </div>
    </div>
  );

  // ─────────────────────── SORT HANDLER ────────────────────
  function handleSort(col: SortColumn) {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }
}

// ─────────────────────── SORT HEADER ────────────────────
function SortHeader({
  col,
  active,
  dir,
  onClick,
  label,
}: {
  col: SortColumn;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  label: string;
}) {
  return (
    <button onClick={onClick} className="hover:text-slate-100 flex items-center gap-1 transition">
      {label}
      {active && <span className="text-emerald-400">{dir === 'asc' ? '▲' : '▼'}</span>}
    </button>
  );
}
