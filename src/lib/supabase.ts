import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Get and trim environment variables
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

// Validate that both are present and non-empty
const isValid = url && anonKey && url.length > 0 && anonKey.length > 0;

// Create Supabase client if valid, otherwise null
export const supabase: SupabaseClient | null = isValid
  ? createClient(url!, anonKey!)
  : null;

// Debug logging (always enabled to help diagnose production issues)
if (!isValid) {
  console.warn('[Supabase] Missing environment variables:', {
    hasUrl: !!url,
    hasAnonKey: !!anonKey,
    urlLength: url?.length ?? 0,
    anonKeyLength: anonKey?.length ?? 0,
    envMode: import.meta.env.MODE,
    allEnvKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')),
  });
} else {
  console.log('[Supabase] Client initialized successfully', {
    url: url?.substring(0, 30) + '...',
    hasAnonKey: !!anonKey,
    envMode: import.meta.env.MODE,
  });
}
