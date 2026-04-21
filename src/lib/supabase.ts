import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Server-side client (SSR endpoints, API routes). Uses service role key.
// NEVER import this from a client-side / React island file.
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase server env vars (PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
  );
}

export const supabaseServer = createClient<Database>(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
