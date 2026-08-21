'use client';

import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { TrendingUp, TrendingDown } from './Icons';

export const MarketWatch: React.FC = () => {
  const { currencyPairs, selectedPair, setSelectedPair } = useSimulation();

  return (
    <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-full">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
        <h2 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">Live Forex Market</h2>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar">
        {currencyPairs.map((pair) => {
          const isSelected = selectedPair.symbol === pair.symbol;

          const tickColor = pair.price > pair.prevPrice 
            ? 'text-emerald-400' 
            : pair.price < pair.prevPrice 
              ? 'text-rose-400' 
              : 'text-zinc-300';

          return (
            <button
              key={pair.symbol}
              onClick={() => setSelectedPair(pair)}
              className={`w-full text-left p-3.5 flex items-center justify-between transition-all duration-150 hover:bg-zinc-800/40 outline-none ${
                isSelected ? 'bg-zinc-800/60 border-l-4 border-amber-500 pl-2.5' : 'pl-3.5'
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-zinc-100 tracking-tight text-sm">{pair.symbol}</span>
                <span className="text-[10px] text-zinc-500 font-medium">Spread: {pair.symbol.endsWith('JPY') ? '1.5' : '1.4'} pips</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className={`font-mono font-bold text-sm tracking-tight transition-colors duration-300 ${tickColor}`}>
                    {pair.price.toLocaleString(undefined, { minimumFractionDigits: pair.symbol.endsWith('JPY') ? 3 : 5 })}
                  </span>
                  <div className="flex gap-1.5 text-[10px] font-mono text-zinc-400">
                    <span>B: {pair.bid.toFixed(pair.symbol.endsWith('JPY') ? 3 : 5)}</span>
                    <span>A: {pair.ask.toFixed(pair.symbol.endsWith('JPY') ? 3 : 5)}</span>
                  </div>
                </div>

                <div className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-bold leading-none min-w-[65px] justify-center ${
                  pair.changePercent >= 0 
                    ? 'bg-emerald-950/45 text-emerald-400 border border-emerald-900/50' 
                    : 'bg-rose-950/45 text-rose-400 border border-rose-900/50'
                }`}>
                  {pair.changePercent >= 0 ? <TrendingUp size={12} className="inline mr-0.5" /> : <TrendingDown size={12} className="inline mr-0.5" />}
                  <span>{pair.changePercent >= 0 ? '+' : ''}{pair.changePercent}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
