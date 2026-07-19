import { createClient } from '@/lib/supabase/server';
import { getRentangMingguEpid } from '@/lib/supabase/queriesVektorBreakdown';

export async function getTrenDiareMultiVariabel(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  kodeWilker?: string,
) {
  const supabase = await createClient();
  let q = supabase
    .from('view_vektor_diare_mingguan') // ⚠️ ASUMSI nama view
    .select('*')
    .eq('tahun_epid', tahun)
    .eq('jenis_kegiatan', jenis)
    .order('minggu_epid');

  if (kodeWilker) q = q.eq('kode_wilker', kodeWilker);
  const { data, error } = await q;
  if (error) throw error;
  if (!data) return [];

  if (kodeWilker) return data;

  // agregasi rata-rata lintas wilker per minggu saat "Semua Wilker"
const grouped = new Map<number, any[]>();
for (const row of data) {
  if (row.minggu_epid == null) continue; // lewati baris tanpa minggu_epid
  if (!grouped.has(row.minggu_epid)) grouped.set(row.minggu_epid, []);
  grouped.get(row.minggu_epid)!.push(row);
}
  const rata = (rows: any[], key: string) =>
    rows.reduce((s, r) => s + (r[key] ?? 0), 0) / rows.length;

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([minggu_epid, rows]) => ({
      minggu_epid,
      fly_index_rerata: rata(rows, 'fly_index_rerata'),
      kepadatan_kecoa_rerata: rata(rows, 'kepadatan_kecoa_rerata'),
      suhu_rerata: rata(rows, 'suhu_rerata'),
      kelembapan_rerata: rata(rows, 'kelembapan_rerata'),
      curah_hujan_rerata: rata(rows, 'curah_hujan_rerata'),
      insektisida_rerata: rata(rows, 'insektisida_rerata'),   // sebelumnya salah nama: jumlah_insektisida_rerata
      luas_area_rerata: rata(rows, 'luas_area_rerata'),
      jml_memenuhi_syarat: rows.reduce((s, r) => s + (r.jml_memenuhi_syarat ?? 0), 0),
      jml_tidak_memenuhi_syarat: rows.reduce((s, r) => s + (r.jml_tidak_memenuhi_syarat ?? 0), 0),
    }));
}

// Hasil pengamatan per wilker (semua wilker sekaligus, untuk grafik batang berkelompok)
export async function getHasilPengamatanPerWilker(tahun: number, jenis: 'lalat' | 'kecoa') {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('view_vektor_diare_mingguan')
    .select('kode_wilker, jml_memenuhi_syarat, jml_pengamatan')
    .eq('tahun_epid', tahun)
    .eq('jenis_kegiatan', jenis);
  if (error) throw error;

  const perWilker = new Map<string, { memenuhi: number; total: number }>();
  for (const r of data ?? []) {
    if (!r.kode_wilker) continue;
    const cur = perWilker.get(r.kode_wilker) ?? { memenuhi: 0, total: 0 };
    cur.memenuhi += r.jml_memenuhi_syarat ?? 0;
    cur.total += r.jml_pengamatan ?? 0;
    perWilker.set(r.kode_wilker, cur);
  }
  return Array.from(perWilker.entries())
    .sort(([a], [b]) => a.localeCompare(b))   // <-- tambahan ini
    .map(([kode_wilker, v]) => ({
      kode_wilker,
      memenuhi_syarat: v.memenuhi,
      tidak_memenuhi_syarat: Math.max(v.total - v.memenuhi, 0),
    }));
}

const NAMA_BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export async function getTrenDiareBulanan(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  kodeWilker?: string,
) {
  const supabase = await createClient();
  let q = supabase
    .from('view_vektor_diare_bulanan')
    .select('*')
    .eq('tahun', tahun)
    .eq('jenis_kegiatan', jenis)
    .order('bulan');
  if (kodeWilker) q = q.eq('kode_wilker', kodeWilker);

  const { data, error } = await q;
  if (error) throw error;
  if (!data) return [];

  if (kodeWilker) {
    return data.map((r) => ({ ...r, bulanLabel: NAMA_BULAN[(r.bulan ?? 1) - 1] }));
  }

  const perBulan = new Map<number, any[]>();
  for (const row of data) {
    if (row.bulan == null) continue;
    if (!perBulan.has(row.bulan)) perBulan.set(row.bulan, []);
    perBulan.get(row.bulan)!.push(row);
  }
  const rata = (rows: any[], key: string) => rows.reduce((s, r) => s + (r[key] ?? 0), 0) / rows.length;
  const jumlah = (rows: any[], key: string) => rows.reduce((s, r) => s + (r[key] ?? 0), 0);

  return Array.from(perBulan.entries())
    .sort(([a], [b]) => a - b)
    .map(([bulan, rows]) => ({
      bulanLabel: NAMA_BULAN[bulan - 1],
      fly_index_rerata: rata(rows, 'fly_index_rerata'),
      kepadatan_kecoa_rerata: rata(rows, 'kepadatan_kecoa_rerata'),
      suhu_rerata: rata(rows, 'suhu_rerata'),
      kelembapan_rerata: rata(rows, 'kelembapan_rerata'),
      curah_hujan_rerata: rata(rows, 'curah_hujan_rerata'),
      insektisida_rerata: rata(rows, 'insektisida_rerata'),
      luas_area_rerata: rata(rows, 'luas_area_rerata'),
      jml_memenuhi_syarat: jumlah(rows, 'jml_memenuhi_syarat'),
      jml_pengamatan: jumlah(rows, 'jml_pengamatan'),
    }));
}

// tambahan di queriesVektorDiareEnhanced.ts
export async function getLokasiTidakMemenuhiSyarat(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  kodeWilker?: string,
) {
  const supabase = await createClient();
  let q = supabase
    .from('vektor_diare')
    .select('tgl_kegiatan, kode_wilker, lokasi, hasil_pengamatan, tindakan_pengendalian')
    .eq('jenis_kegiatan', jenis)
    .eq('hasil_pengamatan', 'Tidak Memenuhi Syarat')
    .gte('tgl_kegiatan', `${tahun}-01-01`)
    .lte('tgl_kegiatan', `${tahun}-12-31`)
    .order('tgl_kegiatan', { ascending: false });
  if (kodeWilker) q = q.eq('kode_wilker', kodeWilker);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}