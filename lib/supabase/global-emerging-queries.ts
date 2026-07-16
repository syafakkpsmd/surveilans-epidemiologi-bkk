// lib/supabase/global-emerging-queries.ts
// Fungsi query untuk modul Penyakit Infeksi Emerging (Global Emerging).
// Dipanggil dari Server Component (app/(dashboard)/global-emerging/page.tsx).
// File berdiri sendiri — kalau mau, isinya bisa dipindah/digabung ke
// lib/supabase/queries.ts yang sudah ada.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FilterGlobalEmerging, RingkasanPenyakitEmerging, LaporanPenyakitEmerging } from '@/types/global-emerging.types';

/**
 * Ambil data ringkasan (sudah teragregasi) untuk grafik & breakdown,
 * dari view_mingguan_penyakit_emerging atau view_bulanan_penyakit_emerging
 * sesuai filter.jenis.
 */
export async function getRingkasanPenyakitEmerging(
  supabase: SupabaseClient,
  filter: FilterGlobalEmerging
): Promise<RingkasanPenyakitEmerging[]> {
  const namaView =
    filter.jenis === 'mingguan'
      ? 'view_mingguan_penyakit_emerging'
      : 'view_bulanan_penyakit_emerging';

  let query = supabase.from(namaView).select('*');

  if (filter.tahunEpid) {
    query = query.eq('tahun_epid', filter.tahunEpid);
  }
  if (filter.penyakit) {
    query = query.eq('penyakit', filter.penyakit);
  }
  if (filter.negara) {
    query = query.eq('negara', filter.negara);
  }

  const urutan = filter.jenis === 'mingguan' ? 'minggu_epid' : 'bulan';
  const { data, error } = await query.order(urutan, { ascending: true });

  if (error) {
    console.error('Gagal mengambil ringkasan penyakit emerging:', error.message);
    return [];
  }

  return (data ?? []) as RingkasanPenyakitEmerging[];
}

/**
 * Ambil data mentah (untuk tabel audit/verifikasi, bagian collapsible
 * di halaman). Dibatasi jumlahnya supaya tidak berat.
 */
export async function getDataMentahPenyakitEmerging(
  supabase: SupabaseClient,
  filter: FilterGlobalEmerging,
  limit = 200
): Promise<LaporanPenyakitEmerging[]> {
  let query = supabase
    .from('laporan_penyakit_emerging')
    .select('*')
    .eq('jenis_periode', filter.jenis);

  if (filter.tahunEpid) query = query.eq('tahun_epid', filter.tahunEpid);
  if (filter.penyakit) query = query.eq('penyakit', filter.penyakit);
  if (filter.negara) query = query.eq('negara', filter.negara);

  const { data, error } = await query
    .order('dibuat_pada', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Gagal mengambil data mentah penyakit emerging:', error.message);
    return [];
  }

  return (data ?? []) as LaporanPenyakitEmerging[];
}
