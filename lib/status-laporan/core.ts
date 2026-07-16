/**
 * lib/status-laporan/core.ts
 *
 * Logic murni untuk modul Status Kepatuhan Pelaporan (Mingguan & Bulanan).
 * Tidak bergantung pada Supabase client / Next.js apa pun -- aman dites
 * terpisah dan aman ditempel langsung ke project tanpa menyentuh file lain.
 *
 * Sumber data mentah (hasil .rpc()) mengikuti kontrak fungsi SQL yang
 * SUDAH dibuat & diuji manual di Supabase:
 *   status_lapor_mingguan(p_tahun int, p_minggu int)
 *     -> { kode_wilker: string, kegiatan: 'COP'|'PHQC'|'Pesawat', jumlah: number }[]
 *   status_lapor_bulanan(p_tahun int, p_bulan int)
 *     -> { kode_wilker: string, kegiatan: 'DBD'|'Tikus'|'Anoph'|'Malaria'|'TB'|'HIV'|'Diare', jumlah: number }[]
 */

export type StatusLaporRow = {
  kode_wilker: string;
  kegiatan: string;
  jumlah: number;
};

/** Daftar 7 wilker yang dipakai modul ini -- SENGAJA eksplisit (bukan
 * query wilker_ref tanpa filter), supaya WK08/WK09 (yang ada di
 * wilker_ref tapi tidak relevan untuk surveilans) tidak pernah ikut
 * muncul di sini walau nanti wilker_ref bertambah baris lagi. */
export const DAFTAR_WILKER = [
  { kode: 'WK01', nama: 'Pelabuhan Samarinda', jenis: 'Pelabuhan' as const },
  { kode: 'WK02', nama: 'Pelabuhan Tanjung Santan', jenis: 'Pelabuhan' as const },
  { kode: 'WK03', nama: 'Pelabuhan Tanjung Laut', jenis: 'Pelabuhan' as const },
  { kode: 'WK04', nama: 'Pelabuhan Lhoktuan', jenis: 'Pelabuhan' as const },
  { kode: 'WK05', nama: 'Pelabuhan Sangatta', jenis: 'Pelabuhan' as const },
  { kode: 'WK06', nama: 'Pelabuhan Sangkulirang', jenis: 'Pelabuhan' as const },
  { kode: 'WK07', nama: 'Bandara APT Pranoto', jenis: 'Bandara' as const },
] as const;

export type KodeWilker = (typeof DAFTAR_WILKER)[number]['kode'];

/** Kegiatan bulanan, urutan ini juga dipakai sebagai urutan kolom tabel. */
export const KEGIATAN_BULANAN = [
  'DBD',
  'Tikus',
  'Anoph',
  'Malaria',
  'TB',
  'HIV',
  'Diare',
] as const;
export type KegiatanBulanan = (typeof KEGIATAN_BULANAN)[number];

/** 'na' = non-aplikatif (bukan kewajiban wilker ini, tampil silang/abu-abu,
 * JANGAN dihitung sebagai "Belum"). */
export type SelStatus = 'sudah' | 'belum' | 'na';

export type BarisMatriksMingguan = {
  kode: string;
  nama: string;
  jenis: 'Pelabuhan' | 'Bandara';
  cop: SelStatus;
  phqc: SelStatus;
  pesawat: SelStatus;
};

export type BarisMatriksBulanan = {
  kode: string;
  nama: string;
  status: Record<KegiatanBulanan, SelStatus>;
  kelengkapanPct: number;
};

/** Susun Set<kegiatan-yang-jumlahnya>0> per kode_wilker dari hasil RPC. */
function kelompokkanPerWilker(rows: StatusLaporRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!map.has(r.kode_wilker)) map.set(r.kode_wilker, new Set());
    if (r.jumlah > 0) map.get(r.kode_wilker)!.add(r.kegiatan);
  }
  return map;
}

/**
 * Ubah hasil mentah status_lapor_mingguan() jadi 7 baris matriks siap-render.
 * Sel yang bukan kewajiban wilker (mis. kolom Pesawat untuk wilker Pelabuhan)
 * SELALU 'na', tidak pernah 'belum' -- sesuai ATURAN CAKUPAN #1 Segmen 14.
 */
export function buildMatriksMingguan(rows: StatusLaporRow[]): BarisMatriksMingguan[] {
  const perWilker = kelompokkanPerWilker(rows);

  return DAFTAR_WILKER.map((w) => {
    const set = perWilker.get(w.kode) ?? new Set<string>();
    const isBandara = w.jenis === 'Bandara';

    return {
      kode: w.kode,
      nama: w.nama,
      jenis: w.jenis,
      cop: isBandara ? 'na' : set.has('COP') ? 'sudah' : 'belum',
      phqc: isBandara ? 'na' : set.has('PHQC') ? 'sudah' : 'belum',
      pesawat: !isBandara ? 'na' : set.has('Pesawat') ? 'sudah' : 'belum',
    };
  });
}

/**
 * Ubah hasil mentah status_lapor_bulanan() jadi 7 baris matriks siap-render.
 * Semua 7 wilker punya 7 kolom yang sama (tidak ada sel 'na' di sini,
 * sesuai ATURAN CAKUPAN #2 Segmen 14).
 */
export function buildMatriksBulanan(rows: StatusLaporRow[]): BarisMatriksBulanan[] {
  const perWilker = kelompokkanPerWilker(rows);

  return DAFTAR_WILKER.map((w) => {
    const set = perWilker.get(w.kode) ?? new Set<string>();
    const status = {} as Record<KegiatanBulanan, SelStatus>;
    let jumlahSudah = 0;

    for (const kegiatan of KEGIATAN_BULANAN) {
      const s: SelStatus = set.has(kegiatan) ? 'sudah' : 'belum';
      status[kegiatan] = s;
      if (s === 'sudah') jumlahSudah += 1;
    }

    return {
      kode: w.kode,
      nama: w.nama,
      status,
      kelengkapanPct: Math.round((jumlahSudah / KEGIATAN_BULANAN.length) * 100),
    };
  });
}

/**
 * Nilai default tahun+minggu epidemiologi untuk PICKER SAJA (bukan untuk
 * query aktual -- query aktual selalu lewat mmwr_week() di database via
 * fungsi status_lapor_mingguan). Perhitungan di sini sengaja sederhana
 * (Minggu sebagai awal minggu, standar MMWR) hanya supaya halaman punya
 * nilai awal yang masuk akal saat pertama dibuka; begitu user pilih
 * minggu lain lewat picker, nilai ini tidak dipakai lagi.
 */
export function perkiraanMingguEpidSaatIni(sekarang: Date = new Date()): {
  tahun: number;
  minggu: number;
} {
  const tahun = sekarang.getFullYear();
  const awalTahun = new Date(tahun, 0, 1);
  // Mundurkan ke hari Minggu terdekat (standar MMWR: minggu mulai hari Minggu)
  const awalMingguPertama = new Date(awalTahun);
  awalMingguPertama.setDate(awalTahun.getDate() - awalTahun.getDay());

  const selisihHari = Math.floor(
    (sekarang.getTime() - awalMingguPertama.getTime()) / (1000 * 60 * 60 * 24),
  );
  const minggu = Math.floor(selisihHari / 7) + 1;

  return { tahun, minggu };
}