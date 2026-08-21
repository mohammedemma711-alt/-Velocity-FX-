'use client';

import React from 'react';
import { Trader, Trade } from '../types';
import { X } from './Icons';

interface TraderProfileModalProps {
  trader: Trader;
  onClose: () => void;
}

// Convert country code to emoji flag
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

// Seed-based random number generator to ensure mock trader histories remain stable when clicking
const seedRandom = (seedString: string) => {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
};

export const TraderProfileModal: React.FC<TraderProfileModalProps> = ({ trader, onClose }) => {
  // Generate stable mock trade history for this trader using their name as a seed
  const rand = seedRandom(trader.name);
  const mockTrades: Trade[] = [];
  const symbolList = trader.preferredPairs.length > 0 ? trader.preferredPairs : ['EUR/USD', 'GBP/USD', 'USD/JPY'];
  
  const numTrades = Math.min(10, trader.totalTrades);
  let timeOffset = 3600000 * 4; // 4 hours ago
  const baseTime = 1786600000000; // Stable reference time (August 2026) for pure component rendering

  for (let i = 0; i < numTrades; i++) {
    const symbol = symbolList[Math.floor(rand() * symbolList.length)];
    const isJpy = symbol.endsWith('JPY');
    const isBuy = rand() > 0.4;
    const winRateVal = trader.winRate / 100;
    const isWin = rand() < winRateVal;

    const lots = Number((rand() * 1.5 + 0.1).toFixed(2));
    const openPrice = isJpy ? Number((rand() * 5 + 140).toFixed(3)) : Number((rand() * 0.05 + 1.05).toFixed(5));
    
    // Calculate Pips depending on win/loss
    const pipDiff = isWin 
      ? (rand() * 25 + 5) 
      : -(rand() * 18 + 5);

    const closePrice = isBuy
      ? openPrice + (pipDiff / (isJpy ? 100 : 10000))
      : openPrice - (pipDiff / (isJpy ? 100 : 10000));
    
    const profit = Number((pipDiff * lots * 10).toFixed(2));

    mockTrades.push({
      id: `trade-history-${trader.id}-${i}`,
      symbol,
      type: isBuy ? 'BUY' : 'SELL',
      lots,
      leverage: 100,
      openPrice: Number(openPrice.toFixed(isJpy ? 3 : 5)),
      closePrice: Number(closePrice.toFixed(isJpy ? 3 : 5)),
      openTime: baseTime - timeOffset - (rand() * 3600000),
      closeTime: baseTime - timeOffset,
      profit,
      pips: Number(pipDiff.toFixed(1))
    });

    timeOffset += 3600000 * (rand() * 8 + 3); // step back in time
  }

  // Formatting currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Custom SVG Chart Generator
  // Standard dimension: 600 x 200
  const chartWidth = 600;
  const chartHeight = 220;
  const paddingLeft = 65;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const dataPoints = trader.history || [];
  const minEquity = Math.min(...dataPoints.map((d) => d.equity));
  const maxEquity = Math.max(...dataPoints.map((d) => d.equity));
  const equityRange = maxEquity - minEquity || 1;

  const getX = (index: number) => {
    return paddingLeft + (index / (dataPoints.length - 1)) * (chartWidth - paddingLeft - paddingRight);
  };

  const getY = (value: number) => {
    const scale = (chartHeight - paddingTop - paddingBottom) / equityRange;
    return chartHeight - paddingBottom - (value - minEquity) * scale;
  };

  // Generate SVG path for line
  const linePath = dataPoints.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.equity)}`).join(' ');

  // Generate SVG path for area fill
  const areaPath = `
    ${linePath} 
    L ${getX(dataPoints.length - 1)} ${chartHeight - paddingBottom} 
    L ${getX(0)} ${chartHeight - paddingBottom} 
    Z
  `;

  // Mid points for grid lines
  const gridValues = [
    minEquity,
    minEquity + equityRange * 0.25,
    minEquity + equityRange * 0.5,
    minEquity + equityRange * 0.75,
    maxEquity
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg font-bold text-amber-400">
              {trader.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-zinc-100">{trader.name}</h2>
                <span className="text-xl leading-none" title={`Country Code: ${trader.country}`}>
                  {getFlagEmoji(trader.country)}
                </span>
                {trader.isUser && (
                  <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold px-2 py-0.5 rounded-full">
                    YOU
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-medium">Rank #{trader.rank} on competition leaderboard</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Key Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] text-zinc-500 font-semibold tracking-wider uppercase">ROI</span>
              <span className={`text-xl font-black mt-2 font-mono ${trader.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trader.roi >= 0 ? '+' : ''}{trader.roi}%
              </span>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] text-zinc-500 font-semibold tracking-wider uppercase">Win Rate</span>
              <span className="text-xl font-black mt-2 font-mono text-zinc-200">
                {trader.winRate}%
              </span>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] text-zinc-500 font-semibold tracking-wider uppercase">Max Drawdown</span>
              <span className="text-xl font-black mt-2 font-mono text-rose-400">
                {trader.maxDrawdown}%
              </span>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] text-zinc-500 font-semibold tracking-wider uppercase">Total Trades</span>
              <span className="text-xl font-black mt-2 font-mono text-zinc-200">
                {trader.totalTrades}
              </span>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5">
            <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase mb-4">30-Day Growth Analytics</h3>
            <div className="w-full overflow-x-auto">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full min-w-[550px] overflow-visible"
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trader.roi >= 0 ? '#10b981' : '#f43f5e'} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={trader.roi >= 0 ? '#10b981' : '#f43f5e'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {gridValues.map((val, idx) => (
                  <g key={idx}>
                    <line 
                      x1={paddingLeft} 
                      y1={getY(val)} 
                      x2={chartWidth - paddingRight} 
                      y2={getY(val)} 
                      stroke="#27272a" 
                      strokeWidth="1" 
                      strokeDasharray="4 4" 
                    />
                    <text 
                      x={paddingLeft - 8} 
                      y={getY(val) + 4} 
                      fill="#71717a" 
                      fontSize="9" 
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {formatCurrency(val)}
                    </text>
                  </g>
                ))}

                {/* Shaded Area */}
                <path d={areaPath} fill="url(#areaGrad)" />

                {/* Main Line */}
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke={trader.roi >= 0 ? '#34d399' : '#fb7185'} 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* High / Low labels */}
                <circle cx={getX(dataPoints.length - 1)} cy={getY(trader.equity)} r="4" fill={trader.roi >= 0 ? '#34d399' : '#fb7185'} />

                {/* X-axis Days */}
                <text x={paddingLeft} y={chartHeight - 6} fill="#52525b" fontSize="10" textAnchor="middle">Day 1</text>
                <text x={paddingLeft + (chartWidth - paddingLeft - paddingRight) / 2} y={chartHeight - 6} fill="#52525b" fontSize="10" textAnchor="middle">Day 15</text>
                <text x={chartWidth - paddingRight} y={chartHeight - 6} fill="#52525b" fontSize="10" textAnchor="middle">Day 30</text>
              </svg>
            </div>
          </div>

          {/* Secondary Stats & Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Extended Metrics */}
            <div className="bg-zinc-950/20 border border-zinc-800/50 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">Trader Profile DNA</h3>
              <div className="divide-y divide-zinc-800/60">
                <div className="py-2.5 flex justify-between text-sm">
                  <span className="text-zinc-500">Current Equity</span>
                  <span className="font-mono font-bold text-zinc-200">{formatCurrency(trader.equity)}</span>
                </div>
                <div className="py-2.5 flex justify-between text-sm">
                  <span className="text-zinc-500">Starting Balance</span>
                  <span className="font-mono text-zinc-400">{formatCurrency(10000)}</span>
                </div>
                <div className="py-2.5 flex justify-between text-sm">
                  <span className="text-zinc-500">Profit Factor</span>
                  <span className="font-mono font-bold text-zinc-200">{trader.profitFactor || 'N/A'}</span>
                </div>
                <div className="py-2.5 flex justify-between text-sm">
                  <span className="text-zinc-500">Preferred Assets</span>
                  <span className="font-semibold text-zinc-200">{symbolList.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Performance Rating */}
            <div className="bg-zinc-950/20 border border-zinc-800/50 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase mb-3">Performance Class</h3>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏅</span>
                  <div>
                    <h4 className="text-lg font-bold text-amber-400">
                      {trader.roi > 200 ? 'Apex Titan' : trader.roi > 120 ? 'Master Scalper' : trader.roi > 60 ? 'Pro Swing Trader' : 'Active Contender'}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Rating based on active ROI, risk factor, and drawdown stability ratios.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800/80 rounded-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-semibold">Consistency Score:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {Math.round(trader.winRate * (1 - trader.maxDrawdown / 100))}%
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full" 
                    style={{ width: `${Math.round(trader.winRate * (1 - trader.maxDrawdown / 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Log */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">Recent Closed Trades Log</h3>
            {mockTrades.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-sm border border-zinc-800 rounded-xl bg-zinc-950/20">
                No recorded trades.
              </div>
            ) : (
              <div className="border border-zinc-800/80 rounded-xl overflow-hidden divide-y divide-zinc-800 bg-zinc-950/30">
                {mockTrades.map((trade) => {
                  const profitVal = Number(trade.profit);
                  const profitColor = profitVal >= 0 ? 'text-emerald-400' : 'text-rose-400';
                  
                  return (
                    <div key={trade.id} className="p-3.5 flex justify-between items-center hover:bg-zinc-800/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          trade.type === 'BUY' 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        }`}>
                          {trade.type}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-zinc-200">{trade.symbol}</div>
                          <div className="text-[10px] text-zinc-500 font-semibold">
                            {trade.lots} lots @ {trade.openPrice.toLocaleString()} → {trade.closePrice.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-mono text-sm font-extrabold ${profitColor}`}>
                          {profitVal >= 0 ? '+' : ''}{formatCurrency(profitVal)}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {trade.pips >= 0 ? '+' : ''}{trade.pips} pips
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
