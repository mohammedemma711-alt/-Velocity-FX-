'use client';

import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Position } from '../types';

// Web Audio API Synthesizer for premium UI feedback
const playSynthesizedSound = (type: 'success' | 'close' | 'error') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      // Pleasant double chime (high pitch)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5
      gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc2.start(ctx.currentTime + 0.08);
      
      osc.stop(ctx.currentTime + 0.16);
      osc2.stop(ctx.currentTime + 0.26);
    } else if (type === 'close') {
      // Cash register slide
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'error') {
      // Low dull buzzer
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120.00, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch (e) {
    console.error('Audio synthesis failed', e);
  }
};

export const TradingTerminal: React.FC = () => {
  const {
    selectedPair,
    userTrader,
    positions,
    tradeHistory,
    openPosition,
    closePosition,
    currencyPairs
  } = useSimulation();

  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  
  // Form State
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [lots, setLots] = useState(0.10);
  const [leverage, setLeverage] = useState(100);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isJpy = selectedPair.symbol.endsWith('JPY');
  const multiplier = isJpy ? 100 : 10000;

  // Clear messages automatically
  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // Estimate required margin
  const marginRequired = (lots * 100000) / leverage;
  const currentMarginUsed = positions.reduce((sum, pos) => sum + (pos.lots * 100000) / pos.leverage, 0);
  const freeMargin = Math.max(0, userTrader.equity - currentMarginUsed);
  const marginLevel = currentMarginUsed > 0 ? (userTrader.equity / currentMarginUsed) * 100 : Infinity;

  // Calculate live position details
  const getLivePositionPnL = (pos: Position) => {
    const pair = currencyPairs.find((p) => p.symbol === pos.symbol);
    if (!pair) return 0;

    const currentPrice = pos.type === 'BUY' ? pair.bid : pair.ask;
    const isPosJpy = pos.symbol.endsWith('JPY');
    const posMultiplier = isPosJpy ? 100 : 10000;
    
    let pips = (currentPrice - pos.openPrice) * posMultiplier;
    if (pos.type === 'SELL') {
      pips = (pos.openPrice - currentPrice) * posMultiplier;
    }

    return Number((pips * pos.lots * 10).toFixed(2));
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Handle trade submission
  const handleExecuteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (lots <= 0) {
      setErrorMessage('Lot size must be greater than 0.');
      playSynthesizedSound('error');
      return;
    }

    if (marginRequired > freeMargin) {
      setErrorMessage('Insufficient free margin. Reduce lots or increase leverage.');
      playSynthesizedSound('error');
      return;
    }

    const slVal = stopLoss ? parseFloat(stopLoss) : undefined;
    const tpVal = takeProfit ? parseFloat(takeProfit) : undefined;

    // Validate TP/SL logic
    const currentPrice = orderType === 'BUY' ? selectedPair.ask : selectedPair.bid;
    if (slVal !== undefined) {
      if (orderType === 'BUY' && slVal >= currentPrice) {
        setErrorMessage('Stop Loss for BUY order must be below market Ask price.');
        playSynthesizedSound('error');
        return;
      }
      if (orderType === 'SELL' && slVal <= currentPrice) {
        setErrorMessage('Stop Loss for SELL order must be above market Bid price.');
        playSynthesizedSound('error');
        return;
      }
    }
    if (tpVal !== undefined) {
      if (orderType === 'BUY' && tpVal <= currentPrice) {
        setErrorMessage('Take Profit for BUY order must be above market Ask price.');
        playSynthesizedSound('error');
        return;
      }
      if (orderType === 'SELL' && tpVal >= currentPrice) {
        setErrorMessage('Take Profit for SELL order must be below market Bid price.');
        playSynthesizedSound('error');
        return;
      }
    }

    const success = openPosition(
      selectedPair.symbol,
      orderType,
      lots,
      leverage,
      slVal,
      tpVal
    );

    if (success) {
      setSuccessMessage(`${orderType} order executed successfully!`);
      playSynthesizedSound('success');
      // Reset SL/TP fields
      setStopLoss('');
      setTakeProfit('');
    } else {
      setErrorMessage('Failed to open position.');
      playSynthesizedSound('error');
    }
  };

  // Quick preset functions
  const setQuickLots = (value: number) => {
    setLots(value);
  };

  const adjustPipsPreset = (type: 'SL' | 'TP', pipsOffset: number) => {
    const currentPrice = orderType === 'BUY' ? selectedPair.ask : selectedPair.bid;
    const offsetPrice = pipsOffset / multiplier;
    
    let targetPrice = 0;
    if (type === 'SL') {
      targetPrice = orderType === 'BUY' ? currentPrice - offsetPrice : currentPrice + offsetPrice;
      setStopLoss(targetPrice.toFixed(isJpy ? 3 : 5));
    } else {
      targetPrice = orderType === 'BUY' ? currentPrice + offsetPrice : currentPrice - offsetPrice;
      setTakeProfit(targetPrice.toFixed(isJpy ? 3 : 5));
    }
  };

  // Chart Rendering calculations
  const history = selectedPair.history || [];
  const minPrice = Math.min(...history);
  const maxPrice = Math.max(...history);
  const priceRange = maxPrice - minPrice || 1;

  const chartWidth = 580;
  const chartHeight = 240;
  const chartPadding = 20;

  const getChartX = (idx: number) => {
    return chartPadding + (idx / (history.length - 1)) * (chartWidth - chartPadding * 2);
  };

  const getChartY = (val: number) => {
    const scale = (chartHeight - chartPadding * 2) / priceRange;
    return chartHeight - chartPadding - (val - minPrice) * scale;
  };

  // Generate SVG Line Chart path
  const chartLinePath = history.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getChartX(i)} ${getChartY(p)}`).join(' ');

  // Generate mock candlesticks from 30 ticks (chunking every 3 ticks = 10 candles)
  const generateMockCandles = () => {
    const candles = [];
    const chunkSize = 3;
    for (let i = 0; i < history.length; i += chunkSize) {
      const chunk = history.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      const open = chunk[0];
      const close = chunk[chunk.length - 1];
      const high = Math.max(...chunk);
      const low = Math.min(...chunk);
      candles.push({ open, close, high, low, index: i / chunkSize });
    }
    return candles;
  };

  const candles = generateMockCandles();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
      {/* Chart and Terminal Left Panel (Market Dashboard & Active Charts) */}
      <div className="lg:col-span-2 space-y-6 flex flex-col">
        {/* Quick Stats overview strip */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Balance</span>
            <span className="text-sm font-bold font-mono text-zinc-100">{formatCurrency(userTrader.balance)}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Equity</span>
            <span className="text-sm font-bold font-mono text-zinc-100">{formatCurrency(userTrader.equity)}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Margin Used</span>
            <span className="text-sm font-bold font-mono text-zinc-400">{formatCurrency(currentMarginUsed)}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Free Margin</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{formatCurrency(freeMargin)}</span>
          </div>
          <div className="space-y-0.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Margin Level</span>
            <span className={`text-sm font-bold font-mono ${marginLevel === Infinity ? 'text-zinc-400' : marginLevel >= 200 ? 'text-emerald-400' : marginLevel >= 100 ? 'text-amber-400' : 'text-rose-500'}`}>
              {marginLevel === Infinity ? '100%' : `${marginLevel.toFixed(0)}%`}
            </span>
          </div>
        </div>

        {/* Real-time Interactive Ticks Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex-1 flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-base text-zinc-100 tracking-tight">{selectedPair.symbol} Live Chart</span>
              <span className={`font-mono text-xs font-bold leading-none px-2 py-0.5 rounded ${
                selectedPair.changePercent >= 0 ? 'bg-emerald-950/40 text-emerald-400' : 'bg-rose-950/40 text-rose-400'
              }`}>
                {selectedPair.changePercent >= 0 ? '+' : ''}{selectedPair.changePercent}%
              </span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setChartType('line')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border outline-none ${
                  chartType === 'line' 
                    ? 'bg-zinc-850 border-zinc-700 text-zinc-100 shadow-sm' 
                    : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Line
              </button>
              <button 
                onClick={() => setChartType('candle')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border outline-none ${
                  chartType === 'candle' 
                    ? 'bg-zinc-850 border-zinc-700 text-zinc-100 shadow-sm' 
                    : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Candlesticks
              </button>
            </div>
          </div>

          {/* Chart Display Area */}
          <div className="flex-1 bg-zinc-950/30 border border-zinc-800/80 rounded-xl relative overflow-hidden flex items-center justify-center p-2">
            {history.length < 2 ? (
              <span className="text-xs text-zinc-500 font-semibold animate-pulse">Initializing data streams...</span>
            ) : (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                {/* Horizontal price reference bounds */}
                <line x1={chartPadding} y1={getChartY(maxPrice)} x2={chartWidth - chartPadding} y2={getChartY(maxPrice)} stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
                <text x={chartWidth - chartPadding + 5} y={getChartY(maxPrice) + 3} fill="#52525b" fontSize="8" fontFamily="monospace" textAnchor="start">
                  {maxPrice.toFixed(isJpy ? 3 : 5)}
                </text>

                <line x1={chartPadding} y1={getChartY(minPrice)} x2={chartWidth - chartPadding} y2={getChartY(minPrice)} stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
                <text x={chartWidth - chartPadding + 5} y={getChartY(minPrice) + 3} fill="#52525b" fontSize="8" fontFamily="monospace" textAnchor="start">
                  {minPrice.toFixed(isJpy ? 3 : 5)}
                </text>

                {chartType === 'line' ? (
                  // Line Path
                  <path
                    d={chartLinePath}
                    fill="none"
                    stroke={selectedPair.price >= selectedPair.prevPrice ? '#10b981' : '#f43f5e'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />
                ) : (
                  // Candlestick rendering
                  candles.map((candle, idx) => {
                    const x = chartPadding + (idx / (candles.length - 1)) * (chartWidth - chartPadding * 2);
                    const yOpen = getChartY(candle.open);
                    const yClose = getChartY(candle.close);
                    const yHigh = getChartY(candle.high);
                    const yLow = getChartY(candle.low);
                    
                    const isGreen = candle.close >= candle.open;
                    const candleColor = isGreen ? '#10b981' : '#f43f5e';
                    const top = Math.min(yOpen, yClose);
                    const height = Math.max(1.5, Math.abs(yOpen - yClose));

                    return (
                      <g key={idx}>
                        {/* Shadow line (wick) */}
                        <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={candleColor} strokeWidth="1.5" />
                        {/* Body */}
                        <rect
                          x={x - 4}
                          y={top}
                          width="8"
                          height={height}
                          fill={candleColor}
                          stroke={candleColor}
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })
                )}
                
                {/* Glowing Dot on Latest Ticks */}
                <circle
                  cx={getChartX(history.length - 1)}
                  cy={getChartY(selectedPair.price)}
                  r="4.5"
                  fill={selectedPair.price >= selectedPair.prevPrice ? '#10b981' : '#f43f5e'}
                  className="animate-pulse"
                />
              </svg>
            )}

            {/* Float values bar overlay */}
            <div className="absolute top-3 left-3 bg-zinc-900/90 border border-zinc-800 rounded-lg p-2 flex gap-4 text-[10px] font-semibold text-zinc-400 leading-none">
              <div>
                <span className="text-zinc-500 mr-1.5 uppercase font-medium">Ask:</span>
                <span className="font-mono text-zinc-200">{selectedPair.ask.toFixed(isJpy ? 3 : 5)}</span>
              </div>
              <div>
                <span className="text-zinc-500 mr-1.5 uppercase font-medium">Bid:</span>
                <span className="font-mono text-zinc-200">{selectedPair.bid.toFixed(isJpy ? 3 : 5)}</span>
              </div>
              <div>
                <span className="text-zinc-500 mr-1.5 uppercase font-medium">High:</span>
                <span className="font-mono text-zinc-200">{selectedPair.high.toFixed(isJpy ? 3 : 5)}</span>
              </div>
              <div>
                <span className="text-zinc-500 mr-1.5 uppercase font-medium">Low:</span>
                <span className="font-mono text-zinc-200">{selectedPair.low.toFixed(isJpy ? 3 : 5)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Panel Right Panel (Order Book and execution form) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <form onSubmit={handleExecuteOrder} className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">Place Trade Order</h3>
            <span className="text-xs font-bold text-amber-500 tracking-tight font-mono">{selectedPair.symbol}</span>
          </div>

          {/* Feedback alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 text-rose-400 text-xs rounded-xl font-bold font-sans">
              ⚠️ {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs rounded-xl font-bold font-sans">
              ✓ {successMessage}
            </div>
          )}

          {/* Order Side Toggle (BUY/SELL) */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-1.5 rounded-xl border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setOrderType('BUY')}
              className={`py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all outline-none ${
                orderType === 'BUY'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                  : 'text-zinc-500 hover:text-zinc-300 bg-transparent'
              }`}
            >
              Buy / Long
            </button>
            <button
              type="button"
              onClick={() => setOrderType('SELL')}
              className={`py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all outline-none ${
                orderType === 'SELL'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10'
                  : 'text-zinc-500 hover:text-zinc-300 bg-transparent'
              }`}
            >
              Sell / Short
            </button>
          </div>

          {/* Lots Size */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <label className="text-zinc-400 uppercase tracking-wide text-[10px]">Trade Size (Lots)</label>
              <span className="text-zinc-500 font-mono">1 Lot = 100K Units</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="20"
              value={lots}
              onChange={(e) => setLots(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 font-bold font-mono focus:outline-none focus:border-zinc-700"
            />
            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1.5">
              {[0.01, 0.10, 1.00, 5.00].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQuickLots(val)}
                  className={`py-1 rounded-lg text-[10px] font-bold font-mono border transition-all ${
                    lots === val 
                      ? 'bg-zinc-800 border-zinc-650 text-zinc-100' 
                      : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  {val.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* Leverage Selector */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 uppercase tracking-wide text-[10px] font-semibold">Leverage</label>
            <select
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 font-bold font-mono focus:outline-none focus:border-zinc-700"
            >
              <option value={20}>1:20 (Standard Retail)</option>
              <option value={50}>1:50 (High Retail)</option>
              <option value={100}>1:100 (Professional)</option>
              <option value={200}>1:200 (Apex Aggressive)</option>
              <option value={500}>1:500 (Extreme Volatility)</option>
            </select>
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-zinc-400 uppercase tracking-wide text-[10px] font-semibold block">Stop Loss</label>
              <input
                type="number"
                step={isJpy ? '0.01' : '0.0001'}
                placeholder="None"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-bold font-mono focus:outline-none focus:border-zinc-700"
              />
              <div className="grid grid-cols-2 gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => adjustPipsPreset('SL', 20)}
                  className="py-1 rounded bg-zinc-850 hover:bg-zinc-800 border border-zinc-800/80 text-[9px] font-mono text-zinc-400 font-semibold"
                >
                  -20 pips
                </button>
                <button
                  type="button"
                  onClick={() => adjustPipsPreset('SL', 50)}
                  className="py-1 rounded bg-zinc-850 hover:bg-zinc-800 border border-zinc-800/80 text-[9px] font-mono text-zinc-400 font-semibold"
                >
                  -50 pips
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 uppercase tracking-wide text-[10px] font-semibold block">Take Profit</label>
              <input
                type="number"
                step={isJpy ? '0.01' : '0.0001'}
                placeholder="None"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-bold font-mono focus:outline-none focus:border-zinc-700"
              />
              <div className="grid grid-cols-2 gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => adjustPipsPreset('TP', 30)}
                  className="py-1 rounded bg-zinc-850 hover:bg-zinc-800 border border-zinc-800/80 text-[9px] font-mono text-zinc-400 font-semibold"
                >
                  +30 pips
                </button>
                <button
                  type="button"
                  onClick={() => adjustPipsPreset('TP', 60)}
                  className="py-1 rounded bg-zinc-850 hover:bg-zinc-800 border border-zinc-800/80 text-[9px] font-mono text-zinc-400 font-semibold"
                >
                  +60 pips
                </button>
              </div>
            </div>
          </div>

          {/* Cost Estimates */}
          <div className="bg-zinc-950/40 p-3.5 border border-zinc-800/60 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-zinc-500 font-medium">
              <span>Required Margin:</span>
              <span className="font-mono text-zinc-300 font-bold">{formatCurrency(marginRequired)}</span>
            </div>
            <div className="flex justify-between text-zinc-500 font-medium">
              <span>Free Margin Remaining:</span>
              <span className="font-mono text-zinc-350">{formatCurrency(freeMargin - marginRequired)}</span>
            </div>
            <div className="flex justify-between text-zinc-500 font-medium">
              <span>Pip Value (USD):</span>
              <span className="font-mono text-zinc-300 font-bold">${(lots * 10).toFixed(2)} / pip</span>
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            type="submit"
            className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm outline-none transition-all ${
              orderType === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/10 text-white'
                : 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/10 text-white'
            }`}
          >
            Execute {orderType} Order
          </button>
        </form>
      </div>

      {/* Live Positions / Trade History Log panel */}
      <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl min-h-[250px] flex flex-col">
        {/* Toggle Head */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/30 px-5 pt-3 items-end gap-5">
          <button
            onClick={() => setActiveTab('positions')}
            className={`pb-3 text-xs font-extrabold uppercase tracking-widest transition-all outline-none border-b-2 ${
              activeTab === 'positions'
                ? 'border-amber-500 text-zinc-100 font-black'
                : 'border-transparent text-zinc-500 hover:text-zinc-350'
            }`}
          >
            Open Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-extrabold uppercase tracking-widest transition-all outline-none border-b-2 ${
              activeTab === 'history'
                ? 'border-amber-500 text-zinc-100 font-black'
                : 'border-transparent text-zinc-500 hover:text-zinc-350'
            }`}
          >
            Trade History ({tradeHistory.length})
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
          {activeTab === 'positions' ? (
            positions.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs font-bold">
                No active open trades. Choose a currency pair and execute an order.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/60 text-[9px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-950/10">
                    <th className="p-3.5 pl-5">Position ID</th>
                    <th className="p-3.5">Symbol</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5 text-right">Lots</th>
                    <th className="p-3.5 text-right">Leverage</th>
                    <th className="p-3.5 text-right">Open Price</th>
                    <th className="p-3.5 text-right">Current Price</th>
                    <th className="p-3.5 text-right">TP / SL</th>
                    <th className="p-3.5 text-right">Live PnL</th>
                    <th className="p-3.5 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-semibold text-zinc-300">
                  {positions.map((pos) => {
                    const pair = currencyPairs.find((p) => p.symbol === pos.symbol);
                    const livePrice = pair ? (pos.type === 'BUY' ? pair.bid : pair.ask) : pos.openPrice;
                    const pnl = getLivePositionPnL(pos);
                    const pnlColor = pnl >= 0 ? 'text-emerald-400' : 'text-rose-400';
                    const isPosJpy = pos.symbol.endsWith('JPY');

                    return (
                      <tr key={pos.id} className="hover:bg-zinc-800/15 transition-colors">
                        <td className="p-3.5 pl-5 font-mono text-[10px] text-zinc-500">{pos.id}</td>
                        <td className="p-3.5 font-bold text-zinc-200">{pos.symbol}</td>
                        <td className="p-3.5">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                            pos.type === 'BUY' 
                              ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-400' 
                              : 'bg-rose-500/15 border border-rose-500/35 text-rose-400'
                          }`}>
                            {pos.type}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-zinc-200">{pos.lots.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono text-zinc-400">1:{pos.leverage}</td>
                        <td className="p-3.5 text-right font-mono">{pos.openPrice.toFixed(isPosJpy ? 3 : 5)}</td>
                        <td className="p-3.5 text-right font-mono text-zinc-200">{livePrice.toFixed(isPosJpy ? 3 : 5)}</td>
                        <td className="p-3.5 text-right font-mono text-zinc-400">
                          {pos.takeProfit ? `TP: ${pos.takeProfit.toFixed(isPosJpy ? 3 : 5)}` : ''}
                          {pos.takeProfit && pos.stopLoss ? ' / ' : ''}
                          {pos.stopLoss ? `SL: ${pos.stopLoss.toFixed(isPosJpy ? 3 : 5)}` : 'None'}
                        </td>
                        <td className={`p-3.5 text-right font-mono font-extrabold text-sm ${pnlColor}`}>
                          {pnl >= 0 ? '+' : ''}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <button
                            onClick={() => {
                              closePosition(pos.id);
                              playSynthesizedSound('close');
                            }}
                            className="bg-zinc-800 hover:bg-rose-950/30 border border-zinc-700 hover:border-rose-900/60 hover:text-rose-400 text-zinc-300 font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all outline-none"
                          >
                            Close Trade
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            tradeHistory.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs font-bold">
                No trading history recorded yet. Close open positions to realize profits/losses.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/60 text-[9px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-950/10">
                    <th className="p-3.5 pl-5">Trade ID</th>
                    <th className="p-3.5">Symbol</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5 text-right">Lots</th>
                    <th className="p-3.5 text-right">Leverage</th>
                    <th className="p-3.5 text-right">Open Price</th>
                    <th className="p-3.5 text-right">Close Price</th>
                    <th className="p-3.5 text-right">Pips</th>
                    <th className="p-3.5 text-right">Realized PnL</th>
                    <th className="p-3.5 pr-5 text-right">Time Closed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-semibold text-zinc-400">
                  {[...tradeHistory].reverse().map((trade) => {
                    const isTradeJpy = trade.symbol.endsWith('JPY');
                    const pnlColor = trade.profit >= 0 ? 'text-emerald-400' : 'text-rose-400';
                    const closedDate = new Date(trade.closeTime).toLocaleTimeString();

                    return (
                      <tr key={trade.id} className="hover:bg-zinc-800/10 transition-colors">
                        <td className="p-3.5 pl-5 font-mono text-[10px] text-zinc-500">{trade.id}</td>
                        <td className="p-3.5 font-bold text-zinc-200">{trade.symbol}</td>
                        <td className="p-3.5">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                            trade.type === 'BUY' 
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-zinc-300">{trade.lots.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono">1:{trade.leverage}</td>
                        <td className="p-3.5 text-right font-mono">{trade.openPrice.toFixed(isTradeJpy ? 3 : 5)}</td>
                        <td className="p-3.5 text-right font-mono text-zinc-200">{trade.closePrice.toFixed(isTradeJpy ? 3 : 5)}</td>
                        <td className={`p-3.5 text-right font-mono font-bold ${trade.pips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.pips >= 0 ? '+' : ''}{trade.pips}
                        </td>
                        <td className={`p-3.5 text-right font-mono font-extrabold text-sm ${pnlColor}`}>
                          {trade.profit >= 0 ? '+' : ''}{formatCurrency(trade.profit)}
                        </td>
                        <td className="p-3.5 pr-5 text-right font-mono text-zinc-500 text-[10px]">{closedDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
};
