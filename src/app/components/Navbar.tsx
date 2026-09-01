'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';

// Convert country code to emoji flag
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

interface NavbarProps {
  currentRoute?: 'home' | 'dashboard' | 'admin' | 'leaderboard' | 'login';
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute }) => {
  const {
    currentUser,
    availableUsers,
    switchUser,
    session,
    user,
    signOut
  } = useApp();

  const isLoggedIn = !!(session || user || (currentUser && currentUser.id !== 'unauthenticated'));

  return (
    <header className="sticky top-0 z-40 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/80 px-4 md:px-8 py-3.5 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-md select-none">
      {/* Brand & Main Nav Links */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform">
            <span className="text-zinc-950 font-black text-base tracking-tighter">⚡</span>
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider uppercase text-zinc-100 flex items-center gap-1.5 leading-none">
              Velocity FX
            </h1>
            <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest block">MT5 Competition Platform</span>
          </div>
        </Link>

        {/* Desktop Quick Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-850 text-xs font-extrabold uppercase tracking-wider">
          <Link
            href="/dashboard"
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              currentRoute === 'dashboard'
                ? 'bg-amber-500 text-zinc-950 font-black shadow'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'
            }`}
          >
            Dashboard
          </Link>

          {currentUser.role === 'admin' && (
            <Link
              href="/admin"
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                currentRoute === 'admin'
                  ? 'bg-rose-500 text-zinc-950 font-black shadow'
                  : 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-850'
              }`}
            >
              Admin Portal
            </Link>
          )}
        </nav>
      </div>

      {/* Auth & Identity Control Panel */}
      <div className="flex flex-wrap items-center gap-3">
        {isLoggedIn ? (
          <div className="flex items-center gap-3 bg-zinc-950/70 p-2 border border-zinc-800 rounded-2xl shadow-inner">
            {/* User Avatar & Details */}
            <div className="flex items-center gap-2.5 px-1">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400 font-mono">
                {currentUser.avatar}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold flex items-center gap-1.5 text-zinc-100">
                  {currentUser.name}
                  <span className="text-sm leading-none" title={currentUser.country}>
                    {getFlagEmoji(currentUser.country)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] px-1 py-0.2 bg-zinc-850 text-zinc-400 font-black uppercase tracking-wider rounded">
                    {currentUser.role}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-medium truncate max-w-[120px]">
                    {currentUser.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-zinc-800"></div>

            {/* Quick identity switcher for demo mode testing */}
            <div className="hidden lg:flex items-center gap-1.5">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Test As:</span>
              <select
                value={currentUser.id}
                onChange={(e) => switchUser(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 font-bold focus:outline-none focus:border-zinc-700 cursor-pointer"
              >
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => signOut()}
              className="px-3 py-1.5 bg-zinc-850 hover:bg-rose-500/20 border border-zinc-800 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all outline-none cursor-pointer"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Log In
            </Link>
            <Link
              href="/login?mode=signup"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/10"
            >
              Sign Up
            </Link>
            <Link
              href="/admin/login"
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              🔒 Admin Login
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
