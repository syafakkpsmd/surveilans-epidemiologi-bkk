// lib/db/tipe.ts
// Tipe klien data yang dipakai di seluruh aplikasi: hanya .from() dan .rpc(), di atas MariaDB.
//
// Bentuknya sengaja sama dengan klien supabase-js bertipe Database supaya hasil query (data[].kolom) tetap
// terketik seperti sebelumnya. Hanya IMPOR TIPE dari '@supabase/supabase-js' (hilang saat dikompilasi).
// Setelah titik terakhir yang memanggil Supabase langsung dimigrasi, ganti dengan tipe buatan sendiri
// lalu hapus paket @supabase/supabase-js.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export type DbKlien = Pick<SupabaseClient<Database>, 'from' | 'rpc'>;
