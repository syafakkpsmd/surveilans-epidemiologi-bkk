import { createClient } from '@/lib/supabase/server';
import { getRentangMingguEpid } from '@/lib/supabase/queriesVektorBreakdown';
import { getWilkerRef } from '@/lib/supabase/queries';

export async function getTrenDiareMultiVariabel(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  kodeWilker?: string,
  mingguAwal?: number,
  mingguAkhir?: number
) {
  const supabase = await createClient();
  let q = supabase
    .from('view_vektor_diare_mingguan')
    .select('*')
    .eq('tahun_epid', tahun)
    .eq('jenis_kegiatan', jenis)
    .order('minggu_epid');

  if (kodeWilker) q = q.eq('kode_wilker', kodeWilker);

  if (mingguAwal) q = q.gte('minggu_epid', mingguAwal);
  if (mingguAkhir) q = q.lte('minggu_epid', mingguAkhir);

  const { data, error } = await q;
  if (error) throw error;
  if (!data) return [];

  if (kodeWilker) return data;

  const grouped = new Map<number, any[]>();
  for (const row of data) {
    if (row.minggu_epid == null) continue;
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
      insektisida_rerata: rata(rows, 'insektisida_rerata'),
      luas_area_rerata: rata(rows, 'luas_area_rerata'),
      jml_memenuhi_syarat: rows.reduce((s, r) => s + (r.jml_memenuhi_syarat ?? 0), 0),
      jml_tidak_memenuhi_syarat: rows.reduce((s, r) => s + (r.jml_tidak_memenuhi_syarat ?? 0), 0),
    }));
}

// Hasil pengamatan: BISA per wilker (bar chart) ATAU per minggu epid jika kodeWilker dipilih (line chart)
export async function getHasilPengamatanPerWilker(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  kodeWilker?: string
) {
  const supabase = await createClient();

  let q = supabase
    .from('view_vektor_diare_mingguan')
    .select('kode_wilker, minggu_epid, jml_memenuhi_syarat, jml_pengamatan')
    .eq('tahun_epid', tahun)
    .eq('jenis_kegiatan', jenis);

  if (kodeWilker) {
    q = q.eq('kode_wilker', kodeWilker);
  }

  const [resData, daftarWilker] = await Promise.all([
    q,
    getWilkerRef(),
  ]);

  if (resData.error) throw resData.error;
  const data = resData.data;
  if (!data || data.length === 0) return [];

  // Map Lookup untuk mendukung berbagai versi penamaan properti referensi Wilker
  const wilkerMap = new Map<string, string>();
  (daftarWilker ?? []).forEach((w: any) => {
    const kode = w.kode_wilker || w.kode || w.id;
    const nama = w.nama_wilker || w.nama_wilayah || w.nama;
    if (kode && nama) {
      wilkerMap.set(kode, nama);
    }
  });

  // ==========================================
  // MODE 1: SATU WILKER DIPILIH -> Tampilan Tren Mingguan (Mg-01, Mg-02)
  // ==========================================
  if (kodeWilker) {
    const perMinggu = new Map<number, { memenuhi: number; total: number }>();

    for (const r of data) {
      if (r.minggu_epid == null) continue;
      const cur = perMinggu.get(r.minggu_epid) ?? { memenuhi: 0, total: 0 };
      cur.memenuhi += r.jml_memenuhi_syarat ?? 0;
      cur.total += r.jml_pengamatan ?? 0;
      perMinggu.set(r.minggu_epid, cur);
    }

    return Array.from(perMinggu.entries())
      .sort(([a], [b]) => a - b)
      .map(([m, v]) => ({
        label: `Mg-${String(m).padStart(2, '0')}`,
        memenuhi: v.memenuhi,
        tidakMemenuhi: Math.max(v.total - v.memenuhi, 0),
      }));
  }

  // ==========================================
  // MODE 2: SEMUA WILKER -> Tampilkan Nama Wilker (Samarinda, APT Pranoto, dst.)
  // ==========================================
  const perWilker = new Map<string, { memenuhi: number; total: number }>();

  for (const r of data) {
    if (!r.kode_wilker) continue;
    const cur = perWilker.get(r.kode_wilker) ?? { memenuhi: 0, total: 0 };
    cur.memenuhi += r.jml_memenuhi_syarat ?? 0;
    cur.total += r.jml_pengamatan ?? 0;
    perWilker.set(r.kode_wilker, cur);
  }

  return Array.from(perWilker.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kWilker, v]) => ({
      label: wilkerMap.get(kWilker) || kWilker,
      memenuhi: v.memenuhi,
      tidakMemenuhi: Math.max(v.total - v.memenuhi, 0),
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

export async function getLokasiTidakMemenuhiSyarat(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  kodeWilker?: string,
) {
  const supabase = await createClient();
  let q = supabase
    .from('vektor_diare')
    .select('tgl_kegiatan, kode_wilker, lokasi, hasil_pengamatan, tindakan_pengendalian, insektisida_terpakai_ml, luas_area_semprot_m2')
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

export async function getHasilPengamatanBulanan(
  tahun: number,
  jenis: 'lalat' | 'kecoa',
  kodeWilker?: string
) {
  const supabase = await createClient();

  let q = supabase
    .from('view_vektor_diare_bulanan')
    .select('bulan, jml_memenuhi_syarat, jml_pengamatan')
    .eq('tahun', tahun)
    .eq('jenis_kegiatan', jenis)
    .order('bulan');

  if (kodeWilker) q = q.eq('kode_wilker', kodeWilker);

  const { data, error } = await q;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const perBulan = new Map<number, { memenuhi: number; total: number }>();

  for (const r of data) {
    if (r.bulan == null) continue;
    const cur = perBulan.get(r.bulan) ?? { memenuhi: 0, total: 0 };
    cur.memenuhi += r.jml_memenuhi_syarat ?? 0;
    cur.total += r.jml_pengamatan ?? 0;
    perBulan.set(r.bulan, cur);
  }

  return Array.from(perBulan.entries())
    .sort(([a], [b]) => a - b)
    .map(([b, v]) => ({
      label: NAMA_BULAN[b - 1], // Jan, Feb, Mar ...
      memenuhi: v.memenuhi,
      tidakMemenuhi: Math.max(v.total - v.memenuhi, 0),
    }));
}