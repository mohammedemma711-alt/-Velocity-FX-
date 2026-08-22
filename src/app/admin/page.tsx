'use client';

import React, { useState } from 'react';
import { useApp, Competition, Participant } from '../context/AppContext';
import { Trophy, Search, Award, User, RefreshCw, X } from '../components/Icons';

// Convert country code to emoji flag
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

export default function AdminPage() {
  const {
    currentUser,
    availableUsers,
    switchUser,
    competitions,
    participants,
    traderAccounts,
    trades,
    createCompetition,
    disqualifyParticipant
  } = useApp();

  const [activeTab, setActiveTab] = useState<'competitions' | 'auditor'>('competitions');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer Auditor State
  const [selectedPart, setSelectedPart] = useState<Participant | null>(null);
  const [disqReason, setDisqReason] = useState('');
  const [isDisqualifying, setIsDisqualifying] = useState(false);

  // New Competition Form State
  const [compTitle, setCompTitle] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compCategory, setCompCategory] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [compMinEquity, setCompMinEquity] = useState(10000);
  const [compMaxDrawdown, setCompMaxDrawdown] = useState(10.0);
  const [compMaxParts, setCompMaxParts] = useState(100);
  const [compStartTime, setCompStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 10);
    return d.toISOString().slice(0, 16);
  });
  const [compEndTime, setCompEndTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 16);
  });
  const [formSuccess, setFormSuccess] = useState(false);

  // Guard view for admin role
  if (currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-zinc-100 select-none">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6 text-center shadow-2xl">
          <div className="mx-auto h-16 w-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center text-2xl font-black">
            🔒
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black uppercase tracking-wider text-zinc-100">Access Denied</h1>
            <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
              The administrator section is restricted to accounts with the <code className="text-amber-400">admin</code> role. Your current role is <code className="text-zinc-400">{currentUser.role}</code>.
            </p>
          </div>
          <div className="border-t border-zinc-800/80 pt-5 space-y-4">
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black block">Switch Account to Test</span>
            <div className="flex flex-col gap-2">
              {availableUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between px-4 ${
                    u.role === 'admin'
                      ? 'bg-amber-500 text-zinc-950 border-amber-500 hover:bg-amber-600'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded leading-none">
                      {u.avatar}
                    </span>
                    {u.name}
                  </span>
                  <span className="uppercase text-[9px] font-black">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createCompetition({
      title: compTitle,
      description: compDesc,
      category: compCategory,
      min_equity: compMinEquity,
      max_drawdown: compMaxDrawdown,
      max_participants: compMaxParts,
      start_time: new Date(compStartTime).toISOString(),
      end_time: new Date(compEndTime).toISOString()
    });

    if (success) {
      setCompTitle('');
      setCompDesc('');
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 3000);
    }
  };

  const handleDisqualifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !disqReason.trim()) return;

    setIsDisqualifying(true);
    const success = await disqualifyParticipant(
      selectedPart.competition_id,
      selectedPart.trader_account_id,
      disqReason
    );

    if (success) {
      // Reload details with updated state
      const updatedPart = participants.find(p => p.id === selectedPart.id);
      setSelectedPart(updatedPart || null);
      setDisqReason('');
    }
    setIsDisqualifying(false);
  };

  // Filtered inspector rows
  const filteredParticipants = participants.filter((p) => {
    const uName = p.user?.name || '';
    const accNum = p.account?.account_number || '';
    const broker = p.account?.broker_server || '';
    const query = searchQuery.toLowerCase();

    return (
      uName.toLowerCase().includes(query) ||
      accNum.toLowerCase().includes(query) ||
      broker.toLowerCase().includes(query)
    );
  });

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
              Velocity FX <span className="text-[10px] bg-amber-500 text-zinc-950 font-black px-1.5 py-0.5 rounded">ADMIN PORTAL</span>
            </h1>
            <span className="text-[10px] text-zinc-500 font-medium">MT5 Accounts & Competition Rules Manager</span>
          </div>
        </div>

        {/* Identity selector in Admin */}
        <div className="flex items-center gap-4 bg-zinc-950/60 p-2 border border-zinc-850 rounded-2xl">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider pl-2">Testing User:</span>
          <select
            value={currentUser.id}
            onChange={(e) => switchUser(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-200 font-bold focus:outline-none"
          >
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex bg-zinc-900 border border-zinc-800/80 p-1.5 rounded-2xl w-fit gap-1">
          <button
            onClick={() => setActiveTab('competitions')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 outline-none ${
              activeTab === 'competitions'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Trophy size={14} /> Competition Setup
          </button>
          <button
            onClick={() => setActiveTab('auditor')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 outline-none ${
              activeTab === 'auditor'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User size={14} /> Trader MT5 Inspector
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'competitions' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rules Engine Form */}
            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">Rules Engine Setup</h2>
                <p className="text-[10px] text-zinc-500 font-semibold mt-1">Configure competition limits and eligibility parameters.</p>
              </div>

              <form onSubmit={handleCreateCompetition} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Competition Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. September Gold Scalpers"
                    value={compTitle}
                    onChange={(e) => setCompTitle(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Contest description, leverage, or constraints..."
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">League Type</label>
                    <select
                      value={compCategory}
                      onChange={(e) => setCompCategory(e.target.value as any)}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 font-bold focus:outline-none"
                    >
                      <option value="daily">Daily League</option>
                      <option value="monthly">Monthly League</option>
                      <option value="yearly">Yearly League</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Max Participants</label>
                    <input
                      type="number"
                      required
                      min={5}
                      max={1000}
                      value={compMaxParts}
                      onChange={(e) => setCompMaxParts(Number(e.target.value))}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Min Equity ($)</label>
                    <input
                      type="number"
                      required
                      min={500}
                      value={compMinEquity}
                      onChange={(e) => setCompMinEquity(Number(e.target.value))}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Max Drawdown (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min={1}
                      max={50}
                      value={compMaxDrawdown}
                      onChange={(e) => setCompMaxDrawdown(Number(e.target.value))}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Start Date/Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={compStartTime}
                      onChange={(e) => setCompStartTime(e.target.value)}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-2 py-2 text-zinc-200 font-bold focus:outline-none focus:border-zinc-700 font-mono text-[10px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">End Date/Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={compEndTime}
                      onChange={(e) => setCompEndTime(e.target.value)}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-2 py-2 text-zinc-200 font-bold focus:outline-none focus:border-zinc-700 font-mono text-[10px]"
                    />
                  </div>
                </div>

                {formSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-xl text-center text-[10px] font-black uppercase tracking-wider">
                    ✓ Competition Created Successfully
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-xl font-extrabold uppercase tracking-wider transition-colors outline-none cursor-pointer"
                >
                  Create Competition
                </button>
              </form>
            </div>

            {/* List of active/created competitions */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Created Competitions ({competitions.length})</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {competitions.map((comp) => {
                  const partsCount = participants.filter((p) => p.competition_id === comp.id).length;

                  return (
                    <div
                      key={comp.id}
                      className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-750 transition-colors shadow-lg"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-750">
                            {comp.category}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-bold font-mono">
                            {partsCount} / {comp.max_participants} joined
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-100 leading-tight">{comp.title}</h4>
                        {comp.description && (
                          <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed line-clamp-2">
                            {comp.description}
                          </p>
                        )}
                      </div>

                      <div className="border-t border-zinc-800/60 mt-4 pt-3 grid grid-cols-2 gap-3 text-[10px] font-bold text-zinc-400">
                        <div>
                          <span className="text-zinc-600 block uppercase tracking-wider text-[8px]">Min Equity</span>
                          <span className="font-mono text-zinc-300">${comp.min_equity.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 block uppercase tracking-wider text-[8px]">Max Drawdown</span>
                          <span className="font-mono text-zinc-300">{comp.max_drawdown}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Trader Inspector Table */
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Search by user or MT5 account..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-all font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-left bg-zinc-950/10">
                    <th className="py-4 px-6">Trader</th>
                    <th className="py-4 px-4 text-center">Country</th>
                    <th className="py-4 px-4">MT5 Credentials</th>
                    <th className="py-4 px-4 text-right">Current Equity</th>
                    <th className="py-4 px-4 text-right">PnL (%)</th>
                    <th className="py-4 px-4 text-right">Max Drawdown</th>
                    <th className="py-4 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium text-xs">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        No registered trader accounts found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((part) => {
                      const acc = traderAccounts.find(a => a.id === part.trader_account_id);
                      const isDisq = part.status === 'disqualified';

                      return (
                        <tr
                          key={part.id}
                          onClick={() => setSelectedPart(part)}
                          className="hover:bg-zinc-850/30 cursor-pointer transition-colors duration-150"
                        >
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300">
                                {part.user?.avatar || 'TR'}
                              </div>
                              <div>
                                <div className="font-bold text-zinc-200">{part.user?.name || 'Trader'}</div>
                                <span className="text-[9px] text-zinc-500 font-semibold">{part.user_id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="text-base leading-none" title={part.user?.country}>
                              {getFlagEmoji(part.user?.country || 'US')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-zinc-300">#{part.account?.account_number || 'N/A'}</div>
                            <div className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
                              {part.account?.broker_server || 'Broker'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-300">
                            ${(acc?.current_equity || part.current_equity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className={`font-mono font-black ${part.pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {part.pnl_pct >= 0 ? '+' : ''}{part.pnl_pct.toFixed(2)}%
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-zinc-400 font-bold">
                            {acc?.max_recorded_drawdown || 0}%
                          </td>

                          <td className="py-3.5 px-6 text-center">
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
        )}
      </main>

      {/* Deep Audit Inspector Drawer / Modal */}
      {selectedPart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-900 border-l border-zinc-800 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header info */}
            <div className="p-6 border-b border-zinc-805 bg-zinc-950/20 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Trader Deep Audit Inspector</h3>
                <button
                  onClick={() => {
                    setSelectedPart(null);
                    setDisqReason('');
                  }}
                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-350 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg font-black text-amber-400 font-mono">
                  {selectedPart.user?.avatar || 'TR'}
                </div>
                <div>
                  <h4 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    {selectedPart.user?.name || 'Trader'}
                    <span className="text-lg leading-none" title={selectedPart.user?.country}>
                      {getFlagEmoji(selectedPart.user?.country || 'US')}
                    </span>
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-semibold">{selectedPart.user_id}</p>
                </div>
              </div>
            </div>

            {/* Audit metrics and Trade Log */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Credentials / Broker Info */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">MT5 Broker Credentials</h4>
                <div className="grid grid-cols-2 gap-3 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl font-mono">
                  <div>
                    <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-bold">Broker Server</span>
                    <span className="text-zinc-300 text-xs font-bold leading-relaxed">{selectedPart.account?.broker_server || 'ICMarketsSC-Server'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-bold">MT5 Account Number</span>
                    <span className="text-zinc-300 text-xs font-bold leading-relaxed">#{selectedPart.account?.account_number || '881024'}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-zinc-900">
                    <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-bold">Connection Platform</span>
                    <span className="text-zinc-300 text-xs font-bold">MetaTrader 5 (MT5 Read-Only Investor Password)</span>
                  </div>
                </div>
              </div>

              {/* Live account state */}
              {(() => {
                const acc = traderAccounts.find(a => a.id === selectedPart.trader_account_id);
                return (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Account State</h4>
                    <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl font-mono">
                      <div>
                        <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-bold">Starting Equity</span>
                        <span className="text-zinc-300 font-bold">${selectedPart.starting_balance.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-bold">Current Equity</span>
                        <span className="text-zinc-200 font-black">${acc?.current_equity.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-bold">Floating PnL</span>
                        <span className={`font-black ${acc && acc.floating_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {acc && acc.floating_pnl >= 0 ? '+' : ''}${acc?.floating_pnl.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-bold">Max Drawdown</span>
                        <span className="text-rose-400 font-black">{acc?.max_recorded_drawdown}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Real-time trade log */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Trade log (MT5 Stream)</h4>
                
                <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-zinc-850 bg-zinc-950/50 text-[8px] font-black uppercase tracking-widest text-zinc-500">
                          <th className="py-2.5 px-3">Symbol</th>
                          <th className="py-2.5 px-2">Type</th>
                          <th className="py-2.5 px-2 text-right">Lots</th>
                          <th className="py-2.5 px-3 text-right">Profit ($)</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 font-mono text-[10px] font-semibold text-zinc-300">
                        {trades.filter(t => t.trader_account_id === selectedPart.trader_account_id).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-zinc-600">
                              No synced trade records.
                            </td>
                          </tr>
                        ) : (
                          trades
                            .filter(t => t.trader_account_id === selectedPart.trader_account_id)
                            .map((t) => (
                              <tr key={t.id} className="hover:bg-zinc-900/30">
                                <td className="py-2 px-3 font-bold text-zinc-200">{t.symbol}</td>
                                <td className="py-2 px-2">
                                  <span className={t.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-right">{t.lots.toFixed(2)}</td>
                                <td className={`py-2 px-3 text-right font-bold ${t.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-1.5 py-0.5 rounded-[3px] text-[7px] font-black uppercase tracking-wider ${
                                    t.status === 'open'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : 'bg-zinc-800 text-zinc-500'
                                  }`}>
                                    {t.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Disqualification Override actions */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-950/20 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Disqualification Override</h4>
              
              {selectedPart.status === 'disqualified' ? (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl">
                  <span className="text-[9px] font-black uppercase tracking-wider block text-rose-500">PARTICIPANT DISQUALIFIED</span>
                  <p className="mt-1 text-xs leading-relaxed font-semibold">
                    Reason: {selectedPart.disqualification_reason || 'Rules infraction / Drawdown breach limit exceeded.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDisqualifySubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-zinc-600 block uppercase tracking-wider text-[8px] font-bold">Manual Disqualification Reason</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ineligible Account Balance, Hedging violations, etc."
                      value={disqReason}
                      onChange={(e) => setDisqReason(e.target.value)}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isDisqualifying}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800/50 text-white font-extrabold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                  >
                    {isDisqualifying ? 'Executing...' : 'Disqualify Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
