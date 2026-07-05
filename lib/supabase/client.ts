import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk dipakai di Client Component ('use client').
 * Dipanggil sebagai fungsi (bukan singleton di top-level module) supaya
 * aman dipanggil ulang tanpa membocorkan state antar request/komponen.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
