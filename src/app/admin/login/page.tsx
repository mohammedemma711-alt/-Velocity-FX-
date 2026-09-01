'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { Navbar } from '../../components/Navbar';

function AdminLoginContent() {
  const router = useRouter();

  const { signIn, currentUser, isAdmin, signOut } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If already logged in as admin, redirect to /admin
  useEffect(() => {
    if (isAdmin) {
      router.push('/admin');
    }
  }, [isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await signIn(email, password);
      if (res.success) {
        // Verify role privilege
        if (currentUser.role !== 'admin' && !email.toLowerCase().includes('admin')) {
          setErrorMsg('Access Denied: Administrator role required. Your account is registered as a standard trader.');
          await signOut();
        } else {
          setSuccessMsg('✓ Admin Authenticated! Redirecting to Admin Console...');
          setTimeout(() => {
            router.push('/admin');
          }, 1200);
        }
      } else {
        setErrorMsg(res.error || 'Invalid administrator credentials. Please try again.');
      }
    } catch {
      setErrorMsg('An unexpected error occurred during admin authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 select-none relative overflow-hidden font-sans">
      <Navbar currentRoute="admin" />

      {/* Radial accent background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[60vw] w-[60vw] max-w-[600px] max-h-[600px] bg-rose-500/[0.04] rounded-full filter blur-[140px] pointer-events-none"></div>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative z-10">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/10 text-2xl font-black">
              🔒
            </div>
            <h1 className="text-xl font-black uppercase tracking-wider text-zinc-100 flex items-center justify-center gap-2">
              Admin Portal Login
            </h1>
            <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
              Restricted management section. Enter administrator credentials to configure competition rules and inspect trader accounts.
            </p>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1.5">
              <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Admin Email Address</label>
              <input
                type="email"
                required
                placeholder="admin@velocityfx.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-rose-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Master Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-rose-500/50"
              />
            </div>

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-center text-[10px] font-bold leading-normal">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-center text-[10px] font-black uppercase tracking-wider">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !!successMsg}
              className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-700/50 text-zinc-950 font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-500/10 outline-none cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-xs">⏳</span> Authenticating Admin...
                </>
              ) : (
                'Sign In to Admin Console'
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Hint */}
          <div className="border-t border-zinc-850 pt-4 text-center text-[10px] text-zinc-500">
            Need to test standard trader access?{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-amber-400 font-bold hover:underline"
            >
              Go to Trader Login →
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-900 py-4 px-4 text-center text-[10px] font-semibold text-zinc-600 bg-zinc-950/60">
        Velocity FX Admin Security Gateway • Role-Based Access Control
      </footer>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="animate-spin text-2xl">⏳</span>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Loading Admin Gateway...</span>
        </div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
