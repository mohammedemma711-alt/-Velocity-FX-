# Velocity FX — MetaTrader 5 (MT5) Competition & Leaderboard Platform

Velocity FX is a high-performance Next.js application designed to run real-time Forex trading competitions with live MetaTrader 5 (MT5) account synchronization via MetaApi and Supabase.

---

## ⚡ How to Connect MetaTrader 5 (MetaApi) to the Platform

The platform connects to live MT5 broker servers (e.g., Exness, ICMarkets, Pepperstone, FTMO, XM) via **MetaApi Cloud**.

### Step 1: Get Your MetaApi API Token
1. Go to [https://app.metaapi.cloud](https://app.metaapi.cloud) and create a free or paid account.
2. In the MetaApi dashboard, navigate to **API Access** (or **Settings**).
3. Copy your **Personal Access Token** (starts with `eyJ...`).

### Step 2: Configure Environment Variables

#### For Local Development:
Open [`.env.local`](file:///c:/Users/Daniel/Desktop/New%20folder/forex-leaderboard/.env.local) and add your token:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
METAAPI_TOKEN="your_metaapi_token_here"
```

#### For Vercel Deployment:
1. Open your project on the [Vercel Dashboard](https://vercel.com/dashboard).
2. Go to **Settings** → **Environment Variables**.
3. Add the following 3 variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anonymous Key
   - `METAAPI_TOKEN`: Your MetaApi Access Token
4. Click **Save** and trigger a **Redeploy**.

> **Note on Mock Mode**: If `METAAPI_TOKEN` is not set, the platform will automatically run in high-fidelity simulation mode for testing. Once `METAAPI_TOKEN` is provided, all MT5 connections will sync directly with live MetaTrader servers.

---

## 📊 How Traders Connect Their MT5 Accounts

1. Navigate to the **User Dashboard** (`/dashboard`).
2. Click **Connect MT5 & Register** on an active competition.
3. Enter the 3 required read-only credentials:
   - **MT5 Account Number**: (e.g. `5094102`)
   - **MT5 Broker Server Name**: The exact server name from your broker (e.g., `Exness-MT5Real8`, `ICMarketsSC-Server`, `Pepperstone-Demo`, `FTMO-Server`).
   - **Investor Password**: The read-only investor password created in MetaTrader 5.
4. Click **Verify & Join**. The backend will provision the read-only MT5 gateway, sync live balance/equity/positions, and place the trader onto the live leaderboard.

---

## 🔄 Live Sync & Background Cron

- **Manual Sync**: Traders can click **"↻ Sync MT5"** on their dashboard cards to refresh live equity and open positions at any time.
- **Background Cron**: The endpoint `GET /api/mt5/sync?cron=true` can be triggered periodically (e.g. every 5 minutes via Vercel Cron or a task scheduler) to batch-refresh all leaderboard rankings.

---

## 🛠️ Database Setup (Supabase)

1. Open your Supabase SQL Editor.
2. Run the SQL script located in [`schema.sql`](file:///c:/Users/Daniel/Desktop/New%20folder/forex-leaderboard/schema.sql).
3. This sets up the tables (`users`, `competitions`, `trader_accounts`, `competition_participants`, `trades`), RLS policies, automated triggers, and WebSocket Realtime publications.
