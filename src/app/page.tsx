'use client';

import React, { useState } from 'react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import { Leaderboard } from './components/Leaderboard';
import { TradingTerminal } from './components/TradingTerminal';
import { MarketWatch } from './components/MarketWatch';
import { Trophy, Edit, User, RefreshCw, Sparkles } from './components/Icons';

// Convert country code to emoji flag
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

function DashboardContent() {
  const { userTrader, resetAccount, updateUserProfile } = useSimulation();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'simulator'>('leaderboard');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Profile Editor Form State
  const [profileName, setProfileName] = useState(userTrader.name);
  const [profileAvatar, setProfileAvatar] = useState(userTrader.avatar);
  const [profileCountry, setProfileCountry] = useState(userTrader.country);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(profileName, profileAvatar, profileCountry);
    setIsEditingProfile(false);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your simulated account balance and trade history to default values?')) {
      resetAccount();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 font-sans text-zinc-100 select-none">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/80 px-4 md:px-8 py-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <span className="text-zinc-950 font-black text-base tracking-tighter">⚡</span>
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider uppercase text-zinc-100 flex items-center gap-1.5 leading-none">
              Velocity FX <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/20">SIMULATOR</span>
            </h1>
            <span className="text-[10px] text-zinc-500 font-medium">Real-time Trader Competition Leaderboard</span>
          </div>
        </div>

        {/* User Account Quick Stats Header bar */}
        <div className="flex flex-wrap items-center gap-6 text-xs md:text-sm bg-zinc-950/40 p-2.5 border border-zinc-800/60 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-850 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400 font-mono">
              {userTrader.avatar}
            </div>
            <div>
              <div className="font-bold flex items-center gap-1">
                {userTrader.name}
                <span className="text-sm leading-none" title={userTrader.country}>
                  {getFlagEmoji(userTrader.country)}
                </span>
              </div>
              <button 
                onClick={() => {
                  setProfileName(userTrader.name);
                  setProfileAvatar(userTrader.avatar);
                  setProfileCountry(userTrader.country);
                  setIsEditingProfile(true);
                }}
                className="text-[10px] text-amber-400 font-bold hover:text-amber-300 flex items-center gap-0.5 mt-0.5 transition-colors"
              >
                <Edit size={10} /> Edit Trader Profile
              </button>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-zinc-800 hidden sm:block"></div>

          <div className="flex gap-4 font-semibold">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider leading-none">Global Rank</span>
              <span className="text-sm font-black font-mono text-zinc-200 mt-0.5 block">#{userTrader.rank}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider leading-none">ROI</span>
              <span className={`text-sm font-black font-mono mt-0.5 block ${userTrader.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {userTrader.roi >= 0 ? '+' : ''}{userTrader.roi.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider leading-none">Sim Equity</span>
              <span className="text-sm font-black font-mono text-zinc-200 mt-0.5 block">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(userTrader.equity)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900 border border-zinc-800/80 p-3.5 rounded-2xl">
          <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/80 gap-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 outline-none ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                  : 'text-zinc-500 hover:text-zinc-350 bg-transparent'
              }`}
            >
              <Trophy size={14} /> Competition Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 outline-none ${
                activeTab === 'simulator'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                  : 'text-zinc-500 hover:text-zinc-350 bg-transparent'
              }`}
            >
              <Sparkles size={14} /> Trading Simulator
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-center gap-2 outline-none"
            >
              <RefreshCw size={12} /> Reset Portfolio
            </button>
          </div>
        </div>

        {/* Active Tab rendering */}
        {activeTab === 'leaderboard' ? (
          <Leaderboard />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Terminal Main Grid */}
            <div className="lg:col-span-3">
              <TradingTerminal />
            </div>
            {/* Live Watchlist Sidebar */}
            <div className="lg:col-span-1">
              <MarketWatch />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 py-6 px-4 text-center text-[10px] font-semibold text-zinc-600 space-y-1 bg-zinc-950/60">
        <p>Copyright © {new Date().getFullYear()} Velocity FX Trader Contests. All rights reserved.</p>
        <p className="max-w-xl mx-auto leading-relaxed text-zinc-700">
          Disclaimer: This application is a 100% simulated paper-trading platform. All prices, rates, yields, and orders shown represent virtual simulations and mock liquidity. No real currency trades are executed, and no financial risk is assumed.
        </p>
      </footer>

      {/* Profile Edit Overlay Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">Edit Profile</h2>
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-350 transition-all"
              >
                <User size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Trader Name</label>
                <input
                  type="text"
                  maxLength={25}
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Avatar Initials (Max 2 chars)</label>
                <input
                  type="text"
                  maxLength={2}
                  required
                  value={profileAvatar}
                  onChange={(e) => setProfileAvatar(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 font-bold font-mono focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Country Location</label>
                <select
                  value={profileCountry}
                  onChange={(e) => setProfileCountry(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 font-bold focus:outline-none focus:border-zinc-700"
                >
                  <option value="US">🇺🇸 United States (US)</option>
                  <option value="GB">🇬🇧 United Kingdom (GB)</option>
                  <option value="JP">🇯🇵 Japan (JP)</option>
                  <option value="DE">🇩🇪 Germany (DE)</option>
                  <option value="FR">🇫🇷 France (FR)</option>
                  <option value="BR">🇧🇷 Brazil (BR)</option>
                  <option value="CA">🇨🇦 Canada (CA)</option>
                  <option value="AU">🇦🇺 Australia (AU)</option>
                  <option value="SG">🇸🇬 Singapore (SG)</option>
                  <option value="ZA">🇿🇦 South Africa (ZA)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-2.5 bg-zinc-850 hover:bg-zinc-800 rounded-xl font-bold border border-zinc-800 text-zinc-400 hover:text-zinc-300 transition-all outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl font-bold text-zinc-950 transition-all outline-none"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <SimulationProvider>
      <DashboardContent />
    </SimulationProvider>
  );
}
