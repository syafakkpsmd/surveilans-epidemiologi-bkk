/**
 * Supabase client untuk digunakan di CLIENT COMPONENT ('use client').
 *
 * JANGAN gunakan file ini di Server Component -- pakai
 * lib/supabase/server.ts untuk itu. Jangan mencampur keduanya dalam
 * satu file (sesuai ATURAN WAJIB #4 di KONTEKS PROYEK).
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}