'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { Navbar } from '../components/Navbar';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  const { signIn, signUp, user, session } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (session || user) {
      router.push('/dashboard');
    }
  }, [session, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        const res = await signUp(email, password, fullName);
        if (res.success) {
          setSuccessMsg('✓ Account created successfully! Redirecting to dashboard...');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        } else {
          setErrorMsg(res.error || 'Failed to sign up. Please try again.');
        }
      } else {
        const res = await signIn(email, password);
        if (res.success) {
          setSuccessMsg('✓ Authenticated! Redirecting to dashboard...');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1200);
        } else {
          setErrorMsg(res.error || 'Invalid credentials. Please check your email and password.');
        }
      }
    } catch {
      setErrorMsg('An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 select-none relative overflow-hidden font-sans">
      <Navbar currentRoute="login" />

      {/* Radial glow background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[60vw] w-[60vw] max-w-[600px] max-h-[600px] bg-amber-500/[0.04] rounded-full filter blur-[140px] pointer-events-none"></div>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative z-10">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10">
              <span className="text-zinc-950 font-black text-xl">⚡</span>
            </div>
            <h1 className="text-xl font-black uppercase tracking-wider text-zinc-100">
              {mode === 'signup' ? 'Create Trader Account' : 'Welcome Back'}
            </h1>
            <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
              {mode === 'signup'
                ? 'Register with your email to track MT5 contest standings.'
                : 'Sign in to access your connected MT5 accounts and rankings.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Email Address</label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
              />
            </div>

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-zinc-500 block uppercase tracking-wider text-[9px]">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-zinc-700"
                />
              </div>
            )}

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
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-700/50 text-zinc-950 font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/10 outline-none cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-xs">⏳</span> Authenticating...
                </>
              ) : mode === 'signup' ? (
                'Create Account & Sign In'
              ) : (
                'Sign In to Velocity FX'
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="text-center pt-2 text-[10px] text-zinc-500 font-semibold">
            {mode === 'signup' ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-amber-400 hover:underline font-bold"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-amber-400 hover:underline font-bold"
                >
                  Create One
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-900 py-4 px-4 text-center text-[10px] font-semibold text-zinc-600 bg-zinc-950/60">
        Velocity FX Authentication System • Supabase Auth Protocol
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="animate-spin text-2xl">⏳</span>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Loading Auth Portal...</span>
        </div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
