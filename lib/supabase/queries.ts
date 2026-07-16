/**
 * FUNGSI QUERY DASAR -- BUKAN KOMPONEN UI.
 *
 * Semua fungsi di sini dipanggil dari SERVER COMPONENT (async function
 * component di app/), karena pakai createClient() dari
 * lib/supabase/server.ts yang butuh cookies() (server-only).
 *
 * Aplikasi ini TIDAK PERNAH insert/update/delete data kegiatan --
 * hanya baca (SELECT) dari tabel/view yang sudah ada. Lihat
 * KONTEKS PROYEK bagian "SUMBER DATA & MODEL AKSES".
 */

import { createClient } from './server';
import type {
  RingkasanMingguanCop,
  RingkasanMingguanPhqc,
  RingkasanBulananCop,
  RingkasanBulananPhqc,
  KategoriBreakdownMingguanCop,
  KategoriBreakdownMingguanPhqc,
  KategoriBreakdownBulananCop,
  KategoriBreakdownBulananPhqc,
  KategoriCop,
  KategoriPhqc,
  KegiatanCopEnriched,
  KegiatanPhqcEnriched,
  Wilayah,
} from '@/types/database.types';

export type JenisTabel = 'cop' | 'phqc';

export async function getBuletin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('buletin')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    // Ubah log ini untuk melihat detail error sebenarnya
    console.error("DEBUG SUPABASE ERROR:", JSON.stringify(error, null, 2));
    return [];
  }
  
  return data || [];
}

// ============================================================
// RINGKASAN MINGGUAN
// ============================================================

export async function getRingkasanMingguan(
  tabel: 'cop',
  tahun: number
): Promise<RingkasanMingguanCop[]>;
export async function getRingkasanMingguan(
  tabel: 'phqc',
  tahun: number
): Promise<RingkasanMingguanPhqc[]>;
export async function getRingkasanMingguan(
  tabel: JenisTabel,
  tahun: number
): Promise<RingkasanMingguanCop[] | RingkasanMingguanPhqc[]> {
  const supabase = await createClient();
  const view = tabel === 'cop' ? 'view_mingguan_ringkasan' : 'view_mingguan_ringkasan_phqc';

  const { data, error } = await supabase
    .from(view)
    .select('*')
    .eq('tahun_epid', tahun)
    .order('minggu_epid', { ascending: true });

  if (error) {
    throw new Error(`Gagal mengambil ringkasan mingguan (${tabel}): ${error.message}`);
  }

  return data ?? [];
}

// ============================================================
// RINGKASAN BULANAN
// ============================================================

export async function getRingkasanBulanan(
  tabel: 'cop',
  tahun: number
): Promise<RingkasanBulananCop[]>;
export async function getRingkasanBulanan(
  tabel: 'phqc',
  tahun: number
): Promise<RingkasanBulananPhqc[]>;
export async function getRingkasanBulanan(
  tabel: JenisTabel,
  tahun: number
): Promise<RingkasanBulananCop[] | RingkasanBulananPhqc[]> {
  const supabase = await createClient();
  const view = tabel === 'cop' ? 'view_bulanan_ringkasan' : 'view_bulanan_ringkasan_phqc';

  const { data, error } = await supabase
    .from(view)
    .select('*')
    .eq('tahun', tahun)
    .order('bulan', { ascending: true });

  if (error) {
    throw new Error(`Gagal mengambil ringkasan bulanan (${tabel}): ${error.message}`);
  }

  return data ?? [];
}

// ============================================================
// BREAKDOWN KATEGORI (mingguan & bulanan)
// ============================================================

export interface FilterKategoriMingguan<K extends string = string> {
  tahun_epid: number;
  minggu_epid?: number;
  wilayah_kerja?: Wilayah;
  kategori?: K;
}

export interface FilterKategoriBulanan<K extends string = string> {
  tahun: number;
  bulan?: number;
  wilayah_kerja?: Wilayah;
  kategori?: K;
}

export type ArahPesawat = 'kedatangan' | 'keberangkatan';

export interface KotaPesawatBulanan {
  tahun: number;
  bulan: number;
  arah: ArahPesawat;
  kota: string;
  jumlah_penerbangan: number;
  total_penumpang: number;
}

export async function getKotaPesawatBulanan(
  tahun: number,
  arah: ArahPesawat
): Promise<KotaPesawatBulanan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('view_pesawat_kota_bulanan')
    .select('*')
    .eq('tahun', tahun)
    .eq('arah', arah)
    .order('bulan');

  if (error) throw new Error(`Gagal ambil data kota pesawat: ${error.message}`);
  return data ?? [];
}
// Kategori yang valid berbeda untuk COP (negara_kedatangan, rba,
// faktor_risiko, kelengkapan_dokumen, daerah_terjangkit,
// keberadaan_vektor, bendera_kapal) vs PHQC (bendera, rba,
// tujuan_berlayar, pelabuhan_kedatangan, pelabuhan_tujuan) -- lihat
// UNION ALL di masing-masing view SQL. Overload di bawah memastikan
// TypeScript menolak nilai `kategori` yang tidak ada di tabel terkait.

export async function getKategoriBreakdown(
  tabel: 'cop',
  periode: 'mingguan',
  filter: FilterKategoriMingguan<KategoriCop>
): Promise<KategoriBreakdownMingguanCop[]>;
export async function getKategoriBreakdown(
  tabel: 'phqc',
  periode: 'mingguan',
  filter: FilterKategoriMingguan<KategoriPhqc>
): Promise<KategoriBreakdownMingguanPhqc[]>;
export async function getKategoriBreakdown(
  tabel: 'cop',
  periode: 'bulanan',
  filter: FilterKategoriBulanan<KategoriCop>
): Promise<KategoriBreakdownBulananCop[]>;
export async function getKategoriBreakdown(
  tabel: 'phqc',
  periode: 'bulanan',
  filter: FilterKategoriBulanan<KategoriPhqc>
): Promise<KategoriBreakdownBulananPhqc[]>;
export async function getKategoriBreakdown(
  tabel: JenisTabel,
  periode: 'mingguan' | 'bulanan',
  filter: FilterKategoriMingguan | FilterKategoriBulanan
): Promise<
  | KategoriBreakdownMingguanCop[]
  | KategoriBreakdownMingguanPhqc[]
  | KategoriBreakdownBulananCop[]
  | KategoriBreakdownBulananPhqc[]
> {
  const supabase = await createClient();

  const view =
    periode === 'mingguan'
      ? tabel === 'cop'
        ? 'view_mingguan_kategori'
        : 'view_mingguan_kategori_phqc'
      : tabel === 'cop'
        ? 'view_bulanan_kategori'
        : 'view_bulanan_kategori_phqc';

  // Implementasi internal sengaja pakai `any` di query builder: `view`
  // adalah union dari 4 nama view berbeda, jadi TypeScript tidak bisa
  // menyimpulkan kolom mana yang valid untuk .eq() tanpa narrowing per
  // cabang. Keamanan tipe untuk PEMANGGIL tetap terjaga penuh lewat
  // overload getKategoriBreakdown() di atas (tabel+periode+filter
  // sudah dipasangkan dengan benar sebelum sampai ke sini).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `view` adalah union dari 4 nama view berbeda; lihat komentar di atas.
  let query = (supabase.from(view) as any).select('*');

  if (periode === 'mingguan') {
    const f = filter as FilterKategoriMingguan;
    query = query.eq('tahun_epid', f.tahun_epid);
    if (f.minggu_epid !== undefined) query = query.eq('minggu_epid', f.minggu_epid);
    if (f.wilayah_kerja) query = query.eq('wilayah_kerja', f.wilayah_kerja);
    if (f.kategori) query = query.eq('kategori', f.kategori);
  } else {
    const f = filter as FilterKategoriBulanan;
    query = query.eq('tahun', f.tahun);
    if (f.bulan !== undefined) query = query.eq('bulan', f.bulan);
    if (f.wilayah_kerja) query = query.eq('wilayah_kerja', f.wilayah_kerja);
    if (f.kategori) query = query.eq('kategori', f.kategori);
  }

  query = query.order('jumlah', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Gagal mengambil breakdown kategori (${tabel}/${periode}): ${error.message}`);
  }

  return (data ?? []) as
    | KategoriBreakdownMingguanCop[]
    | KategoriBreakdownMingguanPhqc[]
    | KategoriBreakdownBulananCop[]
    | KategoriBreakdownBulananPhqc[];
}

// ============================================================
// DATA KEGIATAN ENRICHED (dipakai untuk tabel detail / daftar kapal)
// ============================================================

export interface FilterKegiatan {
  wilayah_kerja?: Wilayah;
  tahun_epid?: number;
  minggu_epid?: number;
  rba?: 'Hijau' | 'Kuning' | 'Merah';
  limit?: number;
}

export async function getKegiatanCopEnriched(
  filter: FilterKegiatan = {}
): Promise<KegiatanCopEnriched[]> {
  const supabase = await createClient();
  let query = supabase.from('view_kegiatan_cop_enriched').select('*');

  if (filter.wilayah_kerja) query = query.eq('wilayah_kerja', filter.wilayah_kerja);
  if (filter.tahun_epid !== undefined) query = query.eq('tahun_epid', filter.tahun_epid);
  if (filter.minggu_epid !== undefined) query = query.eq('minggu_epid', filter.minggu_epid);
  if (filter.rba) query = query.eq('rba', filter.rba);

  query = query.order('tgl_kedatangan', { ascending: false });
  if (filter.limit) query = query.limit(filter.limit);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Gagal mengambil data kegiatan COP: ${error.message}`);
  }

  return data ?? [];
}

export async function getKegiatanPhqcEnriched(
  filter: FilterKegiatan = {}
): Promise<KegiatanPhqcEnriched[]> {
  const supabase = await createClient();
  let query = supabase.from('view_kegiatan_phqc_enriched').select('*');

  if (filter.wilayah_kerja) query = query.eq('wilayah_kerja', filter.wilayah_kerja);
  if (filter.tahun_epid !== undefined) query = query.eq('tahun_epid', filter.tahun_epid);
  if (filter.minggu_epid !== undefined) query = query.eq('minggu_epid', filter.minggu_epid);
  if (filter.rba) query = query.eq('rba', filter.rba);

  query = query.order('tgl_keberangkatan', { ascending: false });
  if (filter.limit) query = query.limit(filter.limit);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Gagal mengambil data kegiatan PHQC: ${error.message}`);
  }

  return data ?? [];
}

// ================================================================
// SEGMEN 10 — Tambahan lib/supabase/queries.ts
// Tempel fungsi-fungsi ini ke bawah fungsi yang sudah ada
// (getRingkasanMingguan, getKategoriBreakdown, dll). Pakai server
// client yang sama (createClient dari './server').
// ================================================================

import type {
  RingkasanVektorDbdMingguan,
  RingkasanVektorTikusMingguan,
  RingkasanVektorAnophelesMingguan,
  RingkasanVektorDiareMingguan,
  RingkasanMalariaMingguan,
  RingkasanTbMingguan,
  RingkasanHivMingguan,
  WilkerRef,
} from '@/types/database.types';

// ── Referensi wilker (7 wilker, termasuk Bandara APT Pranoto) ──
export async function getWilkerRef(): Promise<WilkerRef[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('wilker_ref')
    .select('*')
    .order('kode');

  if (error) throw new Error(`Gagal ambil wilker_ref: ${error.message}`);
  return data ?? [];
}

// ── Vektor DBD (Aedes) ──
export async function getRingkasanVektorDbd(
  tahun: number,
  kodeWilker?: string
): Promise<RingkasanVektorDbdMingguan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('view_vektor_dbd_mingguan')
    .select('*')
    .eq('tahun_epid', tahun)
    .order('minggu_epid');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan DBD: ${error.message}`);
  return data ?? [];
}

// ── Vektor Tikus ──
export async function getRingkasanVektorTikus(
  tahun: number,
  kodeWilker?: string
): Promise<RingkasanVektorTikusMingguan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('view_vektor_tikus_mingguan')
    .select('*')
    .eq('tahun_epid', tahun)
    .order('minggu_epid');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan Tikus: ${error.message}`);
  return data ?? [];
}

// ── Vektor Anopheles — WAJIB filter tipe_pengamatan (dewasa/larva) ──
export async function getRingkasanVektorAnopheles(
  tahun: number,
  tipePengamatan: 'dewasa' | 'larva',
  kodeWilker?: string
): Promise<RingkasanVektorAnophelesMingguan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('view_vektor_anopheles_mingguan')
    .select('*')
    .eq('tahun_epid', tahun)
    .eq('tipe_pengamatan', tipePengamatan)
    .order('minggu_epid');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan Anopheles: ${error.message}`);
  return data ?? [];
}

// ── Vektor Diare — WAJIB filter jenis_kegiatan (lalat/kecoa) ──
export async function getRingkasanVektorDiare(
  tahun: number,
  jenisKegiatan: 'lalat' | 'kecoa',
  kodeWilker?: string
): Promise<RingkasanVektorDiareMingguan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('view_vektor_diare_mingguan')
    .select('*')
    .eq('tahun_epid', tahun)
    .eq('jenis_kegiatan', jenisKegiatan)
    .order('minggu_epid');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan Diare: ${error.message}`);
  return data ?? [];
}

// ── Migrasi Malaria ──
export async function getRingkasanMalaria(
  tahun: number,
  kodeWilker?: string
): Promise<RingkasanMalariaMingguan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('view_malaria_mingguan')
    .select('*')
    .eq('tahun_epid', tahun)
    .order('minggu_epid');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan Malaria: ${error.message}`);
  return data ?? [];
}

// ── Surveilans TB ──
export async function getRingkasanTb(
  tahun: number,
  kodeWilker?: string
): Promise<RingkasanTbMingguan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('view_tb_mingguan')
    .select('*')
    .eq('tahun_epid', tahun)
    .order('minggu_epid');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan TB: ${error.message}`);
  return data ?? [];
}

// ── Surveilans HIV ──
export async function getRingkasanHiv(
  tahun: number,
  kodeWilker?: string
): Promise<RingkasanHivMingguan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('view_hiv_mingguan')
    .select('*')
    .eq('tahun_epid', tahun)
    .order('minggu_epid');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan HIV: ${error.message}`);
  return data ?? [];
}

export interface MaskapaiPesawatBulanan {
  tahun: number;
  bulan: number;
  arah: ArahPesawat;
  maskapai: string;
  jumlah_penerbangan: number;
  total_penumpang: number;
}

export async function getMaskapaiPesawatBulanan(
  tahun: number,
  arah: ArahPesawat
): Promise<MaskapaiPesawatBulanan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('view_pesawat_maskapai_bulanan')
    .select('*')
    .eq('tahun', tahun)
    .eq('arah', arah)
    .order('bulan');

  if (error) throw new Error(`Gagal ambil data maskapai pesawat: ${error.message}`);
  return data ?? [];
}

export async function getRingkasanVektorTikusBulanan(
  tahun: number,
  kodeWilker?: string
) {
  const supabase = await createClient();
  let query = supabase
    .from('view_vektor_tikus_bulanan')
    .select('*')
    .eq('tahun', tahun)
    .order('bulan');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan bulanan Tikus: ${error.message}`);
  return data ?? [];
}
