import 'server-only';

/**
 * PERINGATAN KERAS: client ini pakai SUPABASE_SERVICE_ROLE_KEY, yang
 * MELEWATI SEMUA RLS. JANGAN PERNAH:
 *   - Mengimpor file ini dari Client Component ('use client') atau
 *     komponen apa pun yang bisa ikut ke-bundle ke browser.
 *   - Mengirim hasil query lewat client ini langsung ke response
 *     tanpa disaring -- terutama untuk tabel `pengaturan_ai` yang
 *     berisi `api_key`.
 *
 * HANYA dipakai dari Route Handler (app/api/.../route.ts) yang
 * memang butuh membaca tabel dengan RLS tertutup untuk semua role
 * (mis. `pengaturan_ai`). Baris `import 'server-only'` di atas akan
 * membuat build GAGAL kalau file ini tidak sengaja ter-import ke
 * kode client.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` HARUS diisi di .env.local (lihat
 * .env.local.example) dan JANGAN PERNAH diberi prefix NEXT_PUBLIC_.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_URL belum diisi di .env.local.'
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      // Client ini tidak mewakili user mana pun -- jangan simpan/refresh sesi.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
