import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import fs from 'fs';
import path from 'path';

const CACHE_FILE_PATH = path.join(process.cwd(), 'src/app/data/local_cache.json');

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helpers to read/write local JSON file fallback
function readLocalCache() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const fileData = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      return JSON.parse(fileData);
    }
  } catch (err) {
    console.error('Failed to read local database cache', err);
  }
  return null;
}

function writeLocalCache(data: any) {
  try {
    const dirPath = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local database cache', err);
  }
}

export async function GET() {
  if (!isSupabaseConfigured) {
    const cache = readLocalCache();
    if (cache) {
      return NextResponse.json({ success: true, data: cache, source: 'local_cache' });
    }
    return NextResponse.json({ success: true, data: null, source: 'local_cache' });
  }

  try {
    const { data, error } = await supabase
      .from('simulation_state')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, data, source: 'supabase' });
  } catch (err: any) {
    console.error('Supabase fetch error:', err.message);
    const cache = readLocalCache();
    return NextResponse.json({ success: false, error: err.message, data: cache, source: 'fallback_cache' });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userTrader, traders, positions, tradeHistory } = body;

    const statePayload = {
      id: 'default',
      user_trader: userTrader,
      traders,
      positions,
      trade_history: tradeHistory,
      updated_at: new Date().toISOString()
    };

    // Save to local cache as fallback/backup
    writeLocalCache(statePayload);

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true, message: 'Saved to local cache', source: 'local_cache' });
    }

    const { data, error } = await supabase
      .from('simulation_state')
      .upsert(statePayload, { onConflict: 'id' });

    if (error) throw error;
    return NextResponse.json({ success: true, data, source: 'supabase' });
  } catch (err: any) {
    console.error('Supabase save error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      fs.unlinkSync(CACHE_FILE_PATH);
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true, message: 'Reset local cache', source: 'local_cache' });
    }

    const { error } = await supabase
      .from('simulation_state')
      .delete()
      .eq('id', 'default');

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Reset database state', source: 'supabase' });
  } catch (err: any) {
    console.error('Supabase delete error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
