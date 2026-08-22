'use client';

import React, { useState } from 'react';
import { useApp, Competition, Participant } from '../context/AppContext';
import { Trophy, Award, Search, Globe, Clock } from '../components/Icons';
import Link from 'next/link';

// Convert country code to emoji flag
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

export default function UserDashboard() {
  const {
    currentUser,
    availableUsers,
    switchUser,
    competitions,
    participants,
    joinCompetition
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'joined'>('all');
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);

  // Form Join State
  const [accountNumber, setAccountNumber] = useState('');
  const [brokerServer, setBrokerServer] = useState('ICMarketsSC-Server');
  const [investorPassword, setInvestorPassword] = useState('');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Extract user's active registrations
  const userRegistrations = participants.filter((p) => p.user_id === currentUser.id);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsVerifying(true);

    try {
      const res = await joinCompetition(
        selectedComp.id,
        accountNumber,
        brokerServer,
        investorPassword
      );

      if (res.success) {
        setSuccessMsg(`✓ Successfully registered! Connected to MT5 Account #${accountNumber} successfully.`);
        setTimeout(() => {
          setSelectedComp(null);
          setAccountNumber('');
          setInvestorPassword('');
          setSuccessMsg('');
        }, 2200);
      } else {
        setErrorMsg(res.error || 'Connection failed. Please check credentials and server name.');
      }
    } catch {
      setErrorMsg('An unexpected error occurred during MT5 verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredCompetitions = competitions.filter((comp) => {
    const isJoined = userRegistrations.some((r) => r.competition_id === comp.id);
    if (activeTab === 'joined') return isJoined;
    return true; // Return all active/available
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
              Velocity FX <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/20">TRADER PORTAL</span>
            </h1>
            <span className="text-[10px] text-zinc-500 font-medium">Real-Money & Demo MT5 Competition Standings</span>
          </div>
        </div>

        {/* Profile Control Bar */}
        <div className="flex flex-wrap items-center gap-4 bg-zinc-950/40 p-2.5 border border-zinc-850 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-850 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400 font-mono">
              {currentUser.avatar}
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                {currentUser.name}
                <span className="text-sm leading-none" title={currentUser.country}>
                  {getFlagEmoji(currentUser.country)}
                </span>
              </div>
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                Role: {currentUser.role}
              </span>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-zinc-850"></div>

          {/* Tester user switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Switch:</span>
            <select
              value={currentUser.id}
              onChange={(e) => switchUser(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-[10px] text-zinc-200 font-bold focus:outline-none"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900 border border-zinc-800/80 p-3.5 rounded-2xl">
          <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-850 gap-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 outline-none ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                  : 'text-zinc-500 hover:text-zinc-300 bg-transparent'
              }`}
            >
              <Globe size={14} /> Browse Competitions
            </button>
            <button
              onClick={() => setActiveTab('joined')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 outline-none ${
                activeTab === 'joined'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                  : 'text-zinc-500 hover:text-zinc-300 bg-transparent'
              }`}
            >
              <Trophy size={14} /> My Registrations ({userRegistrations.length})
            </button>
          </div>

          {currentUser.role === 'admin' && (
            <Link
              href="/admin"
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-black tracking-wider uppercase bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-amber-400 hover:text-amber-300 transition-all flex items-center justify-center gap-2 text-center"
            >
              ⚡ Go to Admin Section
            </Link>
          )}
        </div>

        {/* Competitions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompetitions.length === 0 ? (
            <div className="col-span-full py-16 text-center text-zinc-500 bg-zinc-900 border border-zinc-850 rounded-3xl">
              <Trophy className="mx-auto text-zinc-600 mb-3" size={32} />
              <p className="text-sm font-bold text-zinc-400">No competitions found.</p>
              <p className="text-[10px] text-zinc-500 font-semibold mt-1">
                {activeTab === 'joined' ? "You haven't joined any active trading contests yet." : 'No active competitions exist.'}
              </p>
            </div>
          ) : (
            filteredCompetitions.map((comp) => {
              const reg = userRegistrations.find((r) => r.competition_id === comp.id);
              const isJoined = !!reg;
              const isDisqualified = reg?.status === 'disqualified';

              return (
                <div
                  key={comp.id}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-750 transition-all rounded-3xl p-6 flex flex-col justify-between shadow-xl space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-zinc-950 text-amber-400 border border-zinc-850 font-mono">
                        {comp.category}
                      </span>
                      <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-zinc-950 text-zinc-500 border border-zinc-850 font-mono">
                        Active
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-zinc-100 leading-tight">
                      {comp.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed line-clamp-3">
                      {comp.description || 'Retail MT5 contest. Connect read-only accounts and maintain drawdown rules to qualify for prizes.'}
                    </p>
                  </div>

                  {/* Rules limits */}
                  <div className="border-y border-zinc-800/80 py-4 grid grid-cols-2 gap-4 text-xs font-bold text-zinc-400">
                    <div className="space-y-0.5">
                      <span className="text-zinc-600 block uppercase tracking-wider text-[8px]">Min Equity Required</span>
                      <span className="text-zinc-200 font-mono font-black">${comp.min_equity.toLocaleString()}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-zinc-600 block uppercase tracking-wider text-[8px]">Max Drawdown Limit</span>
                      <span className="text-rose-400 font-mono font-black">{comp.max_drawdown}%</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div>
                    {isJoined ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
                          <span>Connection Standing:</span>
                          <span className={`uppercase font-black ${isDisqualified ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {reg.status}
                          </span>
                        </div>
                        
                        {isDisqualified && (
                          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl text-[9px] font-semibold leading-normal">
                            Reason: {reg.disqualification_reason || 'Drawdown breached.'}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Link
                            href={`/leaderboard/${comp.id}`}
                            className="flex-1 text-center py-2.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all"
                          >
                            Standings Leaderboard
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedComp(comp)}
                        className="w-full text-center py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all outline-none cursor-pointer"
                      >
                        Connect MT5 & Register
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MT5 Investor Credentials Verification Modal */}
      {selectedComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">MT5 Verification adapter</h2>
                <h3 className="text-sm font-extrabold text-zinc-200 mt-0.5">{selectedComp.title}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedComp(null);
                  setErrorMsg('');
                  setAccountNumber('');
                  setInvestorPassword('');
                }}
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-350 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Validation information alert */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3.5 space-y-1.5 text-[10px] text-zinc-400 font-semibold leading-relaxed">
              <span className="text-amber-400 font-black uppercase tracking-wider block">⚠️ Read-Only Verification Requirements:</span>
              <p>1. We utilize standard investor passwords (read-only access). Our system does not require execution/write permissions.</p>
              <p>2. Starting balance must meet or exceed <strong className="text-zinc-200 font-bold">${selectedComp.min_equity.toLocaleString()}</strong>.</p>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">MT5 Account Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5094102"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 font-bold font-mono focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">MT5 Broker Server Name</label>
                <select
                  value={brokerServer}
                  onChange={(e) => setBrokerServer(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 font-bold focus:outline-none"
                >
                  <option value="ICMarketsSC-Server">ICMarketsSC-Server</option>
                  <option value="Pepperstone-Demo">Pepperstone-Demo</option>
                  <option value="FTMO-Server">FTMO-Server</option>
                  <option value="XM-Global-Demo">XM-Global-Demo</option>
                  <option value="Darwinex-Live">Darwinex-Live</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Investor Password (Read-Only)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={investorPassword}
                  onChange={(e) => setInvestorPassword(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
                />
              </div>

              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-center text-[10px] font-bold leading-normal">
                  Error: {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-center text-[10px] font-black uppercase tracking-wider">
                  {successMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedComp(null);
                    setErrorMsg('');
                    setAccountNumber('');
                    setInvestorPassword('');
                  }}
                  className="flex-1 py-3 bg-zinc-850 hover:bg-zinc-800 rounded-xl font-bold border border-zinc-800 text-zinc-400 hover:text-zinc-300 transition-all outline-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !!successMsg}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-700/50 rounded-xl font-extrabold text-zinc-950 transition-all outline-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <span className="animate-spin text-xs">⏳</span> Verifying...
                    </>
                  ) : (
                    'Verify & Join'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
