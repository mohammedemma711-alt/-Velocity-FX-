import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient;

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
  }
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} catch {
  console.warn('Supabase URL or Anon Key is missing or invalid. Database integration will be disabled and fallback to local state mode.');
  // Safe mock client proxy to prevent runtime crashes
  supabaseClient = new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'from') {
        return () => ({
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            then: (cb: (value: { data: unknown[]; error: null }) => void) => cb({ data: [], error: null })
          }),
          insert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
          upsert: () => Promise.resolve({ error: null }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) })
        });
      }
      if (prop === 'channel') {
        return () => ({
          on: () => ({
            subscribe: () => ({})
          })
        });
      }
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
          signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
          signOut: () => Promise.resolve({ error: null })
        };
      }
      if (prop === 'removeChannel') {
        return () => {};
      }
      return () => Promise.resolve({ data: null, error: null });
    }
  }) as unknown as SupabaseClient;
}

export const supabase = supabaseClient;

