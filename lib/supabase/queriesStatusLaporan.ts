/**
 * lib/supabase/queriesStatusLaporan.ts
 *
 * Query untuk modul Status Kepatuhan Pelaporan (Mingguan & Bulanan).
 * Memanggil 2 fungsi SQL yang SUDAH dibuat & diuji manual di Supabase
 * SQL Editor (JANGAN dibuat ulang):
 *   - status_lapor_mingguan(p_tahun int, p_minggu int)
 *   - status_lapor_bulanan(p_tahun int, p_bulan int)
 *
 * Pola sama seperti file queriesVektorBreakdown.ts yang sudah ada:
 * setiap fungsi membuat client Supabase-nya sendiri lewat createClient(),
 * caller (page.tsx) tidak perlu passing client.
 */

import { createClient } from '@/lib/supabase/server';
import type { StatusLaporRow } from '@/lib/status-laporan/core';

export async function getStatusLaporMingguan(
  tahun: number,
  minggu: number,
): Promise<StatusLaporRow[]> {
  const supabase = await createClient();

  // NOTE: cast "as any" pada argumen RPC ini sengaja dipakai supaya tidak
  // error TypeScript SEBELUM types/database.types.ts di-generate ulang
  // (types lama belum kenal fungsi status_lapor_mingguan). Setelah jalankan
  // `supabase gen types typescript --linked > types/database.types.ts`,
  // cast ini boleh dihapus karena tipenya akan otomatis terdeteksi benar.
  const { data, error } = await supabase.rpc('status_lapor_mingguan', {
    p_tahun: tahun,
    p_minggu: minggu,
  } as any);

  if (error) {
    console.error('getStatusLaporMingguan error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
    });
    return [];
  }

  return (data ?? []) as StatusLaporRow[];
}

export async function getStatusLaporBulanan(
  tahun: number,
  bulan: number,
): Promise<StatusLaporRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('status_lapor_bulanan', {
    p_tahun: tahun,
    p_bulan: bulan,
  } as any);

  if (error) {
    console.error('getStatusLaporBulanan error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
    });
    return [];
 }

  return (data ?? []) as StatusLaporRow[];
}