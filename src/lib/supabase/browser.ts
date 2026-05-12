import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (anon key, RLS-bound).
 *
 * PODP-66 — why `createBrowserClient` from `@supabase/ssr` instead of the
 * bare `createClient` from `@supabase/supabase-js`:
 *
 *   1. PKCE flow by default. `signInWithOtp` then sends a magic link that
 *      lands as `?code=...` on `/auth/callback` — which is the only shape
 *      our server route knows how to consume (`exchangeCodeForSession`).
 *      The bare `createClient` defaults to the legacy implicit flow which
 *      lands as `#access_token=...` in the URL hash; the server can't read
 *      the fragment, so the callback silently falls through and the user
 *      sees /login again. That is exactly the launch-blocker we shipped on
 *      2026-05-12.
 *   2. Cookie storage matched to the SSR client. `createBrowserClient` and
 *      `createServerClient` write/read the same `sb-*-auth-token` cookies,
 *      so the session set by the server route during code exchange is
 *      immediately visible to the next server-rendered page. The bare
 *      client stores in localStorage, which the server cannot see, leading
 *      to "Sign in" still rendered after a successful click-through.
 *   3. Auto-detect session in URL. On a same-tab return from the magic
 *      link the browser client will pick up `?code=...`/`#token` and
 *      finish the exchange itself if the user lands on a client component
 *      without going through `/auth/callback`. That is the belt to our
 *      braces — the primary path is the server route, but private mode or
 *      strict cookie blockers benefit from the client-side fallback (see
 *      `/auth/callback/page.tsx`).
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
  client = createBrowserClient(url, anonKey);
  return client;
}
