import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    'Supabase não configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

export const supabase = createClient(
  isSupabaseConfigured
    ? supabaseUrl
    : 'https://placeholder.supabase.co',

  isSupabaseConfigured
    ? supabasePublishableKey
    : 'placeholder-publishable-key',

  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'vidarix_supabase_auth',
    },
  }
);