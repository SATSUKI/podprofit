import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (uses anon key, RLS-protected).
 *
 * Safe to import from Client Components.
 */
let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase browser client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  client = createClient(url, anonKey);
  return client;
}
