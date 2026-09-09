'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { MetaApiAdapter } from '../lib/metaApiAdapter';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar: string;
  country: string;
  status: 'active' | 'suspended';
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  min_equity: number;
  max_drawdown: number;
  max_participants: number;
  category: 'daily' | 'monthly' | 'yearly';
  status: 'upcoming' | 'active' | 'completed';
  created_at?: string;
}

export interface TraderAccount {
  id: string;
  user_id: string;
  account_number: string;
  broker_server: string;
  investor_password?: string;
  platform: string;
  initial_equity: number;
  current_equity: number;
  floating_pnl: number;
  max_recorded_drawdown: number;
  status: 'active' | 'disqualified';
  disqualification_reason?: string;
  created_at?: string;
}

export interface Participant {
  id: string;
  competition_id: string;
  trader_account_id: string;
  user_id: string;
  starting_balance: number;
  current_equity: number;
  pnl_pct: number;
  win_rate: number;
  total_trades: number;
  status: 'active' | 'disqualified';
  disqualification_reason?: string;
  joined_at?: string;
  // Joined fields for display
  user?: {
    id?: string;
    name: string;
    avatar: string;
    country: string;
    email?: string;
  };
  account?: {
    id?: string;
    account_number: string;
    broker_server: string;
    current_equity?: number;
    floating_pnl?: number;
    max_recorded_drawdown?: number;
    initial_equity?: number;
    status?: string;
  };
}

export interface DbTrade {
  id: string;
  trader_account_id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  open_price: number;
  close_price?: number;
  open_time: string;
  close_time?: string;
  profit: number;
  pips: number;
  status: 'open' | 'closed' | 'pending';
}

export interface AuthResult {
  success: boolean;
  error?: string;
  role?: 'admin' | 'user';
  requiresEmailConfirmation?: boolean;
}

interface AppContextType {
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  switchUser: (userId: string) => void;
  competitions: Competition[];
  participants: Participant[];
  traderAccounts: TraderAccount[];
  trades: DbTrade[];
  createCompetition: (competition: Omit<Competition, 'id' | 'status'>) => Promise<boolean>;
  joinCompetition: (
    competitionId: string,
    accountNumber: string,
    brokerServer: string,
    investorPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  disqualifyParticipant: (
    competitionId: string,
    accountId: string,
    reason: string
  ) => Promise<boolean>;
  syncAccount: (
    accountId: string,
    accountNumber: string,
    brokerServer: string
  ) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  // Supabase Auth extensions
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SEED_USERS: UserProfile[] = [
  { id: 'daniel-trader', name: 'Daniel', email: 'daniel@retail.com', role: 'user', avatar: 'DA', country: 'CA', status: 'active' },
  { id: 'admin-user', name: 'Admin (System)', email: 'admin@velocityfx.com', role: 'admin', avatar: 'AD', country: 'US', status: 'active' },
  { id: 'alice-trader', name: 'Alice Scalper', email: 'alice@retail.com', role: 'user', avatar: 'AL', country: 'GB', status: 'active' },
  { id: 'bob-swing', name: 'Bob Swing', email: 'bob@retail.com', role: 'user', avatar: 'BO', country: 'DE', status: 'active' },
  { id: 'charlie-gold', name: 'Charlie Gold', email: 'charlie@retail.com', role: 'user', avatar: 'CH', country: 'JP', status: 'active' }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(SEED_USERS[0]); // Default to daniel-trader
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [traderAccounts, setTraderAccounts] = useState<TraderAccount[]>([]);
  const [trades, setTrades] = useState<DbTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const isSupabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleAuthUserSync = useCallback(async (authUser: User): Promise<UserProfile> => {
    const metaName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Trader';
    const avatar = metaName.slice(0, 2).toUpperCase();
    let role = (authUser.email?.toLowerCase().includes('admin') ? 'admin' : 'user') as 'admin' | 'user';

    if (isSupabaseConfigured) {
      try {
        const { data: dbUser } = await supabase.from('users').select('role, country, status, name, avatar').eq('id', authUser.id).maybeSingle();
        if (dbUser?.role) {
          role = dbUser.role as 'admin' | 'user';
        }
      } catch (e) {
        console.warn('Error fetching role from public.users', e);
      }
    }

    const profile: UserProfile = {
      id: authUser.id,
      name: metaName,
      email: authUser.email || '',
      role,
      avatar,
      country: 'US',
      status: 'active'
    };

    setCurrentUser(profile);

    if (isSupabaseConfigured) {
      await supabase.from('users').upsert({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatar: profile.avatar,
        country: profile.country,
        status: profile.status
      });
    }

    return profile;
  }, [isSupabaseConfigured]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        if (typeof document !== 'undefined') {
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
          const role = session.user.email?.toLowerCase().includes('admin') ? 'admin' : 'user';
          document.cookie = `sb-user-role=${role}; path=/; max-age=604800; SameSite=Lax`;
        }
        await handleAuthUserSync(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (typeof document !== 'undefined') {
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
          const role = session.user.email?.toLowerCase().includes('admin') ? 'admin' : 'user';
          document.cookie = `sb-user-role=${role}; path=/; max-age=604800; SameSite=Lax`;
        }
        await handleAuthUserSync(session.user);
      } else if (event === 'SIGNED_OUT') {
        if (typeof document !== 'undefined') {
          document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
          document.cookie = 'sb-user-role=; path=/; max-age=0; SameSite=Lax';
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isSupabaseConfigured, handleAuthUserSync]);

  const loadMockData = () => {
    // Generate mock active data
    const mockCompetitions: Competition[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Daily Forex Sprint',
        description: 'Fast-paced daily scalping league. High leverage, zero room for error.',
        start_time: new Date(Date.now() - 3600000 * 4).toISOString(),
        end_time: new Date(Date.now() + 3600000 * 20).toISOString(),
        min_equity: 5000.00,
        max_drawdown: 5.00,
        max_participants: 50,
        category: 'daily',
        status: 'active'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Monthly Apex Titan',
        description: 'The primary arena. Build solid returns and keep drawdowns low.',
        start_time: new Date(Date.now() - 3600000 * 240).toISOString(),
        end_time: new Date(Date.now() + 3600000 * 480).toISOString(),
        min_equity: 10000.00,
        max_drawdown: 10.00,
        max_participants: 100,
        category: 'monthly',
        status: 'active'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Yearly Grand Slam',
        description: 'The ultimate test of consistency and risk management.',
        start_time: new Date(Date.now() - 3600000 * 4800).toISOString(),
        end_time: new Date(Date.now() + 3600000 * 3960).toISOString(),
        min_equity: 25000.00,
        max_drawdown: 15.00,
        max_participants: 500,
        category: 'yearly',
        status: 'active'
      }
    ];

    const mockAccounts: TraderAccount[] = [
      { id: 'acc-1', user_id: 'daniel-trader', account_number: '881024', broker_server: 'ICMarketsSC-Server', platform: 'MT5', initial_equity: 10000.00, current_equity: 10540.00, floating_pnl: 240.00, max_recorded_drawdown: 1.2, status: 'active' },
      { id: 'acc-2', user_id: 'alice-trader', account_number: '509421', broker_server: 'Pepperstone-Demo', platform: 'MT5', initial_equity: 10000.00, current_equity: 12650.00, floating_pnl: 650.00, max_recorded_drawdown: 3.4, status: 'active' },
      { id: 'acc-3', user_id: 'bob-swing', account_number: '302485', broker_server: 'FTMO-Server', platform: 'MT5', initial_equity: 10000.00, current_equity: 9400.00, floating_pnl: -120.00, max_recorded_drawdown: 8.5, status: 'active' },
      { id: 'acc-4', user_id: 'charlie-gold', account_number: '904128', broker_server: 'XM-Global-Demo', platform: 'MT5', initial_equity: 25000.00, current_equity: 31200.00, floating_pnl: 1500.00, max_recorded_drawdown: 2.1, status: 'active' }
    ];

    const mockParticipants: Participant[] = [
      {
        id: 'part-1',
        competition_id: '22222222-2222-2222-2222-222222222222',
        trader_account_id: 'acc-2',
        user_id: 'alice-trader',
        starting_balance: 10000.00,
        current_equity: 12650.00,
        pnl_pct: 26.50,
        win_rate: 68.20,
        total_trades: 44,
        status: 'active',
        user: { name: 'Alice Scalper', avatar: 'AL', country: 'GB' },
        account: { account_number: '509421', broker_server: 'Pepperstone-Demo' }
      },
      {
        id: 'part-2',
        competition_id: '22222222-2222-2222-2222-222222222222',
        trader_account_id: 'acc-4',
        user_id: 'charlie-gold',
        starting_balance: 25000.00,
        current_equity: 31200.00,
        pnl_pct: 24.80,
        win_rate: 71.40,
        total_trades: 28,
        status: 'active',
        user: { name: 'Charlie Gold', avatar: 'CH', country: 'JP' },
        account: { account_number: '904128', broker_server: 'XM-Global-Demo' }
      },
      {
        id: 'part-3',
        competition_id: '22222222-2222-2222-2222-222222222222',
        trader_account_id: 'acc-1',
        user_id: 'daniel-trader',
        starting_balance: 10000.00,
        current_equity: 10540.00,
        pnl_pct: 5.40,
        win_rate: 55.00,
        total_trades: 20,
        status: 'active',
        user: { name: 'Daniel', avatar: 'DA', country: 'CA' },
        account: { account_number: '881024', broker_server: 'ICMarketsSC-Server' }
      },
      {
        id: 'part-4',
        competition_id: '22222222-2222-2222-2222-222222222222',
        trader_account_id: 'acc-3',
        user_id: 'bob-swing',
        starting_balance: 10000.00,
        current_equity: 9400.00,
        pnl_pct: -6.00,
        win_rate: 42.50,
        total_trades: 12,
        status: 'active',
        user: { name: 'Bob Swing', avatar: 'BO', country: 'DE' },
        account: { account_number: '302485', broker_server: 'FTMO-Server' }
      }
    ];

    const mockTrades: DbTrade[] = [
      { id: 't1', trader_account_id: 'acc-1', symbol: 'EUR/USD', type: 'BUY', lots: 1.0, open_price: 1.09100, close_price: 1.09350, open_time: new Date(Date.now() - 10800000).toISOString(), close_time: new Date(Date.now() - 7200000).toISOString(), profit: 250.00, pips: 25.0, status: 'closed' },
      { id: 't2', trader_account_id: 'acc-1', symbol: 'GBP/USD', type: 'SELL', lots: 1.5, open_price: 1.27800, close_price: 1.27600, open_time: new Date(Date.now() - 7200000).toISOString(), close_time: new Date(Date.now() - 3600000).toISOString(), profit: 300.00, pips: 20.0, status: 'closed' },
      { id: 't3', trader_account_id: 'acc-1', symbol: 'USD/JPY', type: 'BUY', lots: 2.0, open_price: 146.200, open_time: new Date(Date.now() - 1800000).toISOString(), profit: 240.00, pips: 12.0, status: 'open' },
      { id: 't4', trader_account_id: 'acc-2', symbol: 'GBP/USD', type: 'BUY', lots: 2.0, open_price: 1.27000, close_price: 1.27900, open_time: new Date(Date.now() - 18000000).toISOString(), close_time: new Date(Date.now() - 10800000).toISOString(), profit: 1800.00, pips: 90.0, status: 'closed' },
      { id: 't5', trader_account_id: 'acc-2', symbol: 'EUR/USD', type: 'SELL', lots: 1.0, open_price: 1.09500, close_price: 1.09300, open_time: new Date(Date.now() - 7200000).toISOString(), close_time: new Date(Date.now() - 600000).toISOString(), profit: 200.00, pips: 20.0, status: 'closed' },
      { id: 't6', trader_account_id: 'acc-2', symbol: 'USD/CAD', type: 'BUY', lots: 3.0, open_price: 1.36000, open_time: new Date(Date.now() - 900000).toISOString(), profit: 650.00, pips: 21.7, status: 'open' }
    ];

    setCompetitions(mockCompetitions);
    setTraderAccounts(mockAccounts);
    setParticipants(mockParticipants);
    setTrades(mockTrades);
  };

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isSupabaseConfigured) {
        // Load from Supabase
        const { data: dbComps, error: compErr } = await supabase.from('competitions').select('*');
        const { data: dbAccs, error: accErr } = await supabase.from('trader_accounts').select('*');
        const { data: dbTrades, error: tradeErr } = await supabase.from('trades').select('*');
        const { data: dbParts, error: partErr } = await supabase
          .from('competition_participants')
          .select(`
            *,
            user:users (id, name, avatar, country, email),
            account:trader_accounts (id, account_number, broker_server, current_equity, floating_pnl, max_recorded_drawdown, initial_equity, status)
          `);

        if (compErr || accErr || tradeErr || partErr) {
          console.error('Error fetching from Supabase, loading fallback mock data');
          throw new Error('Supabase fetch failed');
        }

        setCompetitions(dbComps || []);
        setTraderAccounts(dbAccs || []);
        setTrades(dbTrades || []);
        setParticipants((dbParts as unknown as Participant[]) || []);
      } else {
        // Mock fallback
        loadMockData();
      }
    } catch (err) {
      console.warn('Fallback: Loading mock data since database failed or is unconfigured', err);
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  }, [isSupabaseConfigured]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // WebSockets Realtime Sync via Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const reloadParticipants = async () => {
      const { data: dbParts } = await supabase
        .from('competition_participants')
        .select(`
          *,
          user:users (id, name, avatar, country, email),
          account:trader_accounts (id, account_number, broker_server, current_equity, floating_pnl, max_recorded_drawdown, initial_equity, status)
        `);
      if (dbParts) setParticipants(dbParts as unknown as Participant[]);
    };

    // Listen to changes in participants and accounts to instantly reflect standings
    const participantSubscription = supabase
      .channel('public:competition_participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_participants' }, async () => {
        await reloadParticipants();
      })
      .subscribe();

    const accountSubscription = supabase
      .channel('public:trader_accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trader_accounts' }, async () => {
        const { data: accs } = await supabase.from('trader_accounts').select('*');
        if (accs) setTraderAccounts(accs);
        await reloadParticipants();
      })
      .subscribe();

    const tradeSubscription = supabase
      .channel('public:trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => {
        supabase.from('trades').select('*').then(({ data }) => {
          if (data) setTrades(data as DbTrade[]);
        });
      })
      .subscribe();

    const compSubscription = supabase
      .channel('public:competitions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, () => {
        supabase.from('competitions').select('*').then(({ data }) => {
          if (data) setCompetitions(data);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantSubscription);
      supabase.removeChannel(accountSubscription);
      supabase.removeChannel(tradeSubscription);
      supabase.removeChannel(compSubscription);
    };
  }, [isSupabaseConfigured]);

  // In mock fallback mode ONLY (when Supabase is NOT configured),
  // simulate slight price drift in-memory for testing without mutating any database
  const traderAccountsRef = useRef<TraderAccount[]>([]);
  useEffect(() => {
    traderAccountsRef.current = traderAccounts;
  }, [traderAccounts]);

  const participantsRef = useRef<Participant[]>([]);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    if (isSupabaseConfigured) return;

    const liveUpdateInterval = setInterval(async () => {
      const currentAccounts = traderAccountsRef.current;
      const currentParticipants = participantsRef.current;

      if (currentAccounts.length === 0) return;

      const updatedAccounts = await Promise.all(
        currentAccounts.map(async (acc) => {
          if (acc.status === 'disqualified') return acc;
          const liveState = await MetaApiAdapter.fetchAccountState(acc.account_number, acc.broker_server);
          return {
            ...acc,
            current_equity: liveState.equity,
            floating_pnl: liveState.floatingPnL,
            max_recorded_drawdown: liveState.maxDrawdown
          };
        })
      );

      const updatedParticipants = currentParticipants.map(part => {
        const acc = updatedAccounts.find(a => a.id === part.trader_account_id);
        if (!acc) return part;

        const roi = part.starting_balance > 0 
          ? Number((((acc.current_equity - part.starting_balance) / part.starting_balance) * 100).toFixed(2))
          : 0;

        return {
          ...part,
          current_equity: acc.current_equity,
          pnl_pct: roi
        };
      });

      setTraderAccounts(updatedAccounts);
      setParticipants(updatedParticipants);
    }, 4000);

    return () => clearInterval(liveUpdateInterval);
  }, [isSupabaseConfigured]);

  const switchUser = (userId: string) => {
    const userProfile = SEED_USERS.find(u => u.id === userId);
    if (userProfile) {
      setCurrentUser(userProfile);
    }
  };

  const createCompetition = async (newComp: Omit<Competition, 'id' | 'status'>): Promise<boolean> => {
    const compPayload: Competition = {
      ...newComp,
      id: crypto.randomUUID(),
      status: 'active' // Auto-active for demonstration simplicity
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('competitions').insert(compPayload);
      if (error) {
        console.error('Supabase create competition error:', error);
        return false;
      }
    } else {
      setCompetitions(prev => [...prev, compPayload]);
    }
    return true;
  };

  const joinCompetition = async (
    competitionId: string,
    accountNumber: string,
    brokerServer: string,
    investorPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    // 1. Verify MT5 Account using server sync endpoint (with METAAPI_TOKEN) or local adapter
    let baselineEquity = 0;
    if (isSupabaseConfigured) {
      const verRes = await fetch('/api/mt5/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          accountNumber,
          brokerServer,
          investorPassword
        })
      });
      const verData = await verRes.json();
      if (!verData.success || verData.isMock) {
        return {
          success: false,
          error: verData.error || 'Could not verify MT5 account — please check your credentials and try again.'
        };
      }
      baselineEquity = Number(verData.balance ?? verData.equity ?? 0);
    } else {
      // Demo / offline mode without database connection
      const ver = await MetaApiAdapter.verifyConnection(accountNumber, brokerServer, investorPassword);
      if (!ver.success) {
        return { success: false, error: ver.error || 'Failed to authenticate MT5 credentials' };
      }
      baselineEquity = Number(ver.balance ?? ver.equity ?? 0);
    }

    if (baselineEquity <= 0) {
      return { success: false, error: 'Could not verify MT5 account — please check your credentials and try again.' };
    }

    // 2. Load competition min equity rule
    const comp = competitions.find(c => c.id === competitionId);
    if (!comp) return { success: false, error: 'Competition not found' };

    if (baselineEquity < comp.min_equity) {
      return {
        success: false,
        error: `Insufficient Account Equity. Required: $${comp.min_equity.toLocaleString()}, Current: $${baselineEquity.toLocaleString()}`
      };
    }

    // Check if user already joined this competition with any account
    const alreadyJoined = participants.some(p => p.competition_id === competitionId && p.user_id === currentUser.id);
    if (alreadyJoined) {
      return { success: false, error: 'You are already registered for this competition' };
    }

    // 3. Setup accounts and register participant
    const newAccId = crypto.randomUUID();
    const accountPayload: TraderAccount = {
      id: newAccId,
      user_id: currentUser.id,
      account_number: accountNumber,
      broker_server: brokerServer,
      investor_password: investorPassword,
      platform: 'MT5',
      initial_equity: baselineEquity,
      current_equity: baselineEquity,
      floating_pnl: 0,
      max_recorded_drawdown: 0,
      status: 'active'
    };

    const participantPayload: Participant = {
      id: crypto.randomUUID(),
      competition_id: competitionId,
      trader_account_id: newAccId,
      user_id: currentUser.id,
      starting_balance: baselineEquity,
      current_equity: baselineEquity,
      pnl_pct: 0,
      win_rate: 0,
      total_trades: 0,
      status: 'active'
    };

    // Make sure users exist in public.users to bypass references constraint
    if (isSupabaseConfigured) {
      // Upsert current user in public.users to prevent reference violations
      await supabase.from('users').upsert({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        avatar: currentUser.avatar,
        country: currentUser.country,
        status: currentUser.status
      });

      // Insert account and registration
      const { error: accErr } = await supabase.from('trader_accounts').insert(accountPayload);
      if (accErr) {
        console.error('Account insert error:', accErr);
        return { success: false, error: accErr.message };
      }

      const { error: partErr } = await supabase.from('competition_participants').insert(participantPayload);
      if (partErr) {
        console.error('Participant registration error:', partErr);
        return { success: false, error: partErr.message };
      }
    } else {
      // Local State Update
      setTraderAccounts(prev => [...prev, accountPayload]);
      
      const newPart: Participant = {
        ...participantPayload,
        user: { name: currentUser.name, avatar: currentUser.avatar, country: currentUser.country },
        account: { account_number: accountNumber, broker_server: brokerServer }
      };
      setParticipants(prev => [...prev, newPart]);
    }

    // Seed mock initial trades for user connection to populate list
    const mockTradePayload: DbTrade = {
      id: `mt-${Math.floor(Math.random() * 900000 + 100000)}`,
      trader_account_id: newAccId,
      symbol: 'EUR/USD',
      type: 'BUY',
      lots: 1.0,
      open_price: 1.09250,
      open_time: new Date().toISOString(),
      profit: 0.00,
      pips: 0.0,
      status: 'open'
    };

    if (isSupabaseConfigured) {
      await supabase.from('trades').insert(mockTradePayload);
    } else {
      setTrades(prev => [...prev, mockTradePayload]);
    }

    await loadData(); // Reload rankings
    return { success: true };
  };

  const disqualifyParticipant = async (
    competitionId: string,
    accountId: string,
    reason: string
  ): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error: accErr } = await supabase
        .from('trader_accounts')
        .update({ status: 'disqualified', disqualification_reason: reason })
        .eq('id', accountId);

      const { error: partErr } = await supabase
        .from('competition_participants')
        .update({ status: 'disqualified', disqualification_reason: reason })
        .eq('competition_id', competitionId)
        .eq('trader_account_id', accountId);

      if (accErr || partErr) {
        console.error('Disqualification error:', accErr, partErr);
        return false;
      }
    } else {
      setTraderAccounts(prev =>
        prev.map(a => (a.id === accountId ? { ...a, status: 'disqualified', disqualification_reason: reason } : a))
      );
      setParticipants(prev =>
        prev.map(p =>
          p.competition_id === competitionId && p.trader_account_id === accountId
            ? { ...p, status: 'disqualified', disqualification_reason: reason }
            : p
        )
      );
    }
    return true;
  };

  const syncAccount = async (
    accountId: string,
    accountNumber: string,
    brokerServer: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/mt5/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'sync_account',
          accountId,
          accountNumber,
          brokerServer
        })
      });

      const data = await response.json();
      if (!data.success) {
        return { success: false, error: data.error || 'Failed to sync MT5 account' };
      }

      // Optimistically update React state
      if (data.state) {
        setTraderAccounts(prev =>
          prev.map(a =>
            a.id === accountId
              ? {
                  ...a,
                  current_equity: data.state.equity,
                  floating_pnl: data.state.floatingPnL,
                  max_recorded_drawdown: data.state.maxDrawdown
                }
              : a
          )
        );

        setParticipants(prev =>
          prev.map(p => {
            if (p.trader_account_id === accountId) {
              const startBal = Number(p.starting_balance) > 0 ? Number(p.starting_balance) : Number(data.state?.balance || 0);
              const roi = startBal > 0 ? Number((((data.state.equity - startBal) / startBal) * 100).toFixed(2)) : 0;
              return {
                ...p,
                current_equity: data.state.equity,
                pnl_pct: roi,
                total_trades: data.tradesCount ?? p.total_trades
              };
            }
            return p;
          })
        );
      }

      // If user is authenticated in Supabase, also write to Supabase directly from authenticated client
      if (isSupabaseConfigured && data.state) {
        await supabase
          .from('trader_accounts')
          .update({
            current_equity: data.state.equity,
            floating_pnl: data.state.floatingPnL,
            max_recorded_drawdown: data.state.maxDrawdown
          })
          .eq('id', accountId);

        const { data: userParts } = await supabase
          .from('competition_participants')
          .select('id, starting_balance')
          .eq('trader_account_id', accountId);

        if (userParts) {
          for (const up of userParts) {
            const sBal = Number(up.starting_balance) > 0 ? Number(up.starting_balance) : Number(data.state?.balance || 0);
            const rRoi = sBal > 0 ? Number((((data.state.equity - sBal) / sBal) * 100).toFixed(2)) : 0;
            await supabase
              .from('competition_participants')
              .update({
                current_equity: data.state.equity,
                pnl_pct: rRoi,
                total_trades: data.tradesCount ?? 0
              })
              .eq('id', up.id);
          }
        }
      }

      await loadData();
      return { success: true };
    } catch {
      return { success: false, error: 'Network error occurred during MT5 sync.' };
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) {
      const newId = `usr-${Date.now()}`;
      const role = email.toLowerCase().includes('admin') ? 'admin' : 'user';
      const newProfile: UserProfile = {
        id: newId,
        name,
        email,
        role,
        avatar: name.slice(0, 2).toUpperCase(),
        country: 'US',
        status: 'active'
      };
      setCurrentUser(newProfile);
      if (typeof document !== 'undefined') {
        document.cookie = `sb-access-token=mock-token-${Date.now()}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `sb-user-role=${role}; path=/; max-age=604800; SameSite=Lax`;
      }
      return { success: true, role, requiresEmailConfirmation: false };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    let authSession = data.session;
    let authUser = data.user;

    // If session wasn't immediately returned, attempt sign in in case confirmation is disabled
    if (!authSession && authUser) {
      try {
        const signInRes = await supabase.auth.signInWithPassword({ email, password });
        if (signInRes.data?.session) {
          authSession = signInRes.data.session;
          authUser = signInRes.data.user;
        }
      } catch {
        // Handled below if session is still null
      }
    }

    if (!authSession) {
      // Email confirmation is required by Supabase settings before session creation
      return {
        success: true,
        requiresEmailConfirmation: true,
        role: email.toLowerCase().includes('admin') ? 'admin' : 'user'
      };
    }

    setSession(authSession);
    setUser(authUser);
    if (typeof document !== 'undefined') {
      document.cookie = `sb-access-token=${authSession.access_token}; path=/; max-age=604800; SameSite=Lax`;
    }

    let userRole: 'admin' | 'user' = email.toLowerCase().includes('admin') ? 'admin' : 'user';
    if (authUser) {
      const syncedProfile = await handleAuthUserSync(authUser);
      if (syncedProfile) {
        userRole = syncedProfile.role;
      }
    }

    if (typeof document !== 'undefined') {
      document.cookie = `sb-user-role=${userRole}; path=/; max-age=604800; SameSite=Lax`;
    }

    return { success: true, role: userRole, requiresEmailConfirmation: false };
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) {
      const existing = SEED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        setCurrentUser(existing);
        if (typeof document !== 'undefined') {
          document.cookie = `sb-access-token=mock-token-${Date.now()}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `sb-user-role=${existing.role}; path=/; max-age=604800; SameSite=Lax`;
        }
        return { success: true, role: existing.role };
      }
      const role = email.toLowerCase().includes('admin') ? 'admin' : 'user';
      const mockProfile: UserProfile = {
        id: `usr-${Date.now()}`,
        name: email.split('@')[0],
        email,
        role,
        avatar: email.slice(0, 2).toUpperCase(),
        country: 'US',
        status: 'active'
      };
      setCurrentUser(mockProfile);
      if (typeof document !== 'undefined') {
        document.cookie = `sb-access-token=mock-token-${Date.now()}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `sb-user-role=${role}; path=/; max-age=604800; SameSite=Lax`;
      }
      return { success: true, role };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (typeof document !== 'undefined') {
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax`;
      }
    }

    let userRole: 'admin' | 'user' = email.toLowerCase().includes('admin') ? 'admin' : 'user';
    if (data.user) {
      const syncedProfile = await handleAuthUserSync(data.user);
      if (syncedProfile) {
        userRole = syncedProfile.role;
      }
    }

    if (typeof document !== 'undefined') {
      document.cookie = `sb-user-role=${userRole}; path=/; max-age=604800; SameSite=Lax`;
    }

    return { success: true, role: userRole };
  };

  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    if (typeof document !== 'undefined') {
      document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'sb-user-role=; path=/; max-age=0; SameSite=Lax';
    }
    setSession(null);
    setUser(null);
    setCurrentUser(SEED_USERS[0]);
  };

  const isAuthenticated = !!(session || user || (currentUser && currentUser.id !== 'unauthenticated'));
  const isAdmin = currentUser.role === 'admin';

  return (
    <AppContext.Provider
      value={{
        currentUser,
        availableUsers: SEED_USERS,
        switchUser,
        competitions,
        participants,
        traderAccounts,
        trades,
        createCompetition,
        joinCompetition,
        disqualifyParticipant,
        syncAccount,
        isLoading,
        isSupabaseConfigured,
        session,
        user,
        isAuthenticated,
        isAdmin,
        signUp,
        signIn,
        signOut
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
