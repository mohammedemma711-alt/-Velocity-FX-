import { NextResponse } from 'next/server';
import { MetaApiAdapter } from '../../../lib/metaApiAdapter';
import { supabase } from '../../../lib/supabase';

// Validate server name format
function validateBrokerServer(server: string): { valid: boolean; error?: string } {
  if (!server || server.trim().length < 3) {
    return {
      valid: false,
      error: 'MT5 Broker Server is required (e.g., Exness-MT5Real8, ICMarketsSC-Server, Pepperstone-Demo).'
    };
  }

  const trimmed = server.trim();
  // Broker servers shouldn't contain spaces or special punctuation other than dash, dot, or underscore
  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      error: `Invalid broker server "${trimmed}". MT5 server names cannot contain spaces (e.g., use "Exness-MT5Real8" instead of "Exness MT5 Real 8").`
    };
  }

  // Reject generic names that lack server designation
  const genericNames = ['exness', 'icmarkets', 'pepperstone', 'ftmo', 'xm', 'darwinex', 'octafx', 'fxtm'];
  if (genericNames.includes(trimmed.toLowerCase())) {
    return {
      valid: false,
      error: `"${trimmed}" is not a complete MT5 server name. Please provide the exact server name (e.g., "${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}-MT5Real" or "${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}-Demo").`
    };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = 'verify', accountNumber, brokerServer, investorPassword, accountId } = body;

    // 1. Broker Server Format Validation
    if (brokerServer) {
      const serverValidation = validateBrokerServer(brokerServer);
      if (!serverValidation.valid) {
        return NextResponse.json({ success: false, error: serverValidation.error }, { status: 400 });
      }
    }

    // --- ACTION: VERIFY (During Onboarding / Modal) ---
    if (action === 'verify') {
      if (!accountNumber || !brokerServer || !investorPassword) {
        return NextResponse.json(
          { success: false, error: 'Account Number, Broker Server, and Investor Password are required.' },
          { status: 400 }
        );
      }

      const result = await MetaApiAdapter.verifyConnection(
        accountNumber.trim(),
        brokerServer.trim(),
        investorPassword.trim()
      );

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 422 });
      }

      return NextResponse.json({
        success: true,
        balance: result.balance,
        equity: result.equity,
        currency: result.currency || 'USD'
      });
    }

    // --- ACTION: SYNC SINGLE ACCOUNT (Manual "Refresh Now") ---
    if (action === 'sync_account') {
      if (!accountNumber || !brokerServer) {
        return NextResponse.json(
          { success: false, error: 'Account Number and Broker Server are required for sync.' },
          { status: 400 }
        );
      }

      const liveState = await MetaApiAdapter.fetchAccountState(
        accountNumber.trim(),
        brokerServer.trim()
      );

      const liveTrades = await MetaApiAdapter.fetchTradeLog(
        accountNumber.trim(),
        brokerServer.trim()
      );

      const isSupabaseConfigured = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      if (isSupabaseConfigured && accountId) {
        // Update database records
        await supabase
          .from('trader_accounts')
          .update({
            current_equity: liveState.equity,
            floating_pnl: liveState.floatingPnL,
            max_recorded_drawdown: liveState.maxDrawdown
          })
          .eq('id', accountId);

        // Update participant records associated with this account
        const { data: participants } = await supabase
          .from('competition_participants')
          .select('id, starting_balance, competition_id')
          .eq('trader_account_id', accountId);

        if (participants && participants.length > 0) {
          for (const p of participants) {
            const startBal = Number(p.starting_balance) || 10000;
            const pnlPct = Number((((liveState.equity - startBal) / startBal) * 100).toFixed(2));
            
            await supabase
              .from('competition_participants')
              .update({
                current_equity: liveState.equity,
                pnl_pct: pnlPct,
                total_trades: liveTrades.length
              })
              .eq('id', p.id);
          }
        }
      }

      return NextResponse.json({
        success: true,
        state: liveState,
        tradesCount: liveTrades.length
      });
    }

    // --- ACTION: SYNC ALL ACCOUNTS (Leaderboard Refresh / Background Job) ---
    if (action === 'sync_all') {
      const isSupabaseConfigured = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      let syncedCount = 0;

      if (isSupabaseConfigured) {
        const { data: accounts } = await supabase
          .from('trader_accounts')
          .select('id, account_number, broker_server, status')
          .eq('status', 'active');

        if (accounts && accounts.length > 0) {
          for (const acc of accounts) {
            try {
              const state = await MetaApiAdapter.fetchAccountState(acc.account_number, acc.broker_server);
              await supabase
                .from('trader_accounts')
                .update({
                  current_equity: state.equity,
                  floating_pnl: state.floatingPnL,
                  max_recorded_drawdown: state.maxDrawdown
                })
                .eq('id', acc.id);

              const { data: parts } = await supabase
                .from('competition_participants')
                .select('id, starting_balance')
                .eq('trader_account_id', acc.id);

              if (parts) {
                for (const p of parts) {
                  const startBal = Number(p.starting_balance) || 10000;
                  const pnlPct = Number((((state.equity - startBal) / startBal) * 100).toFixed(2));
                  await supabase
                    .from('competition_participants')
                    .update({ current_equity: state.equity, pnl_pct: pnlPct })
                    .eq('id', p.id);
                }
              }
              syncedCount++;
            } catch (err) {
              console.warn(`Error syncing account ${acc.account_number}:`, err);
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        syncedAccounts: syncedCount,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal MT5 sync error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Support GET requests for scheduled cron endpoints (e.g. Vercel Cron or BullMQ worker)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isCron = searchParams.get('cron') === 'true';

  if (!isCron) {
    return NextResponse.json({
      service: 'Velocity FX MetaApi Sync Engine',
      status: 'online',
      timestamp: new Date().toISOString()
    });
  }

  // Execute batch sync for all active leaderboard accounts
  try {
    const isSupabaseConfigured = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    let syncedCount = 0;
    if (isSupabaseConfigured) {
      const { data: accounts } = await supabase
        .from('trader_accounts')
        .select('id, account_number, broker_server, status')
        .eq('status', 'active');

      if (accounts) {
        for (const acc of accounts) {
          const state = await MetaApiAdapter.fetchAccountState(acc.account_number, acc.broker_server);
          await supabase
            .from('trader_accounts')
            .update({
              current_equity: state.equity,
              floating_pnl: state.floatingPnL,
              max_recorded_drawdown: state.maxDrawdown
            })
            .eq('id', acc.id);

          syncedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'cron_scheduled_sync',
      syncedAccounts: syncedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Cron sync error';
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
