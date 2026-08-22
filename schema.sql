-- forex-leaderboard database schema

-- Drop tables if they exist
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS competition_participants CASCADE;
DROP TABLE IF EXISTS trader_accounts CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- Can support auth.uid() or custom handles
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    avatar TEXT NOT NULL DEFAULT 'TR',
    country TEXT NOT NULL DEFAULT 'US',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Competitions Table
CREATE TABLE competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    min_equity NUMERIC(12, 2) NOT NULL DEFAULT 1000.00,
    max_drawdown NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    max_participants INTEGER NOT NULL DEFAULT 100,
    category TEXT NOT NULL DEFAULT 'monthly' CHECK (category IN ('daily', 'monthly', 'yearly')),
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Trader Accounts Table (MT5 read-only connections)
CREATE TABLE trader_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL,
    broker_server TEXT NOT NULL,
    investor_password TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'MT5',
    initial_equity NUMERIC(12, 2) NOT NULL,
    current_equity NUMERIC(12, 2) NOT NULL,
    floating_pnl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    max_recorded_drawdown NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disqualified')),
    disqualification_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(account_number, broker_server)
);

-- 4. Competition Participants
CREATE TABLE competition_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    trader_account_id UUID NOT NULL REFERENCES trader_accounts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starting_balance NUMERIC(12, 2) NOT NULL,
    current_equity NUMERIC(12, 2) NOT NULL,
    pnl_pct NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    win_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    total_trades INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disqualified')),
    disqualification_reason TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(competition_id, trader_account_id)
);

-- 5. Trades Table (Read-only sync from MetaTrader 5)
CREATE TABLE trades (
    id TEXT PRIMARY KEY, -- MT5 Ticket ID
    trader_account_id UUID NOT NULL REFERENCES trader_accounts(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
    lots NUMERIC(6, 2) NOT NULL,
    open_price NUMERIC(12, 5) NOT NULL,
    close_price NUMERIC(12, 5), -- NULL if open position
    open_time TIMESTAMP WITH TIME ZONE NOT NULL,
    close_time TIMESTAMP WITH TIME ZONE, -- NULL if open position
    profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pips NUMERIC(8, 1) NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending'))
);

-- Seed Data (Initial Users, Competitions, Trader Accounts, Participants, Trades)
INSERT INTO users (id, name, email, role, avatar, country, status) VALUES
('admin-user', 'System Administrator', 'admin@velocityfx.com', 'admin', 'AD', 'US', 'active'),
('daniel-trader', 'Daniel', 'daniel@retail.com', 'user', 'DA', 'CA', 'active'),
('alice-trader', 'Alice Scalper', 'alice@retail.com', 'user', 'AL', 'GB', 'active'),
('bob-swing', 'Bob Swing', 'bob@retail.com', 'user', 'BO', 'DE', 'active'),
('charlie-gold', 'Charlie Gold', 'charlie@retail.com', 'user', 'CH', 'JP', 'active'),
('elena-pips', 'Elena Pips', 'elena@retail.com', 'user', 'EL', 'FR', 'active');

-- Seed Competitions (Daily League, Monthly Apex, Yearly Championship)
INSERT INTO competitions (id, title, description, start_time, end_time, min_equity, max_drawdown, max_participants, category, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Daily Forex Sprint', 'Fast-paced daily scalping league. High leverage, zero room for error.', NOW() - INTERVAL '4 hours', NOW() + INTERVAL '20 hours', 5000.00, 5.00, 50, 'daily', 'active'),
('22222222-2222-2222-2222-222222222222', 'Monthly Apex Titan', 'The primary arena. Build solid returns and keep drawdowns low.', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 10000.00, 10.00, 100, 'monthly', 'active'),
('33333333-3333-3333-3333-333333333333', 'Yearly Grand Slam', 'The ultimate test of consistency and risk management.', NOW() - INTERVAL '200 days', NOW() + INTERVAL '165 days', 25000.00, 15.00, 500, 'yearly', 'active');

-- Seed Trader Accounts (MT5)
INSERT INTO trader_accounts (id, user_id, account_number, broker_server, investor_password, initial_equity, current_equity, floating_pnl, max_recorded_drawdown, status) VALUES
('a1111111-1111-1111-1111-111111111111', 'daniel-trader', '881024', 'ICMarketsSC-Server', 'readOnly123', 10000.00, 10540.00, 240.00, 1.20, 'active'),
('a2222222-2222-2222-2222-222222222222', 'alice-trader', '509421', 'Pepperstone-Demo', 'passwd987', 10000.00, 12650.00, 650.00, 3.40, 'active'),
('a3333333-3333-3333-3333-333333333333', 'bob-swing', '302485', 'FTMO-Server', 'investPass', 10000.00, 9400.00, -120.00, 8.50, 'active'),
('a4444444-4444-4444-4444-444444444444', 'charlie-gold', '904128', 'XM-Global-Demo', 'goldpass', 25000.00, 31200.00, 1500.00, 2.10, 'active'),
('a5555555-5555-5555-5555-555555555555', 'elena-pips', '772910', 'Darwinex-Live', 'darPass', 10000.00, 9900.00, 0.00, 11.20, 'disqualified', 'Drawdown limit of 10% breached (Max recorded: 11.20%)');

-- Seed Competition Participants (register traders to Monthly Apex Titan)
INSERT INTO competition_participants (competition_id, trader_account_id, user_id, starting_balance, current_equity, pnl_pct, win_rate, total_trades, status, disqualification_reason) VALUES
('22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'alice-trader', 10000.00, 12650.00, 26.50, 68.20, 44, 'active', NULL),
('22222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444', 'charlie-gold', 25000.00, 31200.00, 24.80, 71.40, 28, 'active', NULL),
('22222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'daniel-trader', 10000.00, 10540.00, 5.40, 55.00, 20, 'active', NULL),
('22222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 'bob-swing', 10000.00, 9400.00, -6.00, 42.50, 12, 'active', NULL),
('22222222-2222-2222-2222-222222222222', 'a5555555-5555-5555-5555-555555555555', 'elena-pips', 10000.00, 9900.00, -1.00, 50.00, 8, 'disqualified', 'Drawdown limit of 10% breached (Max recorded: 11.20%)');

-- Seed Trades
INSERT INTO trades (id, trader_account_id, symbol, type, lots, open_price, close_price, open_time, close_time, profit, pips, status) VALUES
('t1', 'a1111111-1111-1111-1111-111111111111', 'EUR/USD', 'BUY', 1.00, 1.09100, 1.09350, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', 250.00, 25.0, 'closed'),
('t2', 'a1111111-1111-1111-1111-111111111111', 'GBP/USD', 'SELL', 1.50, 1.27800, 1.27600, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 300.00, 20.0, 'closed'),
('t3', 'a1111111-1111-1111-1111-111111111111', 'USD/JPY', 'BUY', 2.00, 146.200, NULL, NOW() - INTERVAL '30 minutes', NULL, 240.00, 12.0, 'open'),
('t4', 'a2222222-2222-2222-2222-222222222222', 'GBP/USD', 'BUY', 2.00, 1.27000, 1.27900, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '3 hours', 1800.00, 90.0, 'closed'),
('t5', 'a2222222-2222-2222-2222-222222222222', 'EUR/USD', 'SELL', 1.00, 1.09500, 1.09300, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '10 minutes', 200.00, 20.0, 'closed'),
('t6', 'a2222222-2222-2222-2222-222222222222', 'USD/CAD', 'BUY', 3.00, 1.36000, NULL, NOW() - INTERVAL '15 minutes', NULL, 650.00, 21.7, 'open');

-- Enable Realtime for the required tables in Supabase:
-- Run this in the Supabase SQL editor to enable Realtime
/*
begin;
  -- remove the publication if it exists
  drop publication if exists supabase_realtime;

  -- create publication
  create publication supabase_realtime;
commit;

-- add tables to publication
alter publication supabase_realtime add table competitions;
alter publication supabase_realtime add table trader_accounts;
alter publication supabase_realtime add table competition_participants;
alter publication supabase_realtime add table trades;
*/

-- Setup Row Level Security (RLS) - disable RLS for direct local/evaluator access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE competitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE trader_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE competition_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE trades DISABLE ROW LEVEL SECURITY;
