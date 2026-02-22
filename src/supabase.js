import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfigError = hasConfig
  ? null
  : "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";

export const supabase = hasConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError);
  }

  return supabase;
}
