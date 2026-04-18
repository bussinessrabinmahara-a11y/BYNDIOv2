import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
};

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder.anon.key';

const _supabase = createClient(
  import.meta.env.DEV && !isSupabaseConfigured() ? fallbackUrl : supabaseUrl,
  import.meta.env.DEV && !isSupabaseConfigured() ? fallbackKey : supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: (url, options) => {
        if (!isSupabaseConfigured()) {
          console.warn('[BYNDIO] Supabase not configured - operations will be skipped');
          return Promise.resolve(new Response(JSON.stringify({ error: 'Not configured' }), { status: 500 }));
        }
        return fetch(url as RequestInfo, options as RequestInit);
      }
    }
  }
);

export const supabase: SupabaseClient = _supabase;

if (!isSupabaseConfigured() && import.meta.env.DEV) {
  console.warn('[BYNDIO] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.');
}
