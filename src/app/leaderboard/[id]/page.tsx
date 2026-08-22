'use client';

import React, { useState, useEffect } from 'react';
import { useApp, Participant, Competition } from '../../context/AppContext';
import { Trophy, Award, Search, X, Clock, Globe } from '../../components/Icons';
import Link from 'next/link';

// Convert country code to emoji flag
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

export default function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const {
    currentUser,
    availableUsers,
    switchUser,
    competitions,
    participants,
    trades,
    isLoading
  } = useApp();

  const [compId, setCompId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | 'daily' | 'monthly' | 'yearly'>('all');
  
  // Inspector State
  const [inspectedPart, setInspectedPart] = useState<Participant | null>(null);

  // Resolve Next.js async params
  useEffect(() => {
    params.then((p) => {
      setCompId(p.id);
    });
  }, [params]);

  // Find active competition
  const activeComp = competitions.find((c) => c.id === compId) || competitions[0];

  useEffect(() => {
    if (activeComp && !compId) {
      setCompId(activeComp.id);
    }
  }, [activeComp, compId]);

  if (isLoading || !compId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="animate-spin text-2xl">⏳</span>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Loading Standings...</span>
        </div>
      </div>
    );
  }

  // Get participants of current active competition
  const currentParticipants = participants
    .filter((p) => p.competition_id === activeComp.id)
    // Sort by ROI % descending, disqualified traders are placed at the bottom
    .sort((a, b) => {
      if (a.status === 'disqualified' && b.status !== 'disqualified') return 1;
      if (b.status === 'disqualified' && a.status !== 'disqualified') return -1;
      return b.pnl_pct - a.pnl_pct;
    });

  // Assign dynamic live rankings
  const rankedParticipants = currentParticipants.map((p, idx) => ({
    ...p,
    rank: idx + 1
  }));

  // Apply search query
  const filteredParticipants = rankedParticipants.filter((p) => {
    const name = p.user?.name || '';
    const broker = p.account?.broker_server || '';
    const accountNum = p.account?.account_number || '';
    const query = searchQuery.toLowerCase();

    return (
      name.toLowerCase().includes(query) ||
      broker.toLowerCase().includes(query) ||
      accountNum.toLowerCase().includes(query)
    );
  });

  // Podium (Top 3 active)
  const activePodium = rankedParticipants.filter(p => p.status === 'active').slice(0, 3);
  const arrangedPodium = [
    activePodium[1], // Silver (2nd)
    activePodium[0], // Gold (1st)
    activePodium[2]  // Bronze (3rd)
  ].filter(Boolean);

  // Timeframe filter handler - Switch competitions corresponding to timeframe
  const handleTimeframeChange = (filter: 'all' | 'daily' | 'monthly' | 'yearly') => {
    setTimeframeFilter(filter);
    if (filter === 'all') return;
    
    // Find first competition matching the chosen timeframe category
    const matchingComp = competitions.find(c => c.category === filter);
    if (matchingComp) {
      setCompId(matchingComp.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 font-sans text-zinc-100 select-none">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/80 px-4 md:px-8 py-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <span className="text-zinc-950 font-black text-base tracking-tighter">⚡</span>
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider uppercase text-zinc-100 flex items-center gap-1.5 leading-none">
              Velocity FX <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">LIVE BROADCAST</span>
            </h1>
            <span className="text-[10px] text-zinc-500 font-medium">Realtime Standings Synced over WebSocket</span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl transition-all"
          >
            ← Back to Dashboard
          </Link>
          <div className="h-8 w-[1px] bg-zinc-800"></div>
          {/* Active user role switcher to allow quick view toggling */}
          <select
            value={currentUser.id}
            onChange={(e) => switchUser(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-[10px] text-zinc-300 font-bold focus:outline-none"
          >
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Broadcast Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Competition Context details */}
        {activeComp && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
            
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-zinc-950 text-amber-400 border border-zinc-850 font-mono">
                  {activeComp.category} Contests
                </span>
                <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
                  ● Realtime WebSocket Connected
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-zinc-100">{activeComp.title}</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {activeComp.description || 'Live leaderboard displaying retail traders who connected read-only MT5 credentials.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 font-mono text-xs font-bold text-zinc-300 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl">
              <div className="space-y-0.5">
                <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-black">Min Equity</span>
                <span>${activeComp.min_equity.toLocaleString()}</span>
              </div>
              <div className="h-8 w-[1px] bg-zinc-850"></div>
              <div className="space-y-0.5">
                <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-black">Max Drawdown</span>
                <span className="text-rose-400">{activeComp.max_drawdown}%</span>
              </div>
              <div className="h-8 w-[1px] bg-zinc-850"></div>
              <div className="space-y-0.5">
                <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-black">Participants</span>
                <span>{rankedParticipants.length} Joined</span>
              </div>
            </div>
          </div>
        )}

        {/* Timeframe Toggles */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900 border border-zinc-800/80 p-3 rounded-2xl">
          <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-850 gap-1 w-full sm:w-auto">
            <button
              onClick={() => handleTimeframeChange('all')}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-all outline-none ${
                timeframeFilter === 'all'
                  ? 'bg-amber-500 text-zinc-950 font-black'
                  : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              All Standings
            </button>
            <button
              onClick={() => handleTimeframeChange('daily')}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-all outline-none ${
                timeframeFilter === 'daily'
                  ? 'bg-amber-500 text-zinc-950 font-black'
                  : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => handleTimeframeChange('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-all outline-none ${
                timeframeFilter === 'monthly'
                  ? 'bg-amber-500 text-zinc-950 font-black'
                  : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => handleTimeframeChange('yearly')}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-all outline-none ${
                timeframeFilter === 'yearly'
                  ? 'bg-amber-500 text-zinc-950 font-black'
                  : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              Yearly
            </button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search active traders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-all font-medium"
            />
          </div>
        </div>

        {/* Podium stand for top 3 */}
        {arrangedPodium.length > 0 && searchQuery === '' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-end">
            {arrangedPodium.map((part) => {
              const isGold = part.rank === 1;
              const isSilver = part.rank === 2;
              const isBronze = part.rank === 3;

              let cardStyles = '';
              let medalColor = '';
              let orderClass = '';

              if (isGold) {
                cardStyles = 'bg-zinc-900 border-amber-500/50 scale-105 shadow-amber-500/5 hover:-translate-y-2';
                medalColor = 'text-amber-400 bg-amber-950/40 border-amber-500/20';
                orderClass = 'order-1 md:order-2';
              } else if (isSilver) {
                cardStyles = 'bg-zinc-900 border-zinc-500/40 shadow-zinc-500/2 hover:-translate-y-1';
                medalColor = 'text-zinc-300 bg-zinc-950/40 border-zinc-500/20';
                orderClass = 'order-2 md:order-1';
              } else if (isBronze) {
                cardStyles = 'bg-zinc-900 border-amber-700/40 shadow-amber-700/2 hover:-translate-y-1';
                medalColor = 'text-amber-600 bg-amber-950/30 border-amber-700/20';
                orderClass = 'order-3';
              }

              return (
                <div
                  key={part.id}
                  onClick={() => setInspectedPart(part)}
                  className={`relative flex flex-col items-center p-6 border rounded-3xl cursor-pointer transition-all duration-300 shadow-xl ${cardStyles} ${orderClass}`}
                >
                  <div className={`absolute -top-4 px-3 py-1 rounded-full border text-xs font-black font-mono flex items-center gap-1.5 shadow ${medalColor}`}>
                    {isGold ? <Trophy size={12} className="text-amber-400 animate-bounce" /> : <Award size={12} />}
                    Standings Rank {part.rank}
                  </div>

                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center font-black text-xl mb-4 bg-zinc-800 border border-zinc-700 text-zinc-300">
                    {part.user?.avatar || 'TR'}
                  </div>

                  <h3 className="text-sm font-black text-zinc-100 flex items-center gap-1.5">
                    {part.user?.name || 'Trader'}
                    <span className="text-base leading-none" title={part.user?.country}>
                      {getFlagEmoji(part.user?.country || 'US')}
                    </span>
                  </h3>

                  {part.user_id === currentUser.id && (
                    <span className="text-[8px] bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black px-2 py-0.5 rounded-full mt-1.5 tracking-wider uppercase">
                      YOU
                    </span>
                  )}

                  <div className="mt-4 flex flex-col items-center">
                    <span className={`text-2xl font-black font-mono tracking-tight ${part.pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {part.pnl_pct >= 0 ? '+' : ''}{part.pnl_pct.toFixed(2)}%
                    </span>
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">PnL Percent</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full border-t border-zinc-800/80 mt-5 pt-4 text-center text-xs font-bold text-zinc-400">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-semibold block uppercase tracking-wider">Win Rate</span>
                      <span className="font-mono text-zinc-200 mt-0.5 block">{part.win_rate}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 font-semibold block uppercase tracking-wider">Trades</span>
                      <span className="font-mono text-zinc-200 mt-0.5 block">{part.total_trades}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Metrics standings table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-left bg-zinc-950/15">
                  <th className="py-4 px-6 w-16 text-center">Rank</th>
                  <th className="py-4 px-4">Trader Account</th>
                  <th className="py-4 px-4 text-center">Country</th>
                  <th className="py-4 px-4 text-right">Starting Equity</th>
                  <th className="py-4 px-4 text-right">Current Equity</th>
                  <th className="py-4 px-4 text-right">PnL (%)</th>
                  <th className="py-4 px-4 text-right">Win Rate</th>
                  <th className="py-4 px-4 text-right">Trades</th>
                  <th className="py-4 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-805 font-medium text-xs">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500 font-bold">
                      No active participants matched criteria.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((part) => {
                    const isUser = part.user_id === currentUser.id;
                    const isDisq = part.status === 'disqualified';

                    let rankSymbol: React.ReactNode = part.rank;
                    if (part.rank === 1 && !isDisq) rankSymbol = '👑';
                    else if (part.rank === 2 && !isDisq) rankSymbol = '🥈';
                    else if (part.rank === 3 && !isDisq) rankSymbol = '🥉';

                    return (
                      <tr
                        key={part.id}
                        onClick={() => setInspectedPart(part)}
                        className={`hover:bg-zinc-850/20 cursor-pointer transition-colors duration-150 group ${
                          isUser ? 'bg-amber-500/[0.02] border-l-2 border-amber-500' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-center">
                          <span className="font-mono font-black text-zinc-300 group-hover:text-white transition-colors text-sm">
                            {rankSymbol}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300">
                              {part.user?.avatar || 'TR'}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                                {part.user?.name || 'Trader'}
                                {isUser && (
                                  <span className="text-[8px] bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black px-1.5 py-0.5 rounded leading-none">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-semibold text-zinc-500 font-mono uppercase tracking-wider">
                                MT5: #{part.account?.account_number || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="text-lg leading-none" title={part.user?.country}>
                            {getFlagEmoji(part.user?.country || 'US')}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right font-mono font-bold text-zinc-400">
                          ${part.starting_balance.toLocaleString()}
                        </td>

                        <td className="py-4 px-4 text-right font-mono font-black text-zinc-200">
                          ${part.current_equity.toLocaleString()}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <span className={`font-mono font-black text-sm ${part.pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {part.pnl_pct >= 0 ? '+' : ''}{part.pnl_pct.toFixed(2)}%
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right font-mono font-bold text-zinc-300">
                          {part.win_rate}%
                        </td>

                        <td className="py-4 px-4 text-right font-mono text-zinc-400 font-bold">
                          {part.total_trades}
                        </td>

                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                            isDisq
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {part.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Live Position Inspector Drawer */}
      {inspectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between animate-in zoom-in duration-200">
            {/* Title / Header */}
            <div className="p-6 border-b border-zinc-805 bg-zinc-950/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-amber-400 font-mono">
                  {inspectedPart.user?.avatar || 'TR'}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-100 flex items-center gap-1.5">
                    {inspectedPart.user?.name || 'Trader'}
                    <span className="text-base leading-none" title={inspectedPart.user?.country}>
                      {getFlagEmoji(inspectedPart.user?.country || 'US')}
                    </span>
                  </h3>
                  <span className="text-[9px] font-semibold text-zinc-500 font-mono">
                    MT5 Server: {inspectedPart.account?.broker_server || 'ICMarkets-Server'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectedPart(null)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-350 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 space-y-5 text-xs">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-black text-zinc-500">
                <span>Active Live Positions</span>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  ● Realtime Live Stream
                </span>
              </div>

              {/* Positions List */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-850 bg-zinc-950 text-[8px] font-black uppercase tracking-widest text-zinc-500">
                        <th className="py-2.5 px-3">Symbol</th>
                        <th className="py-2.5 px-2">Type</th>
                        <th className="py-2.5 px-2 text-right">Lots</th>
                        <th className="py-2.5 px-3 text-right">Profit ($)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 font-mono text-[10px] font-semibold text-zinc-300">
                      {trades.filter((t) => t.trader_account_id === inspectedPart.trader_account_id && t.status === 'open').length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-650 font-bold">
                            No open positions active.
                          </td>
                        </tr>
                      ) : (
                        trades
                          .filter((t) => t.trader_account_id === inspectedPart.trader_account_id && t.status === 'open')
                          .map((t) => (
                            <tr key={t.id} className="hover:bg-zinc-900/30">
                              <td className="py-2.5 px-3 font-bold text-zinc-200">{t.symbol}</td>
                              <td className="py-2.5 px-2">
                                <span className={t.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right">{t.lots.toFixed(2)}</td>
                              <td className={`py-2.5 px-3 text-right font-black ${t.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-[3px] text-[7px] font-black uppercase tracking-wider border border-amber-500/20">
                                  Live open
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* History Section */}
              <div className="text-[10px] uppercase tracking-wider font-black text-zinc-500 pt-2">
                Closed Trades History
              </div>

              <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-850 bg-zinc-950 text-[8px] font-black uppercase tracking-widest text-zinc-500">
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-2">Type</th>
                      <th className="py-2.5 px-2 text-right">Lots</th>
                      <th className="py-2.5 px-3 text-right">Closed PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-mono text-[10px] font-semibold text-zinc-400">
                    {trades.filter((t) => t.trader_account_id === inspectedPart.trader_account_id && t.status === 'closed').length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-650 font-bold">
                          No closed trades recorded.
                        </td>
                      </tr>
                    ) : (
                      trades
                        .filter((t) => t.trader_account_id === inspectedPart.trader_account_id && t.status === 'closed')
                        .map((t) => (
                          <tr key={t.id} className="hover:bg-zinc-900/30">
                            <td className="py-2 px-3 font-bold text-zinc-350">{t.symbol}</td>
                            <td className="py-2 px-2">
                              <span className={t.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                                {t.type}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right">{t.lots.toFixed(2)}</td>
                            <td className={`py-2 px-3 text-right font-bold ${t.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer button */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-950/20">
              <button
                onClick={() => setInspectedPart(null)}
                className="w-full py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-zinc-800 cursor-pointer"
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
