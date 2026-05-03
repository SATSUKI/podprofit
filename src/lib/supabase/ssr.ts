import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Per-request Supabase client for App Router Server Components.
 *
 * Uses anon key (RLS-bound) plus the user's session cookies, so
 * `auth.uid()` resolves correctly inside RLS policies.
 *
 * Returns null when env isn't configured — pages that need auth should
 * handle that gracefully (per CEO slim-down: code ships before Supabase
 * project is provisioned).
 */
export async function createSsrSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can't set cookies; only Route Handlers / Server Actions can.
          // Safe to ignore in read-only contexts.
        }
      },
    },
  });
}
