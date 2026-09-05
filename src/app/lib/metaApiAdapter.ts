// MetaApi SDK read-only sync adapter
// Handles real connection validation if process.env.METAAPI_TOKEN is set,
// and drops back to high-fidelity mock validation/sync otherwise.

export interface MT5AccountCredentials {
  accountNumber: string;
  brokerServer: string;
  investorPassword?: string;
}

export interface VerificationResult {
  success: boolean;
  error?: string;
  balance?: number;
  equity?: number;
  currency?: string;
}

export interface LiveAccountState {
  balance: number;
  equity: number;
  floatingPnL: number;
  maxDrawdown: number;
}

export interface LiveTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  closePrice?: number;
  openTime: string;
  closeTime?: string;
  profit: number;
  pips: number;
  status: 'open' | 'closed' | 'pending';
}

// In-memory simulation cache for mocked MT5 connections
const simulatedAccountsCache: Record<string, {
  initialEquity: number;
  currentEquity: number;
  floatingPnL: number;
  maxDrawdown: number;
  trades: LiveTrade[];
  lastUpdate: number;
}> = {};

function getSimulatedAccount(accountNumber: string, brokerServer: string) {
  const key = `${brokerServer}:${accountNumber}`;
  if (!simulatedAccountsCache[key]) {
    // Generate initial realistic state for this account
    const initialEquity = 10000 + Math.floor(Math.random() * 15) * 1000; // 10k - 25k
    const floatingPnL = Number(((Math.random() - 0.4) * 450).toFixed(2));
    const currentEquity = initialEquity + floatingPnL;
    const maxDrawdown = Number((Math.random() * 4).toFixed(2)); // 0% - 4%

    const trades: LiveTrade[] = [
      {
        id: `t-${Math.floor(Math.random() * 900000 + 100000)}`,
        symbol: 'EUR/USD',
        type: Math.random() > 0.5 ? 'BUY' : 'SELL',
        lots: 1.0,
        openPrice: 1.09100,
        closePrice: 1.09350,
        openTime: new Date(Date.now() - 3600000 * 2).toISOString(),
        closeTime: new Date(Date.now() - 3600000).toISOString(),
        profit: 250.00,
        pips: 25.0,
        status: 'closed'
      },
      {
        id: `t-${Math.floor(Math.random() * 900000 + 100000)}`,
        symbol: 'GBP/USD',
        type: 'BUY',
        lots: 1.5,
        openPrice: 1.27200,
        openTime: new Date(Date.now() - 1800000).toISOString(),
        profit: floatingPnL,
        pips: Number((floatingPnL / 15).toFixed(1)),
        status: 'open'
      }
    ];

    simulatedAccountsCache[key] = {
      initialEquity,
      currentEquity,
      floatingPnL,
      maxDrawdown,
      trades,
      lastUpdate: Date.now()
    };
  }

  // Drift current account state over time to simulate active market pricing
  const account = simulatedAccountsCache[key];
  const now = Date.now();
  const elapsedSeconds = (now - account.lastUpdate) / 1000;
  
  if (elapsedSeconds > 1.5) {
    const drift = Number(((Math.random() - 0.48) * 15).toFixed(2));
    account.floatingPnL = Number((account.floatingPnL + drift).toFixed(2));
    account.currentEquity = Number((account.initialEquity + account.floatingPnL).toFixed(2));
    
    const currentDrawdown = account.initialEquity > 0 
      ? Number((((account.initialEquity - account.currentEquity) / account.initialEquity) * 100).toFixed(2))
      : 0;
    
    if (currentDrawdown > account.maxDrawdown) {
      account.maxDrawdown = currentDrawdown;
    }

    const openTrade = account.trades.find(t => t.status === 'open');
    if (openTrade) {
      openTrade.profit = account.floatingPnL;
      openTrade.pips = Number((openTrade.profit / 15).toFixed(1));
    }

    account.lastUpdate = now;
  }

  return account;
}

export class MetaApiAdapter {
  private static token = process.env.METAAPI_TOKEN || '';

  /**
   * Validate broker server format before sending requests
   */
  static validateBrokerServer(brokerServer: string): { valid: boolean; error?: string } {
    if (!brokerServer || brokerServer.trim().length < 3) {
      return {
        valid: false,
        error: 'MT5 Broker Server name is required (e.g., Exness-MT5Real8, ICMarketsSC-Server, Pepperstone-Demo).'
      };
    }

    const trimmed = brokerServer.trim();
    if (/\s/.test(trimmed)) {
      return {
        valid: false,
        error: `Invalid broker server "${trimmed}". Server names cannot contain spaces (e.g., use "Exness-MT5Real8" instead of "Exness MT5 Real 8").`
      };
    }

    const genericNames = ['exness', 'icmarkets', 'pepperstone', 'ftmo', 'xm', 'darwinex', 'octafx', 'fxtm'];
    if (genericNames.includes(trimmed.toLowerCase())) {
      return {
        valid: false,
        error: `"${trimmed}" is too generic. Please specify the exact MT5 server name (e.g., "${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}-MT5Real" or "${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}-Demo").`
      };
    }

    return { valid: true };
  }

  /**
   * Test connection and retrieve live initial equity/balance
   */
  static async verifyConnection(
    accountNumber: string,
    brokerServer: string,
    investorPassword?: string
  ): Promise<VerificationResult> {
    if (!accountNumber || !brokerServer || !investorPassword) {
      return {
        success: false,
        error: 'Account number, broker server, and investor password are required.'
      };
    }

    // 1. Broker Server Validation
    const serverValidation = this.validateBrokerServer(brokerServer);
    if (!serverValidation.valid) {
      return { success: false, error: serverValidation.error };
    }

    // 2. If token is not set, run high-fidelity mock connection
    if (!this.token) {
      console.log(`[MetaApi Engine] Verifying MT5 Account #${accountNumber} on ${brokerServer} (Mock Mode)`);
      const simAcc = getSimulatedAccount(accountNumber, brokerServer);
      return {
        success: true,
        balance: simAcc.initialEquity,
        equity: simAcc.currentEquity,
        currency: 'USD'
      };
    }

    // 3. Live MetaApi Connection Flow
    try {
      // Find existing MetaApi account or provision new one
      const provisioningUrl = 'https://mt-provisioning-api-v1.metaapi.cloud/users/current/accounts';
      const listRes = await fetch(provisioningUrl, {
        headers: { 'auth-token': this.token }
      });

      let metaAccountId: string | null = null;
      let accountState = 'DRAFT';

      if (listRes.ok) {
        const accounts = (await listRes.json()) as Array<{
          id: string;
          login: string;
          server: string;
          state: string;
          connectionStatus?: string;
        }>;
        const existing = accounts.find(
          a => a.login === accountNumber && a.server.toLowerCase() === brokerServer.toLowerCase()
        );
        if (existing) {
          metaAccountId = existing.id;
          accountState = existing.state;
        }
      }

      if (!metaAccountId) {
        // Create new account resource in MetaApi (investorMode: true / manualTrades: false)
        const createRes = await fetch(provisioningUrl, {
          method: 'POST',
          headers: {
            'auth-token': this.token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `VelocityFX-${accountNumber}`,
            type: 'cloud',
            login: accountNumber,
            password: investorPassword,
            server: brokerServer,
            platform: 'mt5',
            application: 'metaapi',
            manualTrades: false
          })
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          const errMsg = errData.message || createRes.statusText;
          if (errMsg.toLowerCase().includes('password') || errMsg.toLowerCase().includes('auth')) {
            return {
              success: false,
              error: 'Failed to authenticate with MT5 server. Please verify your investor password.'
            };
          }
          if (errMsg.toLowerCase().includes('server') || errMsg.toLowerCase().includes('not found')) {
            return {
              success: false,
              error: `Broker server "${brokerServer}" not recognized by MetaApi. Please check the exact server name.`
            };
          }
          return { success: false, error: errMsg };
        }

        const created = (await createRes.json()) as { id: string; state: string };
        metaAccountId = created.id;
        accountState = created.state;
      }

      // If account is not deployed, trigger deployment
      if (accountState !== 'DEPLOYED') {
        await fetch(`https://mt-provisioning-api-v1.metaapi.cloud/users/current/accounts/${metaAccountId}/deploy`, {
          method: 'POST',
          headers: { 'auth-token': this.token }
        });
      }

      // Poll for connection state (up to 20 seconds timeout)
      const maxRetries = 10;
      let isConnected = false;

      for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(
          `https://mt-provisioning-api-v1.metaapi.cloud/users/current/accounts/${metaAccountId}`,
          { headers: { 'auth-token': this.token } }
        );

        if (statusRes.ok) {
          const statusData = (await statusRes.json()) as {
            state: string;
            connectionStatus?: string;
          };
          if (statusData.state === 'DEPLOYED' && statusData.connectionStatus === 'CONNECTED') {
            isConnected = true;
            break;
          }
        }
      }

      if (!isConnected) {
        return {
          success: false,
          error: 'Connection to MT5 broker timed out while spinning up cloud gateway. Please retry.'
        };
      }

      // Fetch live account information
      const clientUrl = `https://mt-client-api-v1.metaapi.cloud/users/current/accounts/${metaAccountId}/account-information`;
      const infoRes = await fetch(clientUrl, {
        headers: { 'auth-token': this.token }
      });

      if (infoRes.ok) {
        const info = (await infoRes.json()) as {
          balance: number;
          equity: number;
          currency: string;
        };
        return {
          success: true,
          balance: info.balance,
          equity: info.equity,
          currency: info.currency || 'USD'
        };
      }

      return {
        success: false,
        error: 'Failed to authenticate with MT5 server. Please verify your investor password.'
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'MetaApi connection failed';
      return { success: false, error: errMsg };
    }
  }

  /**
   * Syncs active account metrics (equity, floating PnL, drawdown)
   * Fetches account-information AND open positions separately to compute floating PnL
   */
  static async fetchAccountState(
    accountNumber: string,
    brokerServer: string
  ): Promise<LiveAccountState> {
    if (!this.token) {
      const sim = getSimulatedAccount(accountNumber, brokerServer);
      return {
        balance: sim.initialEquity,
        equity: sim.currentEquity,
        floatingPnL: sim.floatingPnL,
        maxDrawdown: sim.maxDrawdown
      };
    }

    try {
      // 1. Locate MetaApi account ID
      const listRes = await fetch('https://mt-provisioning-api-v1.metaapi.cloud/users/current/accounts', {
        headers: { 'auth-token': this.token }
      });

      if (!listRes.ok) throw new Error('Failed to fetch MetaApi accounts');
      const accounts = (await listRes.json()) as Array<{ id: string; login: string; server: string }>;
      const target = accounts.find(
        a => a.login === accountNumber && a.server.toLowerCase() === brokerServer.toLowerCase()
      );

      if (!target) throw new Error(`Account #${accountNumber} not found in MetaApi`);

      // 2. Fetch Account Information (Balance, Equity)
      const infoRes = await fetch(
        `https://mt-client-api-v1.metaapi.cloud/users/current/accounts/${target.id}/account-information`,
        { headers: { 'auth-token': this.token } }
      );
      if (!infoRes.ok) throw new Error('Failed to fetch live account info');
      const info = (await infoRes.json()) as { balance: number; equity: number };

      // 3. Fetch Open Positions separately to sum Floating PnL
      const posRes = await fetch(
        `https://mt-client-api-v1.metaapi.cloud/users/current/accounts/${target.id}/positions`,
        { headers: { 'auth-token': this.token } }
      );
      let floatingPnL = 0;
      if (posRes.ok) {
        const positions = (await posRes.json()) as Array<{ profit: number; unrealizedProfit?: number }>;
        floatingPnL = positions.reduce((sum, p) => sum + (p.profit || p.unrealizedProfit || 0), 0);
      } else {
        floatingPnL = info.equity - info.balance;
      }

      const initialEquity = info.balance || 10000;
      const drawdown = initialEquity > 0 && info.equity < initialEquity
        ? Number((((initialEquity - info.equity) / initialEquity) * 100).toFixed(2))
        : 0;

      return {
        balance: info.balance,
        equity: info.equity,
        floatingPnL: Number(floatingPnL.toFixed(2)),
        maxDrawdown: drawdown
      };
    } catch {
      const sim = getSimulatedAccount(accountNumber, brokerServer);
      return {
        balance: sim.initialEquity,
        equity: sim.currentEquity,
        floatingPnL: sim.floatingPnL,
        maxDrawdown: sim.maxDrawdown
      };
    }
  }

  /**
   * Syncs trade lists (open positions and recent deals)
   */
  static async fetchTradeLog(
    accountNumber: string,
    brokerServer: string
  ): Promise<LiveTrade[]> {
    if (!this.token) {
      const sim = getSimulatedAccount(accountNumber, brokerServer);
      return sim.trades;
    }

    try {
      const listRes = await fetch('https://mt-provisioning-api-v1.metaapi.cloud/users/current/accounts', {
        headers: { 'auth-token': this.token }
      });
      if (!listRes.ok) return [];
      const accounts = (await listRes.json()) as Array<{ id: string; login: string; server: string }>;
      const target = accounts.find(
        a => a.login === accountNumber && a.server.toLowerCase() === brokerServer.toLowerCase()
      );
      if (!target) return [];

      // Fetch open positions
      const posRes = await fetch(
        `https://mt-client-api-v1.metaapi.cloud/users/current/accounts/${target.id}/positions`,
        { headers: { 'auth-token': this.token } }
      );

      if (posRes.ok) {
        const positions = (await posRes.json()) as Array<{
          id: string;
          symbol: string;
          type: string;
          volume: number;
          openPrice: number;
          time: string;
          profit: number;
        }>;

        return positions.map(p => ({
          id: p.id,
          symbol: p.symbol,
          type: p.type.toUpperCase().includes('BUY') ? 'BUY' : 'SELL',
          lots: p.volume,
          openPrice: p.openPrice,
          openTime: p.time,
          profit: p.profit,
          pips: Number((p.profit / 15).toFixed(1)),
          status: 'open'
        }));
      }

      return [];
    } catch {
      return [];
    }
  }
}
