'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Treemap,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// Sector hierarchy mapping - Level 1 (Broad) to Level 2 (Granular)
const SECTOR_HIERARCHY: Record<string, string[]> = {
  'Financial Services': ['FINANCIAL SERVICES', 'INSURANCE'],
  'Manufacturing': [
    'ENGINEERING & CAPITAL GOODS',
    'BUILDING MATERIALS',
    'CHEMICALS',
    'PACKAGING',
    'AUTOMOTIVE',
  ],
  'Technology': ['SOFTWARE SERVICES', 'IT SERVICES'],
  'Consumer': ['RETAIL', 'E-COMMERCE', 'CONSUMER GOODS'],
  'Healthcare': ['HEALTHCARE', 'PHARMACEUTICALS'],
  'Energy & Utilities': ['POWER', 'RENEWABLE ENERGY'],
  'Infrastructure': ['CONSTRUCTION', 'LOGISTICS'],
};

// Color palette for sectors
const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
  '#06B6D4', // cyan
];

interface Holding {
  symbol: string;
  value: number;
  return_pct: number;
}

interface SectorData {
  sector: string;
  total_value: number;
  total_invested: number;
  unrealized_pl: number;
  holdings_count: number;
  holdings: Holding[];
  allocation_pct: number;
  return_pct: number;
}

interface AllocationData {
  sectors: SectorData[];
  date: string;
  total_value: number;
}

interface ConcentrationData {
  top3_concentration_pct: number;
  top5_concentration_pct: number;
  herfindahl_index: number;
  diversification_score: string;
  diversification_takeaway: string;
  concentration_takeaway: string;
  total_sectors: number;
  sectors_above_10pct: number;
  sectors_above_5pct: number;
}

// Format number to Indian style
const formatIndian = (num: number): string => {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 10000000) {
    return `${sign}${(absNum / 10000000).toFixed(2)} Cr`;
  } else if (absNum >= 100000) {
    return `${sign}${(absNum / 100000).toFixed(2)} L`;
  } else if (absNum >= 1000) {
    return `${sign}${(absNum / 1000).toFixed(2)} K`;
  }
  return `${sign}${absNum.toFixed(0)}`;
};

// Format Indian style without decimals for large numbers
const formatIndianNoDecimal = (num: number): string => {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 10000000) {
    return `${sign}${Math.round(absNum / 10000000)} Cr`;
  } else if (absNum >= 100000) {
    return `${sign}${Math.round(absNum / 100000)} L`;
  } else if (absNum >= 1000) {
    return `${sign}${Math.round(absNum / 1000)} K`;
  }
  return `${sign}${Math.round(absNum)}`;
};

// Get performance color based on return percentage
const getPerformanceColor = (returnPct: number): string => {
  if (returnPct >= 50) return 'text-green-400';
  if (returnPct >= 20) return 'text-green-300';
  if (returnPct >= 0) return 'text-green-200';
  if (returnPct >= -10) return 'text-orange-300';
  return 'text-red-400';
};

const getBgPerformanceColor = (returnPct: number): string => {
  if (returnPct >= 50) return 'bg-green-500/20';
  if (returnPct >= 20) return 'bg-green-400/20';
  if (returnPct >= 0) return 'bg-green-300/10';
  if (returnPct >= -10) return 'bg-orange-300/10';
  return 'bg-red-400/20';
};

export default function SectorsPage() {
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [concentration, setConcentration] = useState<ConcentrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevel1, setSelectedLevel1] = useState<string | null>(null);
  const [selectedLevel2, setSelectedLevel2] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/proxy/portfolio/sectors/allocation').then(r => r.json()),
      fetch('/api/proxy/portfolio/sectors/concentration').then(r => r.json()),
    ])
      .then(([alloc, conc]) => {
        setAllocation(alloc);
        setConcentration(conc);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading sectors:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading Sector Analysis...</div>
        </div>
      </div>
    );
  }

  if (!allocation || !concentration) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-xl">Error loading sector data</div>
      </div>
    );
  }

  // Build Level 1 aggregation
  const level1Data: Record<string, {
    sectors: SectorData[];
    totalValue: number;
    totalInvested: number;
    totalPL: number;
    holdingsCount: number;
  }> = {};

  Object.entries(SECTOR_HIERARCHY).forEach(([level1, level2List]) => {
    const matchingSectors = allocation.sectors.filter(s =>
      level2List.some(l2 => s.sector.toUpperCase().includes(l2.toUpperCase()))
    );

    if (matchingSectors.length > 0) {
      level1Data[level1] = {
        sectors: matchingSectors,
        totalValue: matchingSectors.reduce((sum, s) => sum + s.total_value, 0),
        totalInvested: matchingSectors.reduce((sum, s) => sum + s.total_invested, 0),
        totalPL: matchingSectors.reduce((sum, s) => sum + s.unrealized_pl, 0),
        holdingsCount: matchingSectors.reduce((sum, s) => sum + s.holdings_count, 0),
      };
    }
  });

  // Handle "Others" category
  const categorizedSectors = new Set(
    Object.values(SECTOR_HIERARCHY).flat().map(s => s.toUpperCase())
  );
  const uncategorizedSectors = allocation.sectors.filter(
    s => !Array.from(categorizedSectors).some(cat => s.sector.toUpperCase().includes(cat))
  );

  if (uncategorizedSectors.length > 0) {
    level1Data['Others'] = {
      sectors: uncategorizedSectors,
      totalValue: uncategorizedSectors.reduce((sum, s) => sum + s.total_value, 0),
      totalInvested: uncategorizedSectors.reduce((sum, s) => sum + s.total_invested, 0),
      totalPL: uncategorizedSectors.reduce((sum, s) => sum + s.unrealized_pl, 0),
      holdingsCount: uncategorizedSectors.reduce((sum, s) => sum + s.holdings_count, 0),
    };
  }

  // Pie chart data for Level 1
  const pieData = Object.entries(level1Data).map(([name, data]) => ({
    name,
    value: data.totalValue,
    percentage: (data.totalValue / allocation.total_value) * 100,
  }));

  // Filter data based on selection
  let displaySectors = allocation.sectors;
  let breadcrumb = 'All Sectors';
  let subtotalValue = allocation.total_value;
  let subtotalInvested = allocation.sectors.reduce((sum, s) => sum + s.total_invested, 0);
  let subtotalPL = allocation.sectors.reduce((sum, s) => sum + s.unrealized_pl, 0);

  if (selectedLevel2) {
    displaySectors = allocation.sectors.filter(s => s.sector === selectedLevel2);
    breadcrumb = `${selectedLevel1} > ${selectedLevel2}`;
    const sector = displaySectors[0];
    if (sector) {
      subtotalValue = sector.total_value;
      subtotalInvested = sector.total_invested;
      subtotalPL = sector.unrealized_pl;
    }
  } else if (selectedLevel1 && level1Data[selectedLevel1]) {
    displaySectors = level1Data[selectedLevel1].sectors;
    breadcrumb = selectedLevel1;
    subtotalValue = level1Data[selectedLevel1].totalValue;
    subtotalInvested = level1Data[selectedLevel1].totalInvested;
    subtotalPL = level1Data[selectedLevel1].totalPL;
  }

  const subtotalReturn = subtotalInvested > 0
    ? ((subtotalPL / subtotalInvested) * 100)
    : 0;

  // Treemap data for holdings visualization
  const treemapData = displaySectors.flatMap(sector =>
    sector.holdings.map(h => ({
      name: h.symbol,
      size: h.value,
      returnPct: h.return_pct,
      sector: sector.sector,
    }))
  );

  // Performance heatmap data
  const heatmapData = displaySectors.map(s => ({
    sector: s.sector.length > 20 ? s.sector.substring(0, 17) + '...' : s.sector,
    value: s.allocation_pct,
    return: s.return_pct,
  }));

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header with Breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Link href="/portfolio" className="hover:text-blue-400">Portfolio</Link>
            <span>/</span>
            <span>Sectors</span>
            {(selectedLevel1 || selectedLevel2) && (
              <>
                <span>/</span>
                <span className="text-blue-400">{breadcrumb}</span>
              </>
            )}
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Sector Analysis
              </h1>
              <p className="text-gray-400">Hierarchical sector breakdown with performance metrics</p>
            </div>
            {(selectedLevel1 || selectedLevel2) && (
              <button
                onClick={() => {
                  setSelectedLevel1(null);
                  setSelectedLevel2(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Concentration Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
          <div className="bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-xs md:text-sm mb-1">Total Sectors</div>
            <div className="text-xl md:text-2xl font-bold text-white">{concentration.total_sectors}</div>
          </div>
          <div className="bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-xs md:text-sm mb-1">Top 3 Conc.</div>
            <div className="text-xl md:text-2xl font-bold text-white">
              {concentration.top3_concentration_pct.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">{concentration.concentration_takeaway}</div>
          </div>
          <div className="bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-xs md:text-sm mb-1">Top 5 Conc.</div>
            <div className="text-xl md:text-2xl font-bold text-white">
              {concentration.top5_concentration_pct.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-xs md:text-sm mb-1">Diversification</div>
            <div className="text-xl md:text-2xl font-bold text-green-400">
              {concentration.diversification_score}
            </div>
            <div className="text-xs text-gray-500 mt-1">{concentration.diversification_takeaway}</div>
          </div>
          <div className="bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-xs md:text-sm mb-1">HHI</div>
            <div className="text-xl md:text-2xl font-bold text-white">
              {Math.round(concentration.herfindahl_index)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Lower = Better</div>
          </div>
          <div className="bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-xs md:text-sm mb-1">Sectors &gt;10%</div>
            <div className="text-xl md:text-2xl font-bold text-orange-400">
              {concentration.sectors_above_10pct}
            </div>
          </div>
        </div>

        {/* Level 1 Sector Buttons */}
        {!selectedLevel2 && (
          <div className="mb-6">
            <div className="text-sm text-gray-400 mb-3">Filter by Broad Sector:</div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(level1Data).map((sector, idx) => (
                <button
                  key={sector}
                  onClick={() => {
                    if (selectedLevel1 === sector) {
                      setSelectedLevel1(null);
                    } else {
                      setSelectedLevel1(sector);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedLevel1 === sector
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  style={{
                    borderLeft: selectedLevel1 === sector ? `4px solid ${COLORS[idx % COLORS.length]}` : 'none',
                  }}
                >
                  {sector}
                  <span className="ml-2 text-xs opacity-75">
                    ({level1Data[sector].holdingsCount})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart - Level 1 Allocation */}
          {!selectedLevel2 && (
            <div className="bg-gray-800 p-4 md:p-6 rounded-lg border border-gray-700">
              <h2 className="text-lg md:text-xl font-bold text-white mb-4">
                {selectedLevel1 ? `${selectedLevel1} Breakdown` : 'Sector Allocation'}
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={selectedLevel1 && level1Data[selectedLevel1]
                      ? level1Data[selectedLevel1].sectors.map(s => ({
                          name: s.sector,
                          value: s.total_value,
                          percentage: s.allocation_pct,
                        }))
                      : pieData
                    }
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.name.substring(0, 15)} ${props.percentage.toFixed(1)}%`}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(data) => {
                      if (selectedLevel1 && data.name) {
                        setSelectedLevel2(data.name);
                      } else if (data.name) {
                        setSelectedLevel1(data.name);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {(selectedLevel1 && level1Data[selectedLevel1]
                      ? level1Data[selectedLevel1].sectors
                      : pieData
                    ).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => `₹${formatIndian(value)}`}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-xs text-gray-500 text-center mt-2">
                Click sectors to drill down
              </div>
            </div>
          )}

          {/* Treemap - Holdings Visualization */}
          <div className="bg-gray-800 p-4 md:p-6 rounded-lg border border-gray-700">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">Holdings Map</h2>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#1f2937"
                fill="#3B82F6"
                content={({ x, y, width, height, name, returnPct }: any) => {
                  const color = returnPct >= 0 ? '#10B981' : '#EF4444';
                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={color}
                        opacity={0.8}
                        stroke="#1f2937"
                        strokeWidth={2}
                      />
                      {width > 60 && height > 30 && (
                        <>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 - 5}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={12}
                            fontWeight="bold"
                          >
                            {name}
                          </text>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 + 10}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={10}
                          >
                            {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                          </text>
                        </>
                      )}
                    </g>
                  );
                }}
              />
            </ResponsiveContainer>
          </div>

          {/* Performance Heatmap */}
          <div className="bg-gray-800 p-4 md:p-6 rounded-lg border border-gray-700 lg:col-span-2">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">Performance Heatmap</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {heatmapData.map((item, idx) => {
                const intensity = Math.min(Math.abs(item.return) / 100, 1);
                const bgColor = item.return >= 0
                  ? `rgba(16, 185, 129, ${0.2 + intensity * 0.6})`
                  : `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-gray-700 cursor-pointer hover:border-blue-500 transition-all"
                    style={{ backgroundColor: bgColor }}
                    onClick={() => {
                      const fullSector = allocation.sectors.find(s =>
                        s.sector.startsWith(item.sector.replace('...', ''))
                      );
                      if (fullSector) {
                        setSelectedLevel2(fullSector.sector);
                        // Find parent level 1
                        for (const [l1, l2List] of Object.entries(SECTOR_HIERARCHY)) {
                          if (l2List.some(l2 => fullSector.sector.toUpperCase().includes(l2.toUpperCase()))) {
                            setSelectedLevel1(l1);
                            break;
                          }
                        }
                      }
                    }}
                  >
                    <div className="text-white font-medium text-xs mb-1">{item.sector}</div>
                    <div className={`text-lg font-bold ${item.return >= 0 ? 'text-green-100' : 'text-red-100'}`}>
                      {item.return >= 0 ? '+' : ''}{item.return.toFixed(1)}%
                    </div>
                    <div className="text-white text-xs opacity-75">
                      {item.value.toFixed(1)}% alloc
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Subtotal Summary (when filtered) */}
        {(selectedLevel1 || selectedLevel2) && (
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 p-4 md:p-6 rounded-lg mb-6">
            <h3 className="text-lg font-bold text-white mb-4">
              {breadcrumb} Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-gray-400 text-sm mb-1">Total Value</div>
                <div className="text-2xl font-bold text-white">
                  ₹{formatIndianNoDecimal(subtotalValue)}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">Invested</div>
                <div className="text-xl font-bold text-gray-300">
                  ₹{formatIndianNoDecimal(subtotalInvested)}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">P&L</div>
                <div className={`text-2xl font-bold ${subtotalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {subtotalPL >= 0 ? '+' : ''}₹{formatIndianNoDecimal(subtotalPL)}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">Return</div>
                <div className={`text-2xl font-bold ${subtotalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {subtotalReturn >= 0 ? '+' : ''}{subtotalReturn.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sector Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 md:p-6 bg-gray-700/50 border-b border-gray-600">
            <h2 className="text-lg md:text-xl font-bold text-white">
              {selectedLevel2 ? 'Holdings' : 'Sectors'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 text-gray-300 text-xs md:text-sm">
                <tr>
                  <th className="px-3 md:px-4 py-3 text-left">
                    {selectedLevel2 ? 'Symbol' : 'Sector'}
                  </th>
                  <th className="px-3 md:px-4 py-3 text-right">Holdings</th>
                  <th className="px-3 md:px-4 py-3 text-right">Value</th>
                  <th className="px-3 md:px-4 py-3 text-right">Allocation</th>
                  <th className="px-3 md:px-4 py-3 text-right">Return %</th>
                  <th className="px-3 md:px-4 py-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="text-white text-sm md:text-base">
                {selectedLevel2
                  ? // Show holdings when Level 2 selected
                    displaySectors[0]?.holdings.map((holding, idx) => (
                      <tr key={idx} className="border-b border-gray-700 hover:bg-gray-750">
                        <td className="px-3 md:px-4 py-3 font-medium">{holding.symbol}</td>
                        <td className="px-3 md:px-4 py-3 text-right">1</td>
                        <td className="px-3 md:px-4 py-3 text-right">
                          ₹{formatIndian(holding.value)}
                        </td>
                        <td className="px-3 md:px-4 py-3 text-right">
                          {((holding.value / subtotalValue) * 100).toFixed(1)}%
                        </td>
                        <td className={`px-3 md:px-4 py-3 text-right font-medium ${getPerformanceColor(holding.return_pct)}`}>
                          {holding.return_pct >= 0 ? '+' : ''}{holding.return_pct.toFixed(2)}%
                        </td>
                        <td className={`px-3 md:px-4 py-3 text-right`}>
                          <span className={getPerformanceColor(holding.return_pct)}>
                            ₹{formatIndian(holding.value * holding.return_pct / (100 + holding.return_pct))}
                          </span>
                        </td>
                      </tr>
                    ))
                  : // Show sectors
                    displaySectors.map((sector, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors ${getBgPerformanceColor(sector.return_pct)}`}
                        onClick={() => {
                          setSelectedLevel2(sector.sector);
                          // Auto-select parent level 1 if not already selected
                          if (!selectedLevel1) {
                            for (const [l1, l2List] of Object.entries(SECTOR_HIERARCHY)) {
                              if (l2List.some(l2 => sector.sector.toUpperCase().includes(l2.toUpperCase()))) {
                                setSelectedLevel1(l1);
                                break;
                              }
                            }
                          }
                        }}
                      >
                        <td className="px-3 md:px-4 py-3">
                          <div className="font-medium">{sector.sector}</div>
                          <div className="text-xs text-gray-400 mt-1 hidden md:block">
                            {sector.holdings.slice(0, 3).map(h => h.symbol).join(', ')}
                            {sector.holdings.length > 3 && ` +${sector.holdings.length - 3} more`}
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-right">{sector.holdings_count}</td>
                        <td className="px-3 md:px-4 py-3 text-right font-medium">
                          ₹{formatIndian(sector.total_value)}
                        </td>
                        <td className="px-3 md:px-4 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <div className="w-12 md:w-20 bg-gray-700 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${Math.min(sector.allocation_pct, 100)}%` }}
                              />
                            </div>
                            <span>{sector.allocation_pct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className={`px-3 md:px-4 py-3 text-right font-bold ${getPerformanceColor(sector.return_pct)}`}>
                          {sector.return_pct >= 0 ? '+' : ''}{sector.return_pct.toFixed(2)}%
                        </td>
                        <td className={`px-3 md:px-4 py-3 text-right font-medium ${getPerformanceColor(sector.return_pct)}`}>
                          {sector.unrealized_pl >= 0 ? '+' : ''}₹{formatIndian(sector.unrealized_pl)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-4 md:p-6">
          <h3 className="text-lg font-bold text-white mb-4">Key Takeaways</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
              <div>
                <span className="text-gray-400">Concentration: </span>
                <span className="text-white">{concentration.concentration_takeaway}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
              <div>
                <span className="text-gray-400">Diversification: </span>
                <span className="text-white">{concentration.diversification_takeaway}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></div>
              <div>
                <span className="text-gray-400">Top Sector: </span>
                <span className="text-white">
                  {allocation.sectors[0]?.sector} ({allocation.sectors[0]?.allocation_pct.toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5"></div>
              <div>
                <span className="text-gray-400">Best Performer: </span>
                <span className="text-white">
                  {[...allocation.sectors].sort((a, b) => b.return_pct - a.return_pct)[0]?.sector}
                  {' '}
                  (+{[...allocation.sectors].sort((a, b) => b.return_pct - a.return_pct)[0]?.return_pct.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-xs md:text-sm">
          Data as of {allocation.date} • Click sectors to drill down • Click holdings for details
        </div>
      </div>
    </div>
  );
}
