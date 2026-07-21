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

  return (data ?? []).map((row) => ({
    tahun_epid: row.tahun_epid ?? tahun,
    minggu_epid: row.minggu_epid ?? 0,
    wilayah_kerja: row.wilayah_kerja ?? '',
    jumlah_kapal: row.jumlah_kapal ?? 0,
    total_abk: row.total_abk ?? 0,
    total_abk_wna: row.total_abk_wna ?? 0,
    total_abk_wni: row.total_abk_wni ?? 0,
    ...(tabel === 'phqc'
      ? {
          total_penumpang: (row as { total_penumpang?: number | null }).total_penumpang ?? 0,
          total_penumpang_wna: (row as { total_penumpang_wna?: number | null }).total_penumpang_wna ?? 0,
          total_penumpang_wni: (row as { total_penumpang_wni?: number | null }).total_penumpang_wni ?? 0,
        }
      : {}),
  })) as RingkasanMingguanCop[] | RingkasanMingguanPhqc[];
}

// ============================================================
// RINGKASAN BULANAN (BARU)
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

  return (data ?? []).map((row) => ({
    tahun: row.tahun ?? tahun,
    bulan: row.bulan ?? 0,
    wilayah_kerja: row.wilayah_kerja ?? '',
    jumlah_kapal: row.jumlah_kapal ?? 0,
    total_abk: row.total_abk ?? 0,
    total_abk_wna: row.total_abk_wna ?? 0,
    total_abk_wni: row.total_abk_wni ?? 0,
    ...(tabel === 'phqc'
      ? {
          total_penumpang: (row as { total_penumpang?: number | null }).total_penumpang ?? 0,
          total_penumpang_wna: (row as { total_penumpang_wna?: number | null }).total_penumpang_wna ?? 0,
          total_penumpang_wni: (row as { total_penumpang_wni?: number | null }).total_penumpang_wni ?? 0,
        }
      : {}),
  })) as RingkasanBulananCop[] | RingkasanBulananPhqc[];
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

  return (data ?? []).map((row) => ({
    tahun: row.tahun ?? tahun,
    bulan: row.bulan ?? 0,
    arah: (row.arah ?? arah) as ArahPesawat,
    kota: row.kota ?? '',
    jumlah_penerbangan: row.jumlah_penerbangan ?? 0,
    total_penumpang: row.total_penumpang ?? 0,
  }));
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

  return (data ?? []).map((row) => ({
    ...row,
    wilayah_kerja: row.wilayah_kerja as Wilayah,
  })) as KegiatanCopEnriched[];
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

  return (data ?? []).map((row) => ({
    ...row,
    wilayah_kerja: row.wilayah_kerja as Wilayah,
  })) as KegiatanPhqcEnriched[];
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

  return (data ?? []).map((row) => ({
    tahun: row.tahun ?? tahun,
    bulan: row.bulan ?? 0,
    arah: (row.arah ?? arah) as ArahPesawat,
    maskapai: row.maskapai ?? '',
    jumlah_penerbangan: row.jumlah_penerbangan ?? 0,
    total_penumpang: row.total_penumpang ?? 0,
  }));
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

export interface LabTikusMingguan {
  minggu_epid: string;
  kode_wilker: string;
  diuji_lab: number;
  leptospira_positif: number;
  leptospira_negatif: number;
  pes_positif: number;
  pes_negatif: number;
  hantavirus_positif: number;
  hantavirus_negatif: number;
}

export async function getLabVektorTikusMingguan(
  tahun: number,
  kodeWilker?: string
): Promise<LabTikusMingguan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('vektor_tikus')
    .select('tgl_survei, minggu_epid, kode_wilker, uji_lab, hasil_leptospira, jumlah_positif_leptospira, hasil_pes, jumlah_positif_pes, hasil_hantavirus, jumlah_positif_hantavirus')
    .gte('tgl_survei', `${tahun}-01-01`)
    .lte('tgl_survei', `${tahun}-12-31`)
    .order('tgl_survei');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil data lab tikus mingguan: ${error.message}`);

  const kelompok = new Map<string, LabTikusMingguan>();

  (data ?? []).forEach((r) => {
    const key = `${r.minggu_epid ?? '—'}|${r.kode_wilker ?? '—'}`;
    if (!kelompok.has(key)) {
      kelompok.set(key, {
        minggu_epid: r.minggu_epid ?? '—',
        kode_wilker: r.kode_wilker ?? '—',
        diuji_lab: 0,
        leptospira_positif: 0,
        leptospira_negatif: 0,
        pes_positif: 0,
        pes_negatif: 0,
        hantavirus_positif: 0,
        hantavirus_negatif: 0,
      });
    }
    const g = kelompok.get(key)!;

    if (r.uji_lab === 'Ya') g.diuji_lab += 1;

    if (r.hasil_leptospira === 'Positif') g.leptospira_positif += Number(r.jumlah_positif_leptospira) || 0;
    else if (r.hasil_leptospira === 'Negatif') g.leptospira_negatif += 1;

    if (r.hasil_pes === 'Positif') g.pes_positif += Number(r.jumlah_positif_pes) || 0;
    else if (r.hasil_pes === 'Negatif') g.pes_negatif += 1;

    if (r.hasil_hantavirus === 'Positif') g.hantavirus_positif += Number(r.jumlah_positif_hantavirus) || 0;
    else if (r.hasil_hantavirus === 'Negatif') g.hantavirus_negatif += 1;
  });

  return Array.from(kelompok.values());
}

export interface LabTikusBulanan extends Omit<LabTikusMingguan, 'minggu_epid'> {
  bulan: number;
}

export async function getLabVektorTikusBulanan(
  tahun: number,
  kodeWilker?: string
): Promise<LabTikusBulanan[]> {
  const supabase = await createClient();
  let query = supabase
    .from('vektor_tikus')
    .select('tgl_survei, kode_wilker, uji_lab, hasil_leptospira, jumlah_positif_leptospira, hasil_pes, jumlah_positif_pes, hasil_hantavirus, jumlah_positif_hantavirus')
    .gte('tgl_survei', `${tahun}-01-01`)
    .lte('tgl_survei', `${tahun}-12-31`)
    .order('tgl_survei');

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil data lab tikus bulanan: ${error.message}`);

  const kelompok = new Map<string, LabTikusBulanan>();

  (data ?? []).forEach((r) => {
    const bulan = new Date(r.tgl_survei).getUTCMonth() + 1;
    const key = `${bulan}|${r.kode_wilker ?? '—'}`;
    if (!kelompok.has(key)) {
      kelompok.set(key, {
        bulan,
        kode_wilker: r.kode_wilker ?? '—',
        diuji_lab: 0,
        leptospira_positif: 0,
        leptospira_negatif: 0,
        pes_positif: 0,
        pes_negatif: 0,
        hantavirus_positif: 0,
        hantavirus_negatif: 0,
      });
    }
    const g = kelompok.get(key)!;

    if (r.uji_lab === 'Ya') g.diuji_lab += 1;

    if (r.hasil_leptospira === 'Positif') g.leptospira_positif += Number(r.jumlah_positif_leptospira) || 0;
    else if (r.hasil_leptospira === 'Negatif') g.leptospira_negatif += 1;

    if (r.hasil_pes === 'Positif') g.pes_positif += Number(r.jumlah_positif_pes) || 0;
    else if (r.hasil_pes === 'Negatif') g.pes_negatif += 1;

    if (r.hasil_hantavirus === 'Positif') g.hantavirus_positif += Number(r.jumlah_positif_hantavirus) || 0;
    else if (r.hasil_hantavirus === 'Negatif') g.hantavirus_negatif += 1;
  });

  return Array.from(kelompok.values());
}

export interface UjiLabTikus {
  periode: number; // minggu_epid atau bulan, tergantung fungsi
  kode_wilker: string;
  diuji_lab: number;
  leptospira_negatif: number;
  pes_negatif: number;
  hantavirus_negatif: number;
}

export async function getUjiLabVektorTikusMingguan(
  tahun: number,
  kodeWilker?: string
): Promise<UjiLabTikus[]> {
  const supabase = await createClient();
  let query = supabase
    .from('vektor_tikus')
    .select('tgl_survei, minggu_epid, kode_wilker, uji_lab, hasil_leptospira, hasil_pes, hasil_hantavirus')
    .gte('tgl_survei', `${tahun}-01-01`)
    .lte('tgl_survei', `${tahun}-12-31`);

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil data uji lab tikus mingguan: ${error.message}`);

  const kelompok = new Map<string, UjiLabTikus>();
  (data ?? []).forEach((r) => {
    const periode = Number(r.minggu_epid) || 0;
    const key = `${periode}|${r.kode_wilker ?? '—'}`;
    if (!kelompok.has(key)) {
      kelompok.set(key, {
        periode,
        kode_wilker: r.kode_wilker ?? '—',
        diuji_lab: 0,
        leptospira_negatif: 0,
        pes_negatif: 0,
        hantavirus_negatif: 0,
      });
    }
    const g = kelompok.get(key)!;
    if (r.uji_lab === 'Ya') g.diuji_lab += 1;
    if (r.hasil_leptospira === 'Negatif') g.leptospira_negatif += 1;
    if (r.hasil_pes === 'Negatif') g.pes_negatif += 1;
    if (r.hasil_hantavirus === 'Negatif') g.hantavirus_negatif += 1;
  });

  return Array.from(kelompok.values());
}

export async function getUjiLabVektorTikusBulanan(
  tahun: number,
  kodeWilker?: string
): Promise<UjiLabTikus[]> {
  const supabase = await createClient();
  let query = supabase
    .from('vektor_tikus')
    .select('tgl_survei, kode_wilker, uji_lab, hasil_leptospira, hasil_pes, hasil_hantavirus')
    .gte('tgl_survei', `${tahun}-01-01`)
    .lte('tgl_survei', `${tahun}-12-31`);

  if (kodeWilker) query = query.eq('kode_wilker', kodeWilker);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil data uji lab tikus bulanan: ${error.message}`);

  const kelompok = new Map<string, UjiLabTikus>();
  (data ?? []).forEach((r) => {
    const periode = new Date(r.tgl_survei).getUTCMonth() + 1;
    const key = `${periode}|${r.kode_wilker ?? '—'}`;
    if (!kelompok.has(key)) {
      kelompok.set(key, {
        periode,
        kode_wilker: r.kode_wilker ?? '—',
        diuji_lab: 0,
        leptospira_negatif: 0,
        pes_negatif: 0,
        hantavirus_negatif: 0,
      });
    }
    const g = kelompok.get(key)!;
    if (r.uji_lab === 'Ya') g.diuji_lab += 1;
    if (r.hasil_leptospira === 'Negatif') g.leptospira_negatif += 1;
    if (r.hasil_pes === 'Negatif') g.pes_negatif += 1;
    if (r.hasil_hantavirus === 'Negatif') g.hantavirus_negatif += 1;
  });

  return Array.from(kelompok.values());
}


// ================================================================
// BLOK TAMBAHAN FINAL — hapus SEMUA versi blok tambahan sebelumnya
// (dari komentar "Bentuk data yang diharapkan DonutChart..." dst)
// dan ganti dengan SELURUH isi di bawah ini, apa adanya.
// ================================================================

// Bentuk data yang diharapkan DonutChart.tsx existing kamu:
// { kategori: string; jumlah: number }
type DonutDatum = { kategori: string; jumlah: number };

const NAMA_BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

function labelBulanDariTanggal(tgl: string): { angka: number; label: string } {
  const d = new Date(tgl);
  const angka = d.getUTCMonth() + 1;
  const label = `${NAMA_BULAN_SINGKAT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return { angka, label };
}

// ----------------------------------------------------------------
// Tren Anopheles Dewasa
// ----------------------------------------------------------------
export async function getTrenAnophelesDewasa(
  tahun: number,
  wilker: string | undefined,
  granularitas: 'mingguan' | 'bulanan',
): Promise<Record<string, unknown>[]> {
  const supabase = await createClient();

  if (granularitas === 'mingguan') {
    let query = supabase
      .from('view_vektor_anopheles_mingguan')
      .select('*')
      .eq('tahun_epid', tahun)
      .eq('tipe_pengamatan', 'dewasa');

    if (wilker) query = query.eq('kode_wilker', wilker);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      minggu_epid: r.minggu_epid,
      mhd: r.mhd_rerata,
      mbr: r.mbr_rerata,
      suhu: r.suhu_rerata,
      kelembaban: r.kelembapan_rerata,
    }));
  }

  let query = supabase
    .from('vektor_anopheles')
    .select('tgl_survei, mhd, mbr, suhu_c, kelembapan_pct')
    .gte('tgl_survei', `${tahun}-01-01`)
    .lte('tgl_survei', `${tahun}-12-31`)
    .eq('tipe_pengamatan', 'dewasa');

  if (wilker) query = query.eq('kode_wilker', wilker);

  const { data, error } = await query;
  if (error) throw error;

  const perBulan = new Map<string, { total: Record<string, number>; n: number; urutan: number }>();
  for (const r of data ?? []) {
    if (!r.tgl_survei) continue;
    const { angka, label } = labelBulanDariTanggal(r.tgl_survei);
    const bucket =
      perBulan.get(label) ?? { total: { mhd: 0, mbr: 0, suhu: 0, kelembaban: 0 }, n: 0, urutan: angka };
    bucket.total.mhd += r.mhd ?? 0;
    bucket.total.mbr += r.mbr ?? 0;
    bucket.total.suhu += r.suhu_c ?? 0;
    bucket.total.kelembaban += r.kelembapan_pct ?? 0;
    bucket.n += 1;
    perBulan.set(label, bucket);
  }

  return Array.from(perBulan.entries())
    .sort((a, b) => a[1].urutan - b[1].urutan)
    .map(([label, b]) => ({
      bulanLabel: label,
      mhd: b.n ? b.total.mhd / b.n : 0,
      mbr: b.n ? b.total.mbr / b.n : 0,
      suhu: b.n ? b.total.suhu / b.n : 0,
      kelembaban: b.n ? b.total.kelembaban / b.n : 0,
    }));
}

// ----------------------------------------------------------------
// Metode Tangkap
// ----------------------------------------------------------------
export async function getMetodeTangkap(
  tahun: number,
  wilker: string | undefined,
): Promise<DonutDatum[]> {
  const supabase = await createClient();

  let query = supabase
    .from('vektor_anopheles')
    .select('metode_tangkap, jml_nyamuk, tgl_survei')
    .gte('tgl_survei', `${tahun}-01-01`)
    .lte('tgl_survei', `${tahun}-12-31`)
    .eq('tipe_pengamatan', 'dewasa');

  if (wilker) query = query.eq('kode_wilker', wilker);

  const { data, error } = await query;
  if (error) throw error;

  const totalPerMetode = new Map<string, number>();
  for (const row of data ?? []) {
    const kategori = row.metode_tangkap ?? 'Tidak diketahui';
    totalPerMetode.set(kategori, (totalPerMetode.get(kategori) ?? 0) + (row.jml_nyamuk ?? 0));
  }

  return Array.from(totalPerMetode.entries()).map(([kategori, jumlah]) => ({ kategori, jumlah }));
}

// ----------------------------------------------------------------
// Tren Larva
// ----------------------------------------------------------------
export async function getTrenLarva(
  tahun: number,
  wilker: string | undefined,
  granularitas: 'mingguan' | 'bulanan',
): Promise<Record<string, unknown>[]> {
  const supabase = await createClient();

  if (granularitas === 'mingguan') {
    let query = supabase
      .from('view_vektor_anopheles_mingguan')
      .select('*')
      .eq('tahun_epid', tahun)
      .eq('tipe_pengamatan', 'larva');

    if (wilker) query = query.eq('kode_wilker', wilker);

    const { data, error } = await query;
    if (error) throw error;

    const perMinggu = new Map<number, { cidukan: number; larva: number; suhuTotal: number; n: number }>();

    for (const r of data ?? []) {
  const minggu = r.minggu_epid;
  
  // 1. Validasi: Jika minggu bernilai null atau undefined, skip/lewati data ini
  if (minggu === null || minggu === undefined) continue;

  // Sekarang TypeScript tahu pasti bahwa 'minggu' di bawah ini adalah 100% 'number'
  const bucket = perMinggu.get(minggu) ?? { cidukan: 0, larva: 0, suhuTotal: 0, n: 0 };
  
  bucket.cidukan += r.total_cidukan ?? 0;
  bucket.larva += r.total_larva ?? 0;
  bucket.suhuTotal += r.suhu_rerata ?? 0;
  bucket.n += 1;
  
  perMinggu.set(minggu, bucket);
}

    return Array.from(perMinggu.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([minggu_epid, b]) => ({
        minggu_epid,
        cidukan: b.cidukan,
        larva: b.larva,
        suhu: b.n ? b.suhuTotal / b.n : 0,
      }));
  }

  let query = supabase
    .from('vektor_anopheles')
    .select('tgl_survei, jumlah_cidukan, jumlah_larva, suhu_c')
    .gte('tgl_survei', `${tahun}-01-01`)
    .lte('tgl_survei', `${tahun}-12-31`)
    .eq('tipe_pengamatan', 'larva');

  if (wilker) query = query.eq('kode_wilker', wilker);

  const { data, error } = await query;
  if (error) throw error;

  const perBulan = new Map<string, { total: Record<string, number>; n: number; urutan: number }>();
  for (const r of data ?? []) {
    if (!r.tgl_survei) continue;
    const { angka, label } = labelBulanDariTanggal(r.tgl_survei);
    const bucket = perBulan.get(label) ?? { total: { cidukan: 0, larva: 0, suhu: 0 }, n: 0, urutan: angka };
    bucket.total.cidukan += r.jumlah_cidukan ?? 0;
    bucket.total.larva += r.jumlah_larva ?? 0;
    bucket.total.suhu += r.suhu_c ?? 0;
    bucket.n += 1;
    perBulan.set(label, bucket);
  }

  return Array.from(perBulan.entries())
    .sort((a, b) => a[1].urutan - b[1].urutan)
    .map(([label, b]) => ({
      bulanLabel: label,
      cidukan: b.total.cidukan,
      larva: b.total.larva,
      suhu: b.n ? b.total.suhu / b.n : 0,
    }));
}

// ----------------------------------------------------------------
// "Macam" Tempat Perindukan (pakai spesies_larva) & Keadaan Tempat
// Perindukan
// ----------------------------------------------------------------
export async function getMacamTempatPerindukan(
  tahun: number,
  wilker: string | undefined,
): Promise<DonutDatum[]> {
  return getAggregateVektorAnopheles(tahun, wilker, 'spesies_larva');
}

export async function getKeadaanTempatPerindukan(
  tahun: number,
  wilker: string | undefined,
): Promise<DonutDatum[]> {
  return getAggregateVektorAnopheles(tahun, wilker, 'keadaan_tempat_perindukan');
}

async function getAggregateVektorAnopheles(
  tahun: number,
  wilker: string | undefined,
  kolom: 'spesies_larva' | 'keadaan_tempat_perindukan',
): Promise<DonutDatum[]> {
  const supabase = await createClient();

  let query = supabase
    .from('vektor_anopheles')
    .select(`${kolom}, tgl_survei`)
    .gte('tgl_survei', `${tahun}-01-01`)
    .lte('tgl_survei', `${tahun}-12-31`)
    .eq('tipe_pengamatan', 'larva');

  if (wilker) query = query.eq('kode_wilker', wilker);

  const { data, error } = await query;
  if (error) throw error;

  const hitung = new Map<string, number>();
  for (const row of (data ?? []) as Record<string, string | null>[]) {
    const kategori = row[kolom] ?? 'Tidak diketahui';
    hitung.set(kategori, (hitung.get(kategori) ?? 0) + 1);
  }

  return Array.from(hitung.entries()).map(([kategori, jumlah]) => ({ kategori, jumlah }));
}

// ----------------------------------------------------------------
// Hasil AI (prediksi/analisis)
// ----------------------------------------------------------------
export async function getHasilAI(
  konteks: string,
  periodeKey: string,
  jenis: 'prediksi' | 'analisis',
  wilayahKerja?: string,
): Promise<{ teks: string; diperbarui: string } | null> {
  const supabase = await createClient();

  let query = supabase
    .from('riwayat_analisis_ai')
    .select('ringkasan, rekomendasi, dibuat_pada')
    .eq('konteks', konteks)
    .eq('periode_key', periodeKey)
    .eq('tipe', jenis)
    .order('dibuat_pada', { ascending: false })
    .limit(1);

  if (wilayahKerja) query = query.eq('wilayah_kerja', wilayahKerja);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const teks = data.rekomendasi ? `${data.ringkasan}\n\nRekomendasi: ${data.rekomendasi}` : data.ringkasan;

  return { teks, diperbarui: data.dibuat_pada };
}

export async function getDaftarWilayahKerjaSanitasi(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('view_wilayah_kerja_sanitasi')
    .select('wilayah_kerja');

  if (error) throw new Error(`Gagal ambil daftar wilayah kerja sanitasi: ${error.message}`);
  return (data ?? []).map((r: any) => r.wilayah_kerja).filter(Boolean);
}

export async function getRingkasanTppBulanan(tahun: number, wilayahKerja?: string) {
  const supabase = await createClient();
  let query = (supabase as any).from('view_tpp_bulanan').select('*').eq('tahun', tahun).order('bulan');
  if (wilayahKerja) query = query.eq('wilayah_kerja', wilayahKerja);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan TPP: ${error.message}`);
  return (data ?? []) as any[];
}

export async function getRingkasanTtuBulanan(tahun: number, wilayahKerja?: string) {
  const supabase = await createClient();
  let query = (supabase as any).from('view_ttu_bulanan').select('*').eq('tahun', tahun).order('bulan');
  if (wilayahKerja) query = query.eq('wilayah_kerja', wilayahKerja);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan TTU: ${error.message}`);
  return (data ?? []) as any[];
}

export async function getRingkasanPabBulanan(tahun: number, wilayahKerja?: string) {
  const supabase = await createClient();
  let query = (supabase as any).from('view_pab_bulanan').select('*').eq('tahun', tahun).order('bulan');
  if (wilayahKerja) query = query.eq('wilayah_kerja', wilayahKerja);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan PAB: ${error.message}`);
  return (data ?? []) as any[];
}

// Tambahkan 3 fungsi ini SETELAH getRingkasanPabBulanan() yang sudah kamu
// punya (baik versi biasa maupun versi "as any" workaround, pola di bawah
// pakai "as any" supaya konsisten dengan workaround yang kamu pakai sebelumnya).

export async function getRingkasanTppMingguan(tahun: number, wilayahKerja?: string) {
  const supabase = await createClient();
  let query = (supabase as any).from('view_tpp_mingguan').select('*').eq('tahun', tahun).order('minggu');
  if (wilayahKerja) query = query.eq('wilayah_kerja', wilayahKerja);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan mingguan TPP: ${error.message}`);
  return (data ?? []) as any[];
}

export async function getRingkasanTtuMingguan(tahun: number, wilayahKerja?: string) {
  const supabase = await createClient();
  let query = (supabase as any).from('view_ttu_mingguan').select('*').eq('tahun', tahun).order('minggu');
  if (wilayahKerja) query = query.eq('wilayah_kerja', wilayahKerja);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan mingguan TTU: ${error.message}`);
  return (data ?? []) as any[];
}

export async function getRingkasanPabMingguan(tahun: number, wilayahKerja?: string) {
  const supabase = await createClient();
  let query = (supabase as any).from('view_pab_mingguan').select('*').eq('tahun', tahun).order('minggu');
  if (wilayahKerja) query = query.eq('wilayah_kerja', wilayahKerja);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil ringkasan mingguan PAB: ${error.message}`);
  return (data ?? []) as any[];
}