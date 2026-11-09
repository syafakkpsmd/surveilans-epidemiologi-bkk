// lib/wilayah-kerja/index.ts
// Bagian MURNI modul wilayah kerja (tanpa impor database, aman dipakai komponen 'use client').
//
// SUMBER DATA = tabel `wilker_ref` di database (dikelola admin lewat /dashboard/pengaturan-wilayah-kerja).
// Cara pakai:
//   * Kode server (halaman, server action, route API):
//       import { getKamusWilker } from '@/lib/wilayah-kerja/server';
//       const wk = await getKamusWilker();           // wk.aktif, wk.kodeDariTeks(...), wk.namaDariKode(...)
//   * Komponen 'use client': terima `wilayah` lewat props dari server, lalu
//       const wk = useMemo(() => buatKamus(wilayah), [wilayah]);
//
// Kunci baku = `kode` (mis. WK01). Nama lain hanyalah bentuk tampilan dari kode yang sama:
//   nama       : nama resmi panjang   ("Pelabuhan Tanjung Santan", "Bandara APT Pranoto")
//   namaPendek : nama pendek di data  ("Tanjung Santan", "APT Pranoto")
//   namaPeta   : label di modul peta
//

export type JenisWilker = 'Pelabuhan' | 'Bandara' | 'Kantor';
export const DAFTAR_JENIS_WILKER: readonly JenisWilker[] = ['Pelabuhan', 'Bandara', 'Kantor'];
export type KodeWilker = string;

export interface Wilayah {
  kode: KodeWilker;
  nama: string;
  namaPendek: string;
  namaPeta: string;
  jenis: JenisWilker;
  urutan: number;
  aktif: boolean;
  lat: number | null;
  lng: number | null;
  /** Pusat tampilan di Peta Wilayah Kerja (kosong = pakai lat/lng) dan tingkat zoom saat wilayah dipilih. */
  petaLat: number | null;
  petaLng: number | null;
  zoom: number;
  subLokasi: string[];
  /** Unit pelapor SKDR (mis. Puskesmas) yang SEMUANYA harus melapor agar wilayah dianggap "Sudah"; kosong = cukup 1 laporan. */
  unitSkdr: string[];
  warna: string | null;
  catatan: string | null;
  /** Penulisan lain yang pernah dipakai di data lama (tabel wilker_nama_alias). */
  alias: string[];
}

/** Kunci pembanding: huruf kecil, tanpa spasi/garis bawah/titik/strip. "Tanjung_Santan" == "TanjungSantan" == "tanjung santan". */
export function kunciNama(teks: string): string {
  return teks.toLowerCase().replace(/[\s_.\-]+/g, '');
}

/** Bangun kamus pencarian dari daftar wilayah (baris wilker_ref). Murni dan murah; aman dipanggil per render. */
export function buatKamus(daftarMentah: readonly Wilayah[]) {
  const semua = [...daftarMentah].sort((a, b) => a.urutan - b.urutan || a.kode.localeCompare(b.kode));
  const aktif = semua.filter((w) => w.aktif);

  const peta = new Map<string, KodeWilker>();
  for (const w of semua) {
    const bentuk: string[] = [w.kode, w.nama, w.namaPendek, w.namaPeta, ...w.alias];
    if (w.jenis === 'Pelabuhan') bentuk.push(`Pelabuhan ${w.namaPendek}`, `Pelabuhan Laut ${w.namaPendek}`);
    for (const b of bentuk) {
      const k = kunciNama(b);
      if (k && !peta.has(k)) peta.set(k, w.kode); // yang pertama menang (urutan), tidak saling menimpa
    }
  }
  const byKode = new Map(semua.map((w) => [w.kode, w]));

  return {
    /** Semua wilayah, termasuk yang dinonaktifkan (untuk membaca data historis). */
    semua,
    /** Hanya yang aktif (untuk dropdown input/filter). */
    aktif,
    daftarKode: semua.map((w) => w.kode),
    daftarKodeAktif: aktif.map((w) => w.kode),
    namaPendekByKode: Object.fromEntries(semua.map((w) => [w.kode, w.namaPendek])) as Record<string, string>,
    namaPanjangByKode: Object.fromEntries(semua.map((w) => [w.kode, w.nama])) as Record<string, string>,
    /** Opsi pemilih wilayah di modul peta. */
    opsiPeta: aktif.map((w) => ({ kode: w.kode, nama: w.namaPeta })),

    /**
     * Terjemahkan penulisan apa pun (kode, nama panjang/pendek, "TanjungSantan", "Pelabuhan Laut Sangatta", alias ...)
     * menjadi kode baku. Mengembalikan null bila TIDAK dikenal; pemanggil wajib menolak/melaporkan, jangan menebak.
     */
    kodeDariTeks(teks: string | null | undefined): KodeWilker | null {
      if (teks == null) return null;
      const k = kunciNama(String(teks).trim());
      return k ? (peta.get(k) ?? null) : null;
    },
    isKode(x: unknown): x is KodeWilker {
      return typeof x === 'string' && byKode.has(x);
    },
    dapatkan(kode: string | null | undefined): Wilayah | undefined {
      return kode ? byKode.get(kode) : undefined;
    },
    namaDariKode(kode: string | null | undefined, bentuk: 'panjang' | 'pendek' | 'peta' = 'panjang'): string | undefined {
      const w = kode ? byKode.get(kode) : undefined;
      if (!w) return undefined;
      return bentuk === 'pendek' ? w.namaPendek : bentuk === 'peta' ? w.namaPeta : w.nama;
    },
  };
}

export type KamusWilker = ReturnType<typeof buatKamus>;

/** Ubah baris mentah (hasil query / JSON dari server) menjadi Wilayah yang rapi. */
export function normalisasiWilayah(b: Record<string, unknown>, alias: string[] = []): Wilayah {
  const nama = String(b.nama ?? '');
  const jenisMentah = String(b.jenis ?? '');
  const jenis = (DAFTAR_JENIS_WILKER.find((j) => j.toLowerCase() === jenisMentah.toLowerCase()) ?? 'Pelabuhan') as JenisWilker;
  const pendek = String(b.nama_pendek ?? b.namaPendek ?? '') || nama.replace(/^(Pelabuhan|Bandara|Kantor)\s+/i, '');
  const angka = (v: unknown) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
  return {
    kode: String(b.kode ?? ''),
    nama,
    namaPendek: pendek,
    namaPeta: String(b.nama_peta ?? b.namaPeta ?? '') || (jenis === 'Bandara' ? nama : pendek),
    jenis,
    urutan: Number(b.urutan ?? 0) || 0,
    aktif: b.aktif === undefined || b.aktif === null ? true : Boolean(b.aktif),
    lat: angka(b.lat),
    lng: angka(b.lng),
    petaLat: angka(b.peta_lat ?? b.petaLat),
    petaLng: angka(b.peta_lng ?? b.petaLng),
    zoom: Number(b.zoom ?? 13) || 13,
    unitSkdr: Array.isArray(b.skdr_unit ?? b.unitSkdr) ? ((b.skdr_unit ?? b.unitSkdr) as unknown[]).map(String) : [],
    subLokasi: Array.isArray(b.sub_lokasi ?? b.subLokasi) ? ((b.sub_lokasi ?? b.subLokasi) as unknown[]).map(String) : [],
    warna: (b.warna as string | null) ?? null,
    catatan: (b.catatan as string | null) ?? null,
    alias,
  };
}
