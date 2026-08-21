'use client';

import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Trader } from '../types';
import { Trophy, Search, Award } from './Icons';
import { TraderProfileModal } from './TraderProfileModal';

// Convert country code to emoji flag
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

export const Leaderboard: React.FC = () => {
  const { traders, userTrader } = useSimulation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [activeProfileTrader, setActiveProfileTrader] = useState<Trader | null>(null);

  // The traders array from context already includes the user and is correctly ranked and sorted
  const allTraders = traders;

  // Identify top 3 traders for the podium (stable after sort)
  const podiumTraders = allTraders.slice(0, 3);
  
  // Arrange podium as: [2nd, 1st, 3rd]
  const arrangedPodium = [
    podiumTraders[1], // Silver
    podiumTraders[0], // Gold
    podiumTraders[2]  // Bronze
  ].filter(Boolean); // safety filter

  // Filter list of traders for the table
  const filteredTraders = allTraders.filter((trader) => {
    // Search Name match
    const matchesSearch = trader.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Country Filter match
    const matchesCountry = selectedCountry === 'ALL' || trader.country === selectedCountry;
    
    // Tier Filter match
    let matchesTier = true;
    if (selectedTier !== 'ALL') {
      const roi = trader.roi;
      if (selectedTier === 'TITAN') matchesTier = roi > 200;
      else if (selectedTier === 'MASTER') matchesTier = roi > 120 && roi <= 200;
      else if (selectedTier === 'PRO') matchesTier = roi > 60 && roi <= 120;
      else if (selectedTier === 'CONTENDER') matchesTier = roi <= 60;
    }

    return matchesSearch && matchesCountry && matchesTier;
  });

  // Extract unique countries list
  const uniqueCountries = Array.from(new Set(allTraders.map((t) => t.country))).sort();

  return (
    <div className="space-y-8 pb-12">
      {/* Visual Podium Section */}
      {arrangedPodium.length > 0 && searchQuery === '' && selectedCountry === 'ALL' && selectedTier === 'ALL' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-end">
          {arrangedPodium.map((trader) => {
            const isGold = trader.rank === 1;
            const isSilver = trader.rank === 2;
            const isBronze = trader.rank === 3;

            let cardStyles = '';
            let medalColor = '';
            let borderGlow = '';
            let orderClass = '';

            if (isGold) {
              cardStyles = 'bg-zinc-900 border-amber-500/50 hover:border-amber-500 scale-105 shadow-amber-500/5 hover:-translate-y-2';
              medalColor = 'text-amber-400 bg-amber-950/40 border-amber-500/20';
              borderGlow = 'after:absolute after:inset-0 after:rounded-2xl after:shadow-[0_0_20px_rgba(245,158,11,0.08)]';
              orderClass = 'order-1 md:order-2';
            } else if (isSilver) {
              cardStyles = 'bg-zinc-900/90 border-zinc-500/40 hover:border-zinc-500 shadow-zinc-500/2 hover:-translate-y-1';
              medalColor = 'text-zinc-300 bg-zinc-950/40 border-zinc-500/20';
              orderClass = 'order-2 md:order-1';
            } else if (isBronze) {
              cardStyles = 'bg-zinc-900/90 border-amber-700/40 hover:border-amber-700 shadow-amber-700/2 hover:-translate-y-1';
              medalColor = 'text-amber-600 bg-amber-950/30 border-amber-700/20';
              orderClass = 'order-3';
            }

            return (
              <div 
                key={trader.id}
                onClick={() => setActiveProfileTrader(trader)}
                className={`relative flex flex-col items-center p-6 border rounded-2xl cursor-pointer transition-all duration-300 shadow-xl ${cardStyles} ${borderGlow} ${orderClass}`}
              >
                {/* Ranking Emblem */}
                <div className={`absolute -top-4 px-3 py-1 rounded-full border text-xs font-black font-mono flex items-center gap-1.5 shadow ${medalColor}`}>
                  {isGold ? <Trophy size={12} className="text-amber-400 animate-bounce" /> : <Award size={12} />}
                  Rank {trader.rank}
                </div>

                {/* Avatar */}
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center font-black text-xl mb-4 border transition-transform duration-300 ${
                  isGold 
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-400' 
                    : isSilver 
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-300' 
                      : 'bg-amber-950/20 border-amber-800/20 text-amber-700'
                }`}>
                  {trader.avatar}
                </div>

                {/* Info */}
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
                  {trader.name}
                  <span className="text-base leading-none" title={trader.country}>
                    {getFlagEmoji(trader.country)}
                  </span>
                </h3>

                {trader.isUser && (
                  <span className="text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold px-2 py-0.5 rounded-full mt-1">
                    YOU
                  </span>
                )}

                {/* Primary Metric */}
                <div className="mt-4 flex flex-col items-center">
                  <span className={`text-2xl font-black font-mono tracking-tight ${trader.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trader.roi >= 0 ? '+' : ''}{trader.roi.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Return on Investment</span>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 w-full border-t border-zinc-800/80 mt-5 pt-4 text-center">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider">Win Rate</span>
                    <span className="text-xs font-bold text-zinc-300 font-mono mt-0.5 block">{trader.winRate}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider">Trades</span>
                    <span className="text-xs font-bold text-zinc-300 font-mono mt-0.5 block">{trader.totalTrades}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranks Table Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Controls (Search & Filter) */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/30 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search trader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all font-medium"
            />
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            {/* Country Selector */}
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="flex-1 sm:flex-initial bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 font-bold outline-none focus:border-zinc-700"
            >
              <option value="ALL">🌐 All Countries</option>
              {uniqueCountries.map((c) => (
                <option key={c} value={c}>
                  {getFlagEmoji(c)} {c}
                </option>
              ))}
            </select>

            {/* Class/Tier Selector */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="flex-1 sm:flex-initial bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 font-bold outline-none focus:border-zinc-700"
            >
              <option value="ALL">🏅 All Ranks</option>
              <option value="TITAN">🏆 Apex Titan (&gt;200%)</option>
              <option value="MASTER">🥈 Master Scalper (120-200%)</option>
              <option value="PRO">🥉 Pro Swing (60-120%)</option>
              <option value="CONTENDER">🌱 Active Contender (&lt;60%)</option>
            </select>
          </div>
        </div>

        {/* Table Head */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-left bg-zinc-950/15">
                <th className="py-4 px-5 w-16 text-center">Rank</th>
                <th className="py-4 px-4">Trader</th>
                <th className="py-4 px-4 text-center">Country</th>
                <th className="py-4 px-4 text-right">ROI</th>
                <th className="py-4 px-4 text-right">Win Rate</th>
                <th className="py-4 px-4 text-right">Trades</th>
                <th className="py-4 px-4 text-right">Max DD</th>
                <th className="py-4 px-5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {filteredTraders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 text-sm">
                    No traders found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredTraders.map((trader) => {
                  const isUser = trader.isUser;
                  
                  // Rank icon / highlight
                  let rankContent: React.ReactNode = trader.rank;
                  if (trader.rank === 1) rankContent = <span className="text-amber-400 font-black text-sm">👑</span>;
                  else if (trader.rank === 2) rankContent = <span className="text-zinc-300 font-black text-sm">🥈</span>;
                  else if (trader.rank === 3) rankContent = <span className="text-amber-700 font-black text-sm">🥉</span>;

                  // Rank shift indicators
                  const shift = trader.previousRank - trader.rank;
                  const shiftColor = shift > 0 ? 'text-emerald-500' : shift < 0 ? 'text-rose-500' : 'text-zinc-600';
                  const shiftSymbol = shift > 0 ? '▲' : shift < 0 ? '▼' : '•';

                  return (
                    <tr
                      key={trader.id}
                      onClick={() => setActiveProfileTrader(trader)}
                      className={`hover:bg-zinc-800/25 cursor-pointer transition-colors duration-150 group ${
                        isUser ? 'bg-amber-500/[0.03] border-l-2 border-amber-500' : ''
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-zinc-300 group-hover:text-white transition-colors">
                            {rankContent}
                          </span>
                          <span className={`text-[8px] leading-none mt-0.5 font-bold ${shiftColor}`} title={`Previous Rank: ${trader.previousRank}`}>
                            {shiftSymbol} {Math.abs(shift) || ''}
                          </span>
                        </div>
                      </td>

                      {/* Trader Info Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 group-hover:text-amber-400 group-hover:border-amber-500/20 transition-all">
                            {trader.avatar}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                              {trader.name}
                              {isUser && (
                                <span className="text-[8px] bg-amber-500/25 border border-amber-500/40 text-amber-400 font-bold px-1.5 py-0.5 rounded leading-none">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider leading-none">
                              {trader.roi > 200 ? 'Apex Titan' : trader.roi > 120 ? 'Master Scalper' : trader.roi > 60 ? 'Pro Swing' : 'Contender'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Country Column */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-lg leading-none" title={trader.country}>
                          {getFlagEmoji(trader.country)}
                        </span>
                      </td>

                      {/* ROI Column */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-mono font-extrabold text-sm ${trader.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trader.roi >= 0 ? '+' : ''}{trader.roi.toFixed(2)}%
                        </span>
                      </td>

                      {/* Win Rate Column */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono text-zinc-300 font-bold">{trader.winRate}%</span>
                      </td>

                      {/* Trades Column */}
                      <td className="py-3.5 px-4 text-right text-zinc-400 font-semibold font-mono">
                        {trader.totalTrades}
                      </td>

                      {/* Max Drawdown Column */}
                      <td className="py-3.5 px-4 text-right text-rose-400 font-semibold font-mono text-xs">
                        {trader.maxDrawdown}%
                      </td>

                      {/* Balance Column */}
                      <td className="py-3.5 px-5 text-right font-mono font-extrabold text-zinc-200 text-xs">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(trader.equity)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Modal Overlay */}
      {activeProfileTrader && (
        <TraderProfileModal
          trader={activeProfileTrader}
          onClose={() => setActiveProfileTrader(null)}
        />
      )}
    </div>
  );
};
