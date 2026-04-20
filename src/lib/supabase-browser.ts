import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Browser client — safe to import from React islands.
// Uses the ANON key (RLS enforced server-side).
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
