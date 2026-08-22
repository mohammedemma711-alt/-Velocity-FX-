'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from './context/AppContext';
import { Trophy, Award, Sparkles, User, Globe } from './components/Icons';

export default function HomePortal() {
  const { currentUser, competitions, participants } = useApp();

  // Find active monthly contest for quick link
  const mainComp = competitions.find(c => c.category === 'monthly') || competitions[0];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 select-none relative overflow-hidden font-sans">
      {/* Background radial accent glow */}
      <div className="absolute top-[-20%] left-[-20%] h-[70vw] w-[70vw] bg-amber-500/[0.03] rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] h-[70vw] w-[70vw] bg-emerald-500/[0.02] rounded-full filter blur-[120px] pointer-events-none"></div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-zinc-900/60 backdrop-blur-md border-b border-zinc-900 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <span className="text-zinc-950 font-black text-sm">⚡</span>
          </div>
          <span className="text-sm font-black tracking-wider uppercase text-zinc-100">
            Velocity FX
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
            Active: {currentUser.name}
          </span>
          <div className="h-4 w-[1px] bg-zinc-800"></div>
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
          >
            Open App
          </Link>
        </div>
      </header>

      {/* Hero Body */}
      <main className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto px-6 py-12 md:py-20 space-y-12">
        {/* Title details */}
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-full">
            <Sparkles size={10} /> MT5 Retail Competition Platform
          </span>
          
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-zinc-100 max-w-2xl mx-auto leading-none">
            Prove Your Edge, <br />
            <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              Own the Standings.
            </span>
          </h1>

          <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed font-semibold">
            Connect live or demo MetaTrader 5 (MT5) accounts via read-only investor passwords. Maintain risk metrics, manage drawdowns, and compete in transparent leaderboard rankings.
          </p>
        </div>

        {/* Core Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Dashboard */}
          <Link
            href="/dashboard"
            className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 p-6 rounded-3xl transition-all hover:scale-[1.02] flex flex-col justify-between space-y-6 shadow-xl"
          >
            <div className="space-y-2">
              <div className="h-10 w-10 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center text-lg font-bold group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all">
                <Globe size={18} />
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">Trader Dashboard</h3>
              <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                Browse upcoming contests, submit MT5 read-only investor credentials, and track your registration eligibility status.
              </p>
            </div>
            <span className="text-[10px] text-amber-400 group-hover:text-amber-300 font-black uppercase tracking-wider flex items-center gap-1">
              Join Contest →
            </span>
          </Link>

          {/* Card 2: Live Standing */}
          <Link
            href={mainComp ? `/leaderboard/${mainComp.id}` : '/dashboard'}
            className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 p-6 rounded-3xl transition-all hover:scale-[1.02] flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-2 bg-emerald-500/30 w-full animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center text-lg font-bold group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-all">
                <Trophy size={18} />
              </div>
              <h3 className="text-base font-extrabold text-zinc-100 flex items-center gap-1.5">
                Live Standings 
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider animate-pulse leading-none border border-emerald-500/20">
                  Live
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                Watch WebSocket Standings update in real-time. Inspect other participants' live open positions synced directly from MT5 streams.
              </p>
            </div>
            <span className="text-[10px] text-emerald-400 group-hover:text-emerald-300 font-black uppercase tracking-wider flex items-center gap-1">
              View Standings →
            </span>
          </Link>

          {/* Card 3: Admin Console */}
          <Link
            href="/admin"
            className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 p-6 rounded-3xl transition-all hover:scale-[1.02] flex flex-col justify-between space-y-6 shadow-xl"
          >
            <div className="space-y-2">
              <div className="h-10 w-10 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center text-lg font-bold group-hover:bg-rose-500 group-hover:text-zinc-950 transition-all">
                <User size={18} />
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">Admin Control</h3>
              <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                Define drawdown constraints, launch leagues (Daily, Monthly, Yearly), audit broker account credentials, or trigger manual disqualifications.
              </p>
            </div>
            <span className="text-[10px] text-rose-400 group-hover:text-rose-350 font-black uppercase tracking-wider flex items-center gap-1">
              Configure Rules →
            </span>
          </Link>
        </div>

        {/* Small platform stats */}
        <div className="grid grid-cols-3 gap-4 bg-zinc-900/40 p-4 border border-zinc-900 rounded-2xl text-center text-xs font-bold text-zinc-400 font-mono">
          <div>
            <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-black">Active Contests</span>
            <span className="text-zinc-200">{competitions.length} Available</span>
          </div>
          <div className="border-x border-zinc-900">
            <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-black">Total Regs</span>
            <span className="text-zinc-200">{participants.length} Accounts</span>
          </div>
          <div>
            <span className="text-zinc-600 block uppercase tracking-wider text-[8px] font-black">Sync Protocol</span>
            <span className="text-emerald-400">MetaApi MT5</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 px-4 text-center text-[10px] font-semibold text-zinc-600 space-y-1 bg-zinc-950/60">
        <p>Copyright © {new Date().getFullYear()} Velocity FX Trader Contests. All rights reserved.</p>
        <p className="max-w-xl mx-auto leading-relaxed text-zinc-700">
          Disclaimer: All trader synchronization utilizes read-only connection profiles. No funds are handled, transacted, or risked in this process. MetaTrader 5 is a registered trademark of MetaQuotes Ltd.
        </p>
      </footer>
    </div>
  );
}
