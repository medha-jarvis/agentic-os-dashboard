'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, PieChart, Pie,
  ScatterChart, Scatter, LabelList, Treemap,
} from 'recharts';
import { RefreshCw, BarChart2, Database, Home, EyeOff, Eye } from 'lucide-react';

type SortColumn = 'stock'|'qty'|'pct'|'invested'|'avgPrice'|'currentPrice'|
  'value'|'pl'|'returns'|'irr'|'duration'|'dayChange'|'dayChangePct'|'signal';
type SortDir  = 'asc'|'desc';
type CompPeriod = 'inception'|'2020';

interface DbHolding {
  symbol:string; qty:number; avgPrice:number; currentPrice:number;
  prevClose:number|null; dayChange:number|null; dayChangePct:number|null;
  invested:number; currentValue:number; gainLoss:number; gainPct:number;
  irr:number|null; duration:number|null; portfolioPct:number; signal:string|null;
  sector:string; marketCap:string;
}
interface BenchPair { sensex:number|null; nifty500:number|null; }
interface DbSummary {
  totalInvested:number; totalValue:number; totalGain:number; gainPct:number;
  xirr:number|null; twrrAnnualised:number; twrrAnnualised2020:number|null;
  twrrPeriods:{'1yr':number|null;'2yr':number|null;'3yr':number|null;'5yr':number|null;inception:number;since2020:number|null};
  benchmarkPeriods:{'1yr':BenchPair;'2yr':BenchPair;'3yr':BenchPair;'5yr':BenchPair;since2020:BenchPair;inception:BenchPair};
  holdingsCount:number; latestNAV:number|null;
  totalDayChange:number|null; totalDayChangePct:number|null;
}
interface NavPoint { month:string; portfolioValue:number; nav:number|null; monthlyReturn:number|null; sensex:number|null; nifty500:number|null; }
interface AnnualReturn { year:string|number; portfolioReturn:number; sensexReturn:number|null; nifty500Return:number|null; alpha:number|null; }
interface IndexComparison { name:string; twrr:number; twrr2020:number|null; terminalValueL:number|null; }
interface SectorAgg { sector:string; value:number; invested:number; gainLoss:number; gainPct:number; portfolioPct:number; holdingCount:number; holdings:string[]; avgIrr:number|null; }
interface McapAgg  { category:string; value:number; invested:number; gainLoss:number; gainPct:number; portfolioPct:number; count:number; }

// ── Formatters ──
const fmtAbs = (n:number) =>
  Math.abs(n)>=1e7 ? `₹${(n/1e7).toFixed(2)}Cr`
  : Math.abs(n)>=1e5 ? `₹${(n/1e5).toFixed(2)}L`
  : `₹${n.toFixed(0)}`;
const pct = (n:number|null) => n!=null ? `${n>=0?'+':''}${n.toFixed(2)}%` : '—';
const irrColor = (v:number|null) => v==null?'text-slate-500':v>=25?'text-emerald-300 font-bold':v>=15?'text-emerald-400':v>=0?'text-yellow-400':'text-red-400';
const irrBg    = (v:number|null) => v==null?'':v>=25?'bg-emerald-500/20':v>=15?'bg-emerald-500/10':v>=0?'bg-yellow-500/10':'bg-red-500/10';

const SIGNAL_CFG:Record<string,{bg:string;text:string}> = {
  BUY:       {bg:'bg-emerald-500/25',text:'text-emerald-300'},
  ACCUMULATE:{bg:'bg-teal-500/25',   text:'text-teal-300'},
  HOLD:      {bg:'bg-blue-500/20',   text:'text-blue-400'},
  WATCH:     {bg:'bg-yellow-500/20', text:'text-yellow-400'},
  TRIM:      {bg:'bg-orange-500/20', text:'text-orange-400'},
  REDUCE:    {bg:'bg-orange-500/20', text:'text-orange-400'},
  SELL:      {bg:'bg-red-500/20',    text:'text-red-400'},
  AVOID:     {bg:'bg-red-500/20',    text:'text-red-400'},
};
const SIGNAL_ORDER:Record<string,number> = {BUY:0,ACCUMULATE:1,HOLD:2,WATCH:3,TRIM:4,REDUCE:5,SELL:6,AVOID:7};

const SignalBadge = ({signal}:{signal:string|null}) => {
  if (!signal) return <span className="text-slate-600 text-xs">—</span>;
  const cfg = SIGNAL_CFG[signal]||SIGNAL_CFG.HOLD;
  return <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${cfg.bg} ${cfg.text}`}>{signal.slice(0,5)}</span>;
};

const SECTOR_COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16','#a855f7','#64748b','#22d3ee','#fb923c'];
const MCAP_COLORS   = {  'Large Cap':'#3b82f6', 'Mid Cap':'#10b981', 'Small Cap':'#f59e0b' };

export default function PortfolioPage() {
  const [holdings,        setHoldings]        = useState<DbHolding[]>([]);
  const [summary,         setSummary]         = useState<DbSummary|null>(null);
  const [navSeries,       setNavSeries]       = useState<NavPoint[]>([]);
  const [annualReturns,   setAnnualReturns]   = useState<AnnualReturn[]>([]);
  const [indexComparison, setIndexComparison] = useState<IndexComparison[]>([]);
  const [sectorAgg,       setSectorAgg]       = useState<SectorAgg[]>([]);
  const [mcapAgg,         setMcapAgg]         = useState<McapAgg[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string|null>(null);
  const [lastUpdated,setLastUpdated]= useState('');
  const [sortCol,  setSortCol]  = useState<SortColumn>('value');
  const [sortDir,  setSortDir]  = useState<SortDir>('desc');
  const [navView,  setNavView]  = useState<'nav'|'value'|'monthly'>('nav');
  const [navRange, setNavRange] = useState<'all'|'5yr'|'3yr'|'1yr'>('all');
  const [compPeriod, setCompPeriod] = useState<CompPeriod>('inception');
  const [normalized, setNormalized] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const res  = await fetch('/api/proxy/db/portfolio');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setHoldings(data.holdings||[]);
      setSummary(data.summary||null);
      setNavSeries(data.navSeries||[]);
      setAnnualReturns(data.annualReturns||[]);
      setIndexComparison(data.indexComparison||[]);
      setSectorAgg(data.sectorAggregates||[]);
      setMcapAgg(data.mcapAggregates||[]);
      setLastUpdated(data.lastUpdated||'');
    } catch (err:any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await fetch('/api/proxy/db/portfolio/refresh',{method:'POST'}); await fetchData(); }
    catch { setError('Refresh failed'); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { fetchData(); },[]);

  // Normalise factor: scale everything to ₹1Cr portfolio
  const normFactor = normalized && summary ? 1e7/summary.totalValue : 1;
  const nfmt = (n:number) => fmtAbs(n*normFactor);

  const handleSort = (col:SortColumn) => {
    if (sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sorted = [...holdings].sort((a,b) => {
    const d = sortDir==='asc'?1:-1;
    switch(sortCol){
      case 'stock':        return d*a.symbol.localeCompare(b.symbol);
      case 'qty':          return d*(a.qty-b.qty);
      case 'pct':          return d*(a.portfolioPct-b.portfolioPct);
      case 'invested':     return d*(a.invested-b.invested);
      case 'avgPrice':     return d*(a.avgPrice-b.avgPrice);
      case 'currentPrice': return d*(a.currentPrice-b.currentPrice);
      case 'value':        return d*(a.currentValue-b.currentValue);
      case 'pl':           return d*(a.gainLoss-b.gainLoss);
      case 'returns':      return d*(a.gainPct-b.gainPct);
      case 'irr':          return d*((a.irr??-999)-(b.irr??-999));
      case 'duration':     return d*((a.duration??-999)-(b.duration??-999));
      case 'dayChange':    return d*((a.dayChange??-Infinity)-(b.dayChange??-Infinity));
      case 'dayChangePct': return d*((a.dayChangePct??-Infinity)-(b.dayChangePct??-Infinity));
      case 'signal':       return d*((SIGNAL_ORDER[a.signal??'']??99)-(SIGNAL_ORDER[b.signal??'']??99));
      default: return 0;
    }
  });

  const filteredNav = navRange==='all' ? navSeries
    : navSeries.slice(-(navRange==='1yr'?12:navRange==='3yr'?36:60));

  const navChartData = (() => {
    const first = filteredNav.find(x=>x.sensex&&x.nav);
    const sBase = first?.sensex||1; const n5Base = first?.nifty500||1; const navBase = first?.nav||1;
    return filteredNav.map(d=>({
      month: d.month.slice(0,7), nav: d.nav,
      sensexNorm:   d.sensex   ? Math.round((d.sensex/sBase)*navBase)   : null,
      nifty500Norm: d.nifty500 ? Math.round((d.nifty500/n5Base)*navBase): null,
      portfolioValue: d.portfolioValue, monthlyReturn: d.monthlyReturn,
    }));
  })();

  const portfolioTwrr = compPeriod==='2020'
    ? (summary?.twrrAnnualised2020??summary?.twrrAnnualised??0)
    : (summary?.twrrAnnualised??0);

  const xInt = navRange==='1yr'?1:navRange==='3yr'?5:11;

  const Th = ({col,label,left}:{col:SortColumn;label:string;left?:boolean}) => (
    <th className={`${left?'text-left':'text-right'} px-2 py-2 text-xs font-medium text-slate-400 cursor-pointer hover:text-white whitespace-nowrap select-none`}
      onClick={()=>handleSort(col)}>
      {label}{sortCol===col?(sortDir==='asc'?' ▲':' ▼'):''}
    </th>
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-white text-xl flex items-center gap-3">
        <Database className="animate-pulse w-6 h-6 text-emerald-400"/>Loading portfolio…
      </div>
    </div>
  );
  if (error) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-red-400">{error}</div></div>;

  return (
    <div className="min-h-screen bg-slate-950 p-3 md:p-5">
      <div className="max-w-[1920px] mx-auto space-y-4">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              Portfolio Command Centre
              {normalized && <span className="text-xs bg-purple-600/30 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-normal">Normalised ₹1Cr</span>}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5"><Database className="inline w-3 h-3 mr-1"/>Source: portfolio.db · Updated: {lastUpdated}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5"/>Agentic OS
            </Link>
            <button onClick={()=>setNormalized(n=>!n)}
              className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${normalized?'bg-purple-600 hover:bg-purple-700 text-white':'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
              {normalized?<EyeOff className="w-3.5 h-3.5"/>:<Eye className="w-3.5 h-3.5"/>}
              {normalized?'Show Actual':'Normalise'}
            </button>
            <button onClick={handleRefresh} disabled={refreshing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-medium flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing?'animate-spin':''}`}/>
              {refreshing?'Refreshing…':'Refresh'}
            </button>
            <Link href="/portfolio/sectors"   className="px-3 py-1.5 bg-blue-600   hover:bg-blue-700   text-white rounded text-xs font-medium">Sectors</Link>
            <Link href="/portfolio/analytics" className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium">Analytics</Link>
          </div>
        </div>

        {/* ── KPI Cards: Value, Today, Gain, XIRR ── */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'Portfolio Value',  val: nfmt(summary.totalValue),  sub: `Invested: ${nfmt(summary.totalInvested)}`, color:'text-emerald-400' },
              { label:"Today's P&L",
                val: summary.totalDayChange!=null?`${summary.totalDayChange>=0?'+':''}${nfmt(summary.totalDayChange)}`:'—',
                sub: pct(summary.totalDayChangePct),
                color: (summary.totalDayChange??0)>=0?'text-emerald-400':'text-red-400' },
              { label:'Overall Gain',
                val: `${summary.totalGain>=0?'+':''}${nfmt(summary.totalGain)}`,
                sub: pct(summary.gainPct),
                color: summary.totalGain>=0?'text-emerald-400':'text-red-400' },
              { label:'XIRR (Money-Weighted)',
                val: pct(summary.xirr),
                sub: `TWRR (inception): ${pct(summary.twrrPeriods.inception)}`,
                color:(summary.xirr??0)>=0?'text-emerald-400':'text-red-400' },
            ].map(c=>(
              <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{c.label}</div>
                <div className={`text-xl font-bold ${c.color}`}>{c.val}</div>
                <div className={`text-xs mt-0.5 ${c.color} opacity-75`}>{c.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── TWRR — 6 cards with benchmark comparison ── */}
        {summary && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-blue-400"/>
              <h2 className="text-base font-bold text-white">Time-Weighted Return (TWRR) — True Portfolio Skill</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {([
                {label:'1 Year',           key:'1yr',       bench: summary.benchmarkPeriods['1yr']},
                {label:'2 Years (ann.)',    key:'2yr',       bench: summary.benchmarkPeriods['2yr']},
                {label:'3 Years (ann.)',    key:'3yr',       bench: summary.benchmarkPeriods['3yr']},
                {label:'5 Years (ann.)',    key:'5yr',       bench: summary.benchmarkPeriods['5yr']},
                {label:'Since 2020 (ann.)',key:'since2020', bench: summary.benchmarkPeriods.since2020},
                {label:'Since 2015 (ann.)',key:'inception', bench: summary.benchmarkPeriods.inception},
              ] as {label:string;key:keyof typeof summary.twrrPeriods;bench:BenchPair}[]).map(({label,key,bench})=>{
                const val = summary.twrrPeriods[key];
                const vs  = bench.sensex;
                const vn  = bench.nifty500;
                const alphaSx = val!=null&&vs!=null ? val-vs : null;
                const alphaN5 = val!=null&&vn!=null ? val-vn : null;
                return (
                  <div key={key} className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1.5 leading-tight">{label}</div>
                    <div className={`text-lg font-bold ${val!=null&&val>=0?'text-emerald-400':'text-red-400'}`}>
                      {val!=null?`${val>=0?'+':''}${val.toFixed(2)}%`:'—'}
                    </div>
                    {vs!=null&&(
                      <div className="mt-1.5 space-y-0.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Sensex</span>
                          <span className={alphaSx!=null&&alphaSx>=0?'text-emerald-400':'text-red-400'}>
                            {vs>=0?'+':''}{vs.toFixed(1)}% {alphaSx!=null?`(${alphaSx>=0?'+':''}${alphaSx.toFixed(1)}%)`:''}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">N500</span>
                          <span className={alphaN5!=null&&alphaN5>=0?'text-emerald-400':'text-red-400'}>
                            {vn!=null&&vn>=0?'+':''}{vn?.toFixed(1)}% {alphaN5!=null?`(${alphaN5>=0?'+':''}${alphaN5.toFixed(1)}%)`:''}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-600 mt-2">Brackets show portfolio alpha vs each benchmark. Negative = underperformance.</p>
          </div>
        )}

        {/* ── Portfolio vs Indices toggle ── */}
        {indexComparison.length>0 && summary && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-bold text-white">Portfolio vs Indices — Annualised TWRR</h2>
              <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                {(['inception','2020'] as CompPeriod[]).map(p=>(
                  <button key={p} onClick={()=>setCompPeriod(p)}
                    className={`px-3 py-1 text-xs rounded font-medium ${compPeriod===p?'bg-blue-600 text-white':'text-slate-400 hover:text-white'}`}>
                    {p==='inception'?'Since 2015':'Since 2020'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                {name:'Your Portfolio', twrr:portfolioTwrr, terminalValueL:summary.totalValue/1e5, highlight:true},
                ...indexComparison.map(i=>({
                  name:i.name,
                  twrr: compPeriod==='2020'?(i.twrr2020??i.twrr):i.twrr,
                  terminalValueL:i.terminalValueL, highlight:false,
                }))
              ].map(item=>{
                const maxT    = Math.max(portfolioTwrr,...indexComparison.map(i=>compPeriod==='2020'?(i.twrr2020??i.twrr):i.twrr));
                const barPct  = Math.max(4,Math.round((item.twrr/maxT)*100));
                const alpha   = item.highlight?null:portfolioTwrr-item.twrr;
                return (
                  <div key={item.name} className={`rounded-xl p-3 border ${item.highlight?'border-emerald-500/50 bg-emerald-500/10':'border-slate-700 bg-slate-800/50'}`}>
                    <div className="text-xs font-semibold text-slate-400 mb-1 truncate">{item.name}</div>
                    <div className={`text-xl font-bold mb-0.5 ${item.highlight?'text-emerald-400':'text-blue-400'}`}>
                      {item.twrr>=0?'+':''}{item.twrr.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-500 mb-2">Annualised</div>
                    <div className="h-1.5 bg-slate-700 rounded-full mb-2">
                      <div className={`h-1.5 rounded-full ${item.highlight?'bg-emerald-400':'bg-blue-500'}`} style={{width:`${barPct}%`}}/>
                    </div>
                    {!item.highlight&&alpha!=null&&(
                      <div className={`text-xs font-semibold ${alpha>=0?'text-emerald-400':'text-red-400'}`}>
                        {alpha>=0?'+':''}{alpha.toFixed(2)}% vs portfolio
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── NAV Chart ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
            <h2 className="text-base font-bold text-white">Portfolio NAV vs Sensex &amp; Nifty 500 (Base 1,000)</h2>
            <div className="flex gap-1.5 flex-wrap">
              {(['all','5yr','3yr','1yr'] as const).map(r=>(
                <button key={r} onClick={()=>setNavRange(r)}
                  className={`px-2.5 py-1 text-xs rounded font-medium ${navRange===r?'bg-blue-600 text-white':'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  {r==='all'?'All':r.toUpperCase()}
                </button>
              ))}
              <div className="w-px bg-slate-700"/>
              {(['nav','value','monthly'] as const).map(v=>(
                <button key={v} onClick={()=>setNavView(v)}
                  className={`px-2.5 py-1 text-xs rounded font-medium ${navView===v?'bg-purple-600 text-white':'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  {v==='nav'?'NAV':v==='value'?'Value (₹L)':'Monthly%'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={290}>
            {navView==='nav'?(
              <LineChart data={navChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis dataKey="month" stroke="#475569" tick={{fontSize:9}} interval={xInt}/>
                <YAxis stroke="#475569" tick={{fontSize:9}}/>
                <Tooltip contentStyle={{backgroundColor:'#0f172a',border:'1px solid #334155',borderRadius:8,fontSize:11}}
                  formatter={(v:any,name:any)=>[typeof v==='number'?v.toFixed(0):v, name==='nav'?'Portfolio NAV':name==='sensexNorm'?'Sensex':'Nifty 500']}/>
                <Legend wrapperStyle={{fontSize:11}} formatter={v=>v==='nav'?'Portfolio NAV':v==='sensexNorm'?'Sensex':'Nifty 500'}/>
                <Line type="monotone" dataKey="nav"          stroke="#10b981" strokeWidth={2.5} dot={false} name="nav"/>
                <Line type="monotone" dataKey="sensexNorm"   stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="sensexNorm"/>
                <Line type="monotone" dataKey="nifty500Norm" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="nifty500Norm"/>
              </LineChart>
            ):navView==='value'?(
              <LineChart data={navChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis dataKey="month" stroke="#475569" tick={{fontSize:9}} interval={xInt}/>
                <YAxis stroke="#475569" tick={{fontSize:9}} tickFormatter={v=>`${v}L`}/>
                <Tooltip contentStyle={{backgroundColor:'#0f172a',border:'1px solid #334155',borderRadius:8,fontSize:11}}
                  formatter={(v:any)=>[`₹${v}L`,'Portfolio Value']}/>
                <Line type="monotone" dataKey="portfolioValue" stroke="#10b981" strokeWidth={2.5} dot={false}/>
              </LineChart>
            ):(
              <BarChart data={navChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis dataKey="month" stroke="#475569" tick={{fontSize:9}} interval={2}/>
                <YAxis stroke="#475569" tick={{fontSize:9}} tickFormatter={v=>`${v}%`}/>
                <Tooltip contentStyle={{backgroundColor:'#0f172a',border:'1px solid #334155',borderRadius:8,fontSize:11}}
                  formatter={(v:any)=>[`${v?.toFixed(2)}%`,'Monthly Return']}/>
                <ReferenceLine y={0} stroke="#475569"/>
                <Bar dataKey="monthlyReturn" radius={[2,2,0,0]}>
                  {navChartData.map((_,i)=>(
                    <Cell key={i} fill={navChartData[i].monthlyReturn!=null&&navChartData[i].monthlyReturn!>=0?'#10b981':'#ef4444'}/>
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* ── Annual Returns ── */}
        {annualReturns.length>0&&(
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-base font-bold text-white mb-3">Annual Returns — Portfolio vs Sensex vs Nifty 500</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={annualReturns} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis dataKey="year" stroke="#475569" tick={{fontSize:10}}/>
                <YAxis stroke="#475569" tick={{fontSize:10}} tickFormatter={v=>`${v}%`}/>
                <Tooltip contentStyle={{backgroundColor:'#0f172a',border:'1px solid #334155',borderRadius:8,fontSize:11}}
                  formatter={(v:any,name:any)=>[`${v?.toFixed(1)}%`, name==='portfolioReturn'?'Portfolio':name==='sensexReturn'?'Sensex':'Nifty 500']}/>
                <Legend wrapperStyle={{fontSize:11}} formatter={v=>v==='portfolioReturn'?'Portfolio':v==='sensexReturn'?'Sensex':'Nifty 500'}/>
                <ReferenceLine y={0} stroke="#475569"/>
                <Bar dataKey="portfolioReturn" fill="#10b981" radius={[3,3,0,0]} name="portfolioReturn"/>
                <Bar dataKey="sensexReturn"    fill="#3b82f6" radius={[3,3,0,0]} name="sensexReturn" opacity={0.75}/>
                <Bar dataKey="nifty500Return"  fill="#8b5cf6" radius={[3,3,0,0]} name="nifty500Return" opacity={0.75}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Holdings Table ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">Holdings — Stock-wise IRR</h2>
            <div className="text-xs text-slate-500 hidden sm:block">Click headers to sort</div>
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs border-collapse" style={{minWidth:'960px'}}>
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="sticky left-0 bg-slate-900 text-left px-2 py-2 text-xs font-medium text-slate-400 cursor-pointer hover:text-white whitespace-nowrap z-10"
                    onClick={()=>handleSort('stock')}>
                    Stock{sortCol==='stock'?(sortDir==='asc'?' ▲':' ▼'):''}
                  </th>
                  <Th col="qty"          label="Qty"/>
                  <Th col="pct"          label="Port%"/>
                  <Th col="invested"     label="Invested"/>
                  <Th col="avgPrice"     label="Avg ₹"/>
                  <Th col="currentPrice" label="CMP ₹"/>
                  <Th col="value"        label="Value"/>
                  <Th col="pl"           label="P&L"/>
                  <Th col="returns"      label="Gain%"/>
                  <Th col="irr"          label="IRR%"/>
                  <Th col="duration"     label="Duration"/>
                  <Th col="dayChange"    label="1D ₹"/>
                  <Th col="dayChangePct" label="1D%"/>
                  <Th col="signal"       label="Action"/>
                </tr>
              </thead>
              <tbody>
                {sorted.map(h=>(
                  <tr key={h.symbol} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                    <td className="sticky left-0 bg-slate-900 hover:bg-slate-800/40 px-2 py-2 z-10 whitespace-nowrap">
                      <Link href={`/portfolio/company/${h.symbol}`}>
                        <div className="font-semibold text-white hover:text-blue-400">{h.symbol}</div>
                        <div className="text-slate-500" style={{fontSize:'10px'}}>{h.sector}</div>
                      </Link>
                    </td>
                    <td className="text-right px-2 py-2 text-slate-300 whitespace-nowrap">{h.qty.toLocaleString()}</td>
                    <td className="text-right px-2 py-2 text-slate-400 whitespace-nowrap">{h.portfolioPct.toFixed(1)}%</td>
                    <td className="text-right px-2 py-2 text-slate-300 whitespace-nowrap">{nfmt(h.invested)}</td>
                    <td className="text-right px-2 py-2 text-slate-400 whitespace-nowrap">₹{h.avgPrice.toLocaleString()}</td>
                    <td className="text-right px-2 py-2 text-slate-300 whitespace-nowrap">₹{h.currentPrice.toLocaleString()}</td>
                    <td className="text-right px-2 py-2 text-white font-medium whitespace-nowrap">{nfmt(h.currentValue)}</td>
                    <td className={`text-right px-2 py-2 font-medium whitespace-nowrap ${h.gainLoss>=0?'text-emerald-400':'text-red-400'}`}>
                      {h.gainLoss>=0?'+':''}{nfmt(h.gainLoss)}
                    </td>
                    <td className={`text-right px-2 py-2 font-bold whitespace-nowrap ${h.gainPct>=0?'text-emerald-400':'text-red-400'}`}>{pct(h.gainPct)}</td>
                    <td className={`text-right px-2 py-2 whitespace-nowrap ${irrBg(h.irr)}`}>
                      <span className={irrColor(h.irr)}>{h.irr!=null?`${h.irr>=0?'+':''}${h.irr.toFixed(1)}%`:'—'}</span>
                    </td>
                    <td className="text-right px-2 py-2 whitespace-nowrap text-slate-400">
                      {h.duration!=null ? <span className="text-slate-300">{h.duration.toFixed(1)}<span className="text-slate-500 text-xs">y</span></span> : <span className="text-slate-600">NA</span>}
                    </td>
                    <td className={`text-right px-2 py-2 whitespace-nowrap ${h.dayChange==null?'text-slate-500':h.dayChange>=0?'text-emerald-400':'text-red-400'}`}>
                      {h.dayChange!=null?`${h.dayChange>=0?'+':''}${nfmt(h.dayChange)}`:'—'}
                    </td>
                    <td className={`text-right px-2 py-2 whitespace-nowrap ${h.dayChangePct==null?'text-slate-500':h.dayChangePct>=0?'text-emerald-400':'text-red-400'}`}>
                      {h.dayChangePct!=null?`${h.dayChangePct>=0?'+':''}${h.dayChangePct.toFixed(2)}%`:'—'}
                    </td>
                    <td className="text-center px-2 py-2 whitespace-nowrap"><SignalBadge signal={h.signal}/></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-500 bg-slate-800/70 font-bold">
                  <td className="sticky left-0 bg-slate-800 px-2 py-2 text-white whitespace-nowrap z-10">TOTAL ({holdings.length})</td>
                  <td/><td/>
                  <td className="text-right px-2 py-2 text-white whitespace-nowrap">{summary?nfmt(summary.totalInvested):''}</td>
                  <td/><td/>
                  <td className="text-right px-2 py-2 text-emerald-400 whitespace-nowrap">{summary?nfmt(summary.totalValue):''}</td>
                  <td className={`text-right px-2 py-2 whitespace-nowrap ${(summary?.totalGain??0)>=0?'text-emerald-400':'text-red-400'}`}>
                    {summary?`${summary.totalGain>=0?'+':''}${nfmt(summary.totalGain)}`:''}
                  </td>
                  <td className={`text-right px-2 py-2 whitespace-nowrap ${(summary?.gainPct??0)>=0?'text-emerald-400':'text-red-400'}`}>{pct(summary?.gainPct??null)}</td>
                  <td className="text-right px-2 py-2 text-blue-400 whitespace-nowrap">XIRR: {summary?.xirr!=null?`${summary.xirr.toFixed(2)}%`:'—'}</td>
                  <td/>
                  <td className={`text-right px-2 py-2 whitespace-nowrap ${(summary?.totalDayChange??0)>=0?'text-emerald-400':'text-red-400'}`}>
                    {summary?.totalDayChange!=null?`${summary.totalDayChange>=0?'+':''}${nfmt(summary.totalDayChange)}`:'—'}
                  </td>
                  <td className={`text-right px-2 py-2 whitespace-nowrap ${(summary?.totalDayChangePct??0)>=0?'text-emerald-400':'text-red-400'}`}>
                    {summary?.totalDayChangePct!=null?`${summary.totalDayChangePct>=0?'+':''}${summary.totalDayChangePct.toFixed(2)}%`:'—'}
                  </td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-1.5 text-xs text-slate-600 text-right">Action from wiki · IRR = annualised since first purchase{normalized?' · All ₹ values normalised to ₹1Cr':''}</div>
        </div>

        {/* ══ PORTFOLIO ANALYTICS ══ */}
        {holdings.length>0 && sectorAgg.length>0 && (<>

        {/* ── Chart 1: Portfolio Map (Treemap) ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold text-white">Portfolio Map</h2>
              <p className="text-xs text-slate-500 mt-0.5">Rectangle size = current value · Colour = cumulative gain (dark green → red)</p>
            </div>
            <div className="flex gap-3 text-xs shrink-0">
              {[{l:'≥50%',c:'#059669'},{l:'10–50%',c:'#10b981'},{l:'0–10%',c:'#6ee7b7'},{l:'Loss',c:'#ef4444'}].map(x=>(
                <div key={x.l} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{backgroundColor:x.c}}/>
                  <span className="text-slate-400">{x.l}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
          <Treemap
            data={[...holdings].sort((a,b)=>b.currentValue-a.currentValue).map(h=>({
              name:h.symbol, size:h.currentValue,
              gainPct:h.gainPct, irr:h.irr, portfolioPct:h.portfolioPct,
              sector:h.sector,
            }))}
            dataKey="size"
            stroke="#0f172a"
            content={(props:any)=>{
              const {x,y,width,height,name,gainPct,irr,portfolioPct} = props;
              if(!width||!height||width<18||height<14) return <g/>;
              const g = gainPct??0;
              const bg = g>=100?'#065f46':g>=50?'#059669':g>=25?'#10b981':g>=10?'#34d399':g>=0?'#6ee7b7':g>=-10?'#fb923c':'#ef4444';
              const showName = width>40&&height>26;
              const showGain = width>36&&height>38;
              const showIrr  = width>55&&height>52&&irr!=null;
              return (
                <g>
                  <rect x={x+1} y={y+1} width={width-2} height={height-2} fill={bg} rx={3}/>
                  {showName&&<text x={x+width/2} y={y+height/2-(showGain?9:3)} textAnchor="middle" fill={g<10&&g>=-10?'#1e293b':'white'} fontSize={Math.min(11,width/4.5)} fontWeight="700">{name}</text>}
                  {showGain&&<text x={x+width/2} y={y+height/2+(showName?6:3)} textAnchor="middle" fill={g<10&&g>=-10?'#1e293b':'rgba(255,255,255,0.9)'} fontSize={Math.min(9,width/5.5)}>{g>=0?'+':''}{g.toFixed(1)}%</text>}
                  {showIrr&&<text x={x+width/2} y={y+height/2+20} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={Math.min(8,width/7)}>IRR {(irr??0)>=0?'+':''}{(irr??0).toFixed(0)}%</text>}
                </g>
              );
            }}
          />
          </ResponsiveContainer>
          <p className="text-xs text-slate-600 mt-2 text-right">Hover over table rows · Treemap = size-weighted portfolio visualisation</p>
        </div>

        {/* ── Chart 2 & 3: Sector Allocation + Sector Scorecard ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Sector Allocation — horizontal bar, sorted by weight */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-base font-bold text-white mb-0.5">Sector Allocation</h2>
            <p className="text-xs text-slate-500 mb-3">By current value · bar = % of portfolio</p>
            <ResponsiveContainer width="100%" height={Math.max(280, sectorAgg.length*26)}>
              <BarChart data={sectorAgg} layout="vertical" barSize={15} margin={{right:52,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false}/>
                <XAxis type="number" stroke="#334155" tick={{fontSize:9,fill:'#64748b'}} tickFormatter={v=>`${v}%`} domain={[0,'dataMax+2']}/>
                <YAxis type="category" dataKey="sector" stroke="#334155" tick={{fontSize:9,fill:'#94a3b8'}} width={102}/>
                <Tooltip cursor={{fill:'rgba(255,255,255,0.03)'}}
                  content={({active,payload}:any)=>{
                    if(!active||!payload?.[0]) return null;
                    const s:SectorAgg = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs space-y-1 shadow-xl">
                        <div className="font-bold text-white text-sm">{s.sector}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                          <span className="text-slate-400">Weight</span><span className="text-white font-semibold">{s.portfolioPct.toFixed(1)}%</span>
                          <span className="text-slate-400">Value</span><span className="text-white font-semibold">{nfmt(s.value)}</span>
                          <span className="text-slate-400">Invested</span><span className="text-slate-300">{nfmt(s.invested)}</span>
                          <span className="text-slate-400">Gain</span><span className={s.gainPct>=0?'text-emerald-400 font-semibold':'text-red-400 font-semibold'}>{s.gainPct>=0?'+':''}{s.gainPct.toFixed(1)}%</span>
                          <span className="text-slate-400">Avg IRR</span><span className="text-blue-400 font-semibold">{s.avgIrr!=null?`${s.avgIrr>=0?'+':''}${s.avgIrr.toFixed(1)}%`:'—'}</span>
                          <span className="text-slate-400">Holdings</span><span className="text-slate-300">{s.holdingCount}</span>
                        </div>
                        <div className="text-slate-500 pt-1">{s.holdings.join(' · ')}</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="portfolioPct" name="Portfolio %" radius={[0,4,4,0]}>
                  {sectorAgg.map((s,i)=>(
                    <Cell key={i} fill={s.gainPct>=15?'#059669':s.gainPct>=0?'#10b981':s.gainPct>=-10?'#f97316':'#ef4444'} fillOpacity={0.88}/>
                  ))}
                  <LabelList dataKey="portfolioPct" position="right" style={{fontSize:9,fill:'#94a3b8'}} formatter={(v:any)=>`${v?.toFixed(1)}%`}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-2 text-xs justify-end">
              {[{c:'#059669',l:'Gain ≥15%'},{c:'#10b981',l:'Gain 0–15%'},{c:'#f97316',l:'Loss <10%'},{c:'#ef4444',l:'Loss ≥10%'}].map(x=>(
                <div key={x.l} className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{backgroundColor:x.c}}/><span className="text-slate-500">{x.l}</span></div>
              ))}
            </div>
          </div>

          {/* Sector Scorecard: Cumulative Gain% vs Annualised IRR% */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-base font-bold text-white mb-0.5">Sector Scorecard</h2>
            <p className="text-xs text-slate-500 mb-3">Cumulative gain % vs annualised IRR · sorted by IRR · gap reveals holding period effect</p>
            <ResponsiveContainer width="100%" height={Math.max(280, sectorAgg.filter(s=>s.avgIrr!=null).length*32)}>
              <BarChart
                data={[...sectorAgg].filter(s=>s.avgIrr!=null).sort((a,b)=>(b.avgIrr??0)-(a.avgIrr??0))}
                layout="vertical" barSize={9} barGap={3} margin={{right:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false}/>
                <XAxis type="number" stroke="#334155" tick={{fontSize:9,fill:'#64748b'}} tickFormatter={v=>`${v}%`}/>
                <YAxis type="category" dataKey="sector" stroke="#334155" tick={{fontSize:9,fill:'#94a3b8'}} width={102}/>
                <Tooltip cursor={{fill:'rgba(255,255,255,0.03)'}}
                  content={({active,payload}:any)=>{
                    if(!active||!payload?.[0]) return null;
                    const s:SectorAgg = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs space-y-1 shadow-xl">
                        <div className="font-bold text-white text-sm">{s.sector}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                          <span className="text-slate-400">Cumul. Gain</span><span className={s.gainPct>=0?'text-emerald-400 font-semibold':'text-red-400 font-semibold'}>{s.gainPct>=0?'+':''}{s.gainPct.toFixed(1)}%</span>
                          <span className="text-slate-400">Avg IRR</span><span className="text-blue-400 font-semibold">{s.avgIrr!=null?`${s.avgIrr>=0?'+':''}${s.avgIrr.toFixed(1)}%`:'—'}</span>
                          <span className="text-slate-400">Value</span><span className="text-white">{nfmt(s.value)}</span>
                          <span className="text-slate-400">Holdings</span><span className="text-slate-300">{s.holdingCount} stocks</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{fontSize:10,color:'#94a3b8'}} formatter={v=>v==='gainPct'?'Cumulative Gain %':'Annualised IRR %'}/>
                <ReferenceLine x={0} stroke="#475569" strokeWidth={1}/>
                <ReferenceLine x={15} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.4}
                  label={{value:'IRR 15%',position:'top',fontSize:8,fill:'#3b82f6'}}/>
                <Bar dataKey="gainPct" name="gainPct" fill="#10b981" radius={[0,3,3,0]} fillOpacity={0.65}/>
                <Bar dataKey="avgIrr"  name="avgIrr"  fill="#3b82f6" radius={[0,3,3,0]} fillOpacity={0.95}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Chart 4 & 5: Market Cap Donut + IRR vs Weight Bubble ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Market Cap — Donut + stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-base font-bold text-white mb-0.5">Market Cap Composition</h2>
            <p className="text-xs text-slate-500 mb-4">Portfolio split by cap tier · gain shown per tier</p>
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <PieChart width={190} height={190}>
                  <Pie data={mcapAgg} dataKey="portfolioPct" nameKey="category"
                    cx="50%" cy="50%" innerRadius={58} outerRadius={90}
                    paddingAngle={4} stroke="none" startAngle={90} endAngle={-270}>
                    {mcapAgg.map(m=>(
                      <Cell key={m.category} fill={(MCAP_COLORS as any)[m.category]}/>
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{backgroundColor:'#0f172a',border:'1px solid #334155',borderRadius:8,fontSize:11}}
                    content={({active,payload}:any)=>{
                      if(!active||!payload?.[0]) return null;
                      const m:McapAgg = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs space-y-0.5 shadow-xl">
                          <div className="font-bold" style={{color:(MCAP_COLORS as any)[m.category]}}>{m.category}</div>
                          <div className="text-slate-400">Weight: <span className="text-white font-semibold">{m.portfolioPct.toFixed(1)}%</span></div>
                          <div className="text-slate-400">Value: <span className="text-white">{nfmt(m.value)}</span></div>
                          <div className="text-slate-400">Gain: <span className={m.gainPct>=0?'text-emerald-400':'text-red-400'}>{m.gainPct>=0?'+':''}{m.gainPct.toFixed(1)}%</span></div>
                          <div className="text-slate-400">{m.count} holdings</div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </div>
              <div className="flex-1 space-y-4">
                {mcapAgg.map(m=>(
                  <div key={m.category}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-bold" style={{color:(MCAP_COLORS as any)[m.category]}}>{m.category}</span>
                      <span className="text-lg font-bold text-white">{m.portfolioPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full mb-1.5">
                      <div className="h-1.5 rounded-full" style={{width:`${m.portfolioPct}%`,backgroundColor:(MCAP_COLORS as any)[m.category]}}/>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{nfmt(m.value)} · {m.count} stocks</span>
                      <span className={m.gainPct>=0?'text-emerald-400 font-semibold':'text-red-400 font-semibold'}>{m.gainPct>=0?'+':''}{m.gainPct.toFixed(1)}% gain</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* IRR vs Portfolio Weight — Bubble Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-base font-bold text-white mb-0.5">IRR vs Portfolio Weight</h2>
            <p className="text-xs text-slate-500 mb-3">Bubble size = weight · Top-right quadrant = high-conviction, high-return stocks</p>
            <ResponsiveContainer width="100%" height={265}>
              <ScatterChart margin={{top:10,right:20,bottom:28,left:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis type="number" dataKey="irr" name="IRR %" stroke="#334155"
                  tick={{fontSize:9,fill:'#64748b'}} tickFormatter={v=>`${v}%`}
                  label={{value:'IRR % (annualised since first buy)',position:'insideBottom',offset:-18,fontSize:9,fill:'#64748b'}}/>
                <YAxis type="number" dataKey="portfolioPct" name="Weight %" stroke="#334155"
                  tick={{fontSize:9,fill:'#64748b'}} tickFormatter={v=>`${v}%`}
                  label={{value:'Portfolio Weight %',angle:-90,position:'insideLeft',offset:10,fontSize:9,fill:'#64748b'}}/>
                <Tooltip cursor={false}
                  content={({active,payload}:any)=>{
                    if(!active||!payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs space-y-1 shadow-xl">
                        <div className="font-bold text-white text-sm">{d.symbol}</div>
                        <div className="text-slate-400">Sector: <span className="text-slate-300">{d.sector}</span></div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                          <span className="text-slate-400">IRR</span><span className={d.irr>=0?'text-emerald-400 font-semibold':'text-red-400 font-semibold'}>{d.irr>=0?'+':''}{d.irr.toFixed(1)}%</span>
                          <span className="text-slate-400">Weight</span><span className="text-white font-semibold">{d.portfolioPct.toFixed(1)}%</span>
                          <span className="text-slate-400">Gain</span><span className={d.gainPct>=0?'text-emerald-400':'text-red-400'}>{d.gainPct>=0?'+':''}{d.gainPct.toFixed(1)}%</span>
                          <span className="text-slate-400">Value</span><span className="text-white">{nfmt(d.currentValue)}</span>
                        </div>
                        {d.signal&&<div className="mt-1 text-slate-400">Signal: <span className="font-bold text-blue-300">{d.signal}</span></div>}
                      </div>
                    );
                  }}
                />
                {/* Quadrant guides */}
                <ReferenceLine x={0}  stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.35}/>
                <ReferenceLine x={15} stroke="#f59e0b" strokeDasharray="4 2" strokeOpacity={0.35}
                  label={{value:'15% IRR',position:'insideTopRight',fontSize:8,fill:'#f59e0b'}}/>
                <Scatter
                  data={holdings.filter(h=>h.irr!=null).map(h=>({
                    symbol:h.symbol, irr:h.irr!, portfolioPct:h.portfolioPct,
                    gainPct:h.gainPct, currentValue:h.currentValue,
                    sector:h.sector, signal:h.signal,
                  }))}
                  shape={(props:any)=>{
                    const {cx,cy,payload}=props;
                    const r=Math.max(6,Math.min(26,payload.portfolioPct*2.4));
                    const fill=payload.irr>=25?'#10b981':payload.irr>=15?'#34d399':payload.irr>=0?'#f59e0b':'#ef4444';
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.8} stroke="#0f172a" strokeWidth={1.5}/>
                        {r>=11&&<text x={cx} y={cy+3} textAnchor="middle" fill="white" fontSize={Math.min(9,r*0.82)} fontWeight="700">{payload.symbol}</text>}
                      </g>
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1 justify-center flex-wrap">
              {[{c:'#10b981',l:'IRR ≥25%'},{c:'#34d399',l:'15–25%'},{c:'#f59e0b',l:'0–15%'},{c:'#ef4444',l:'<0%'}].map(x=>(
                <div key={x.l} className="flex items-center gap-1 text-xs text-slate-400">
                  <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:x.c}}/>{x.l}
                </div>
              ))}
            </div>
          </div>
        </div>

        </>)}

      </div>
    </div>
  );
}
