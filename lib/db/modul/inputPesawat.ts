// lib/db/modul/inputPesawat.ts
// Input data kegiatan pesawat (tabel kegiatan_pesawat): validasi murni, pencocokan duplikat, penulisan.
// SERVER-ONLY (memakai klien MariaDB). Dipakai oleh form satu-satu dan unggah Excel, jadi keduanya
// tunduk pada aturan yang SAMA.
//
// Aturan bisnis (docs/masterpromptpesawat.md):
//  - status_data ditentukan dari tanggal: tanggal <= hari ini = 'final', sesudahnya = 'rencana'.
//    Statistik resmi hanya menghitung 'final'. Skrip Google Sheets yang dulu menaikkan 'rencana' menjadi
//    'final' tiap malam sudah tidak ada, maka naikkanRencanaKeFinal() menggantikannya.
//  - kolom `keberangkatan` = kota TUJUAN pesawat yang berangkat; `kedatangan` = kota ASAL pesawat yang datang.
//  - sertifikat = jumlah orang yang diterbitkan sertifikatnya, dipisah laki-laki/perempuan.
import { getDbClient } from '@/lib/db/client';
import { WILAYAH_KERJA } from '@/lib/wilayah-kerja';

/** Wilayah kerja yang menerima data pesawat: hanya jenis Bandara (saat ini WK07 Bandara APT Pranoto). */
export const WILKER_BANDARA = WILAYAH_KERJA.filter((w) => w.jenis === 'Bandara');

export type StatusData = 'final' | 'rencana';

/** Bentuk baku satu baris; kunci sama dengan kolom tabel sehingga hasil validasi dapat divalidasi ulang. */
export interface BarisPesawat {
  kode_wilker: string;
  tanggal: string; // YYYY-MM-DD
  maskapai: string;
  keberangkatan: string | null;
  crew_berangkat: number;
  penumpang_berangkat: number;
  kedatangan: string | null;
  crew_datang: number;
  penumpang_datang: number;
  sklt_male: number;
  sklt_female: number;
  td_laik_male: number;
  td_laik_female: number;
  iaos_male: number;
  iaos_female: number;
  jenazah_male: number;
  jenazah_female: number;
  kier_male: number;
  kier_female: number;
  status_data: StatusData;
}

export type JenisKolom = 'tanggal' | 'teks' | 'angka';

export interface DefKolom {
  kunci: keyof Omit<BarisPesawat, 'kode_wilker' | 'status_data'>;
  header: string; // judul kolom di template Excel
  jenis: JenisKolom;
  wajib?: boolean;
  alias?: string[]; // ejaan lain yang diterima saat membaca Excel
  petunjuk: string;
  contoh: string | number;
}

const L = 'Laki-laki';
const P = 'Perempuan';

/** Urutan kolom = urutan di template Excel dan di form. */
export const KOLOM_PESAWAT: DefKolom[] = [
  { kunci: 'tanggal', header: 'Tanggal', jenis: 'tanggal', wajib: true, alias: ['tgl'], petunjuk: 'Tanggal kegiatan. Format 2026-10-27, 27/10/2026, atau 27 Oktober 2026 (urutan hari/bulan/tahun). Tanggal setelah hari ini tersimpan sebagai Rencana.', contoh: '2026-10-27' },
  { kunci: 'maskapai', header: 'Maskapai', jenis: 'teks', wajib: true, alias: ['airline'], petunjuk: 'Nama maskapai, mis. Batik Air.', contoh: 'Batik Air' },
  { kunci: 'keberangkatan', header: 'Kota Tujuan (Berangkat)', jenis: 'teks', alias: ['kota tujuan', 'tujuan', 'keberangkatan'], petunjuk: 'Kota TUJUAN pesawat yang berangkat. Wajib bila ada crew atau penumpang berangkat.', contoh: 'Jakarta' },
  { kunci: 'crew_berangkat', header: 'Crew Berangkat', jenis: 'angka', petunjuk: 'Jumlah crew pada keberangkatan. Kosong = 0.', contoh: 6 },
  { kunci: 'penumpang_berangkat', header: 'Penumpang Berangkat', jenis: 'angka', petunjuk: 'Jumlah penumpang berangkat. Kosong = 0.', contoh: 120 },
  { kunci: 'kedatangan', header: 'Kota Asal (Datang)', jenis: 'teks', alias: ['kota asal', 'asal', 'kedatangan'], petunjuk: 'Kota ASAL pesawat yang datang. Wajib bila ada crew atau penumpang datang.', contoh: 'Surabaya' },
  { kunci: 'crew_datang', header: 'Crew Datang', jenis: 'angka', petunjuk: 'Jumlah crew pada kedatangan. Kosong = 0.', contoh: 6 },
  { kunci: 'penumpang_datang', header: 'Penumpang Datang', jenis: 'angka', petunjuk: 'Jumlah penumpang datang. Kosong = 0.', contoh: 130 },
  { kunci: 'sklt_male', header: `SKLT ${L}`, jenis: 'angka', alias: ['sklt l', 'sklt male'], petunjuk: 'Surat Keterangan Laik Terbang: jumlah orang yang diterbitkan sertifikatnya.', contoh: 0 },
  { kunci: 'sklt_female', header: `SKLT ${P}`, jenis: 'angka', alias: ['sklt p', 'sklt female'], petunjuk: 'Idem, perempuan.', contoh: 0 },
  { kunci: 'td_laik_male', header: `TD Laik ${L}`, jenis: 'angka', alias: ['td laik l', 'td laik male'], petunjuk: 'Sertifikat kategori TD (Laik).', contoh: 0 },
  { kunci: 'td_laik_female', header: `TD Laik ${P}`, jenis: 'angka', alias: ['td laik p', 'td laik female'], petunjuk: 'Idem, perempuan.', contoh: 0 },
  { kunci: 'iaos_male', header: `IAOS ${L}`, jenis: 'angka', alias: ['iaos l', 'iaos male'], petunjuk: 'Ijin Angkut Orang Sakit.', contoh: 0 },
  { kunci: 'iaos_female', header: `IAOS ${P}`, jenis: 'angka', alias: ['iaos p', 'iaos female'], petunjuk: 'Idem, perempuan.', contoh: 0 },
  { kunci: 'jenazah_male', header: `Jenazah ${L}`, jenis: 'angka', alias: ['jenazah l', 'jenazah male'], petunjuk: 'Transportasi jenazah (bukan sertifikat kesehatan biasa).', contoh: 0 },
  { kunci: 'jenazah_female', header: `Jenazah ${P}`, jenis: 'angka', alias: ['jenazah p', 'jenazah female'], petunjuk: 'Idem, perempuan.', contoh: 0 },
  { kunci: 'kier_male', header: `KIER ${L}`, jenis: 'angka', alias: ['kier l', 'kier male'], petunjuk: 'Surat Keterangan Kesehatan (KIER).', contoh: 0 },
  { kunci: 'kier_female', header: `KIER ${P}`, jenis: 'angka', alias: ['kier p', 'kier female'], petunjuk: 'Idem, perempuan.', contoh: 0 },
];

type KunciAngka =
  | 'crew_berangkat' | 'penumpang_berangkat' | 'crew_datang' | 'penumpang_datang'
  | 'sklt_male' | 'sklt_female' | 'td_laik_male' | 'td_laik_female' | 'iaos_male' | 'iaos_female'
  | 'jenazah_male' | 'jenazah_female' | 'kier_male' | 'kier_female';
const KUNCI_ANGKA = KOLOM_PESAWAT.filter((k) => k.jenis === 'angka').map((k) => k.kunci) as KunciAngka[];

export const MAKS_ORANG = 100_000;
export const MAKS_HARI_KE_DEPAN = 30; // jadwal H+2/H+3 lazimnya; 30 hari = batas wajar untuk salah ketik tahun/bulan
export const TANGGAL_TERAWAL = '2000-01-01';

// ---------------------------------------------------------------- tanggal & angka (murni)

const BULAN: Record<string, number> = {
  januari: 1, jan: 1, februari: 2, pebruari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5,
  juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8, september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, november: 11, nopember: 11, nov: 11, desember: 12, des: 12,
};

function susunYmd(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return t.toISOString().slice(0, 10);
}

/** Terima: objek Date (UTC), nomor seri Excel, "2026-10-27", "27/10/2026" (hari dulu), "27 Oktober 2026". */
export function parseTanggal(mentah: unknown): string | null {
  if (mentah instanceof Date) return Number.isNaN(mentah.getTime()) ? null : mentah.toISOString().slice(0, 10);
  if (typeof mentah === 'number') {
    if (mentah < 36526 || mentah > 73050) return null; // 2000-01-01 .. 2099-12-31
    return new Date(Math.round((mentah - 25569) * 86_400_000)).toISOString().slice(0, 10);
  }
  if (typeof mentah !== 'string') return null;
  const s = mentah.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
  if (m) return susunYmd(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s);
  if (m) return susunYmd(+m[3], +m[2], +m[1]);
  m = /^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/.exec(s);
  if (m) {
    const bln = BULAN[m[2].toLowerCase()];
    return bln ? susunYmd(+m[3], bln, +m[1]) : null;
  }
  return null;
}

export function geserHari(tanggal: string, hari: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

function teksBersih(mentah: unknown): string {
  if (mentah === null || mentah === undefined) return '';
  if (typeof mentah === 'string') return mentah.replace(/\s+/g, ' ').trim();
  if (typeof mentah === 'number' && Number.isFinite(mentah)) return String(mentah);
  return '';
}

function angkaDari(mentah: unknown, label: string, galat: string[]): number {
  if (mentah === null || mentah === undefined) return 0;
  let n: number;
  if (typeof mentah === 'number') {
    n = mentah;
  } else if (typeof mentah === 'string') {
    const s = mentah.trim();
    if (s === '') return 0;
    if (!/^\d+$/.test(s)) {
      galat.push(`${label} harus bilangan bulat tanpa tanda minus, titik, atau koma (ditemukan "${s.slice(0, 20)}").`);
      return 0;
    }
    n = Number(s);
  } else {
    galat.push(`${label} bukan angka.`);
    return 0;
  }
  if (!Number.isInteger(n) || n < 0) {
    galat.push(`${label} harus bilangan bulat 0 atau lebih.`);
    return 0;
  }
  if (n > MAKS_ORANG) {
    galat.push(`${label} terlalu besar (maksimum ${MAKS_ORANG.toLocaleString('id-ID')}).`);
    return 0;
  }
  return n;
}

// ---------------------------------------------------------------- validasi satu baris (murni)

export type HasilValidasi = { data: BarisPesawat } | { galat: string[] };

/**
 * Validasi + bentuk baku satu baris. `mentah` memakai kunci KOLOM_PESAWAT (mis. "crew_berangkat"); nilai boleh
 * string, angka, atau Date (dari Excel). Mengumpulkan SEMUA galat baris itu sekaligus. `hariIni` = YYYY-MM-DD
 * zona waktu kantor (disuntik agar fungsi tetap murni). Hasil dapat divalidasi ulang dan tetap sama.
 */
export function validasiBarisPesawat(
  mentah: Record<string, unknown>,
  hariIni: string,
  kodeWilker: string,
): HasilValidasi {
  const galat: string[] = [];

  if (!WILKER_BANDARA.some((w) => w.kode === kodeWilker)) galat.push('Wilayah kerja bukan bandara yang valid.');

  const tanggal = parseTanggal(mentah.tanggal);
  if (!tanggal) {
    galat.push(mentah.tanggal === undefined || mentah.tanggal === null || mentah.tanggal === ''
      ? 'Tanggal wajib diisi.'
      : 'Tanggal tidak dapat dibaca. Pakai 2026-10-27, 27/10/2026, atau 27 Oktober 2026.');
  } else if (tanggal < TANGGAL_TERAWAL) {
    galat.push('Tanggal terlalu lama (sebelum tahun 2000).');
  } else if (tanggal > geserHari(hariIni, MAKS_HARI_KE_DEPAN)) {
    galat.push(`Tanggal lebih dari ${MAKS_HARI_KE_DEPAN} hari ke depan. Periksa tahun dan bulannya.`);
  }

  const maskapai = teksBersih(mentah.maskapai);
  if (!maskapai) galat.push('Maskapai wajib diisi.');
  else if (maskapai.length > 255) galat.push('Maskapai terlalu panjang (maksimum 255 karakter).');

  const keberangkatan = teksBersih(mentah.keberangkatan);
  const kedatangan = teksBersih(mentah.kedatangan);
  if (keberangkatan.length > 255) galat.push('Kota tujuan terlalu panjang (maksimum 255 karakter).');
  if (kedatangan.length > 255) galat.push('Kota asal terlalu panjang (maksimum 255 karakter).');

  const angka = {} as Record<KunciAngka, number>;
  for (const k of KOLOM_PESAWAT) {
    if (k.jenis === 'angka') angka[k.kunci as KunciAngka] = angkaDari(mentah[k.kunci], k.header, galat);
  }

  if (angka.crew_berangkat + angka.penumpang_berangkat > 0 && !keberangkatan) {
    galat.push('Kota tujuan wajib diisi karena ada crew/penumpang berangkat.');
  }
  if (angka.crew_datang + angka.penumpang_datang > 0 && !kedatangan) {
    galat.push('Kota asal wajib diisi karena ada crew/penumpang datang.');
  }
  if (!keberangkatan && !kedatangan && KUNCI_ANGKA.every((k) => angka[k] === 0)) {
    galat.push('Baris tidak berisi kota maupun jumlah apa pun.');
  }

  if (galat.length > 0 || !tanggal) return { galat };

  return {
    data: {
      kode_wilker: kodeWilker,
      tanggal,
      maskapai,
      keberangkatan: keberangkatan || null,
      kedatangan: kedatangan || null,
      ...angka,
      status_data: tanggal <= hariIni ? 'final' : 'rencana',
    },
  };
}

/** Ubah isian form (FormData) menjadi baris mentah dengan kunci KOLOM_PESAWAT. */
export function barisMentahDariForm(f: FormData): Record<string, unknown> {
  const hasil: Record<string, unknown> = {};
  for (const k of KOLOM_PESAWAT) {
    const v = f.get(k.kunci);
    hasil[k.kunci] = typeof v === 'string' ? v : undefined;
  }
  return hasil;
}

// ---------------------------------------------------------------- duplikat (murni + baca DB)

/**
 * Identitas satu baris untuk mendeteksi unggah ulang: SEMUA isian sama. Sengaja tidak hanya (tanggal, maskapai,
 * rute): satu maskapai bisa punya beberapa penerbangan sehari di rute yang sama, dan itu bukan duplikat.
 */
export function kunciIdentitas(b: Omit<BarisPesawat, 'status_data'>): string {
  const t = (s: unknown) => teksBersih(s).toLowerCase();
  return [
    b.kode_wilker, b.tanggal, t(b.maskapai), t(b.keberangkatan), t(b.kedatangan),
    ...KUNCI_ANGKA.map((k) => Number(b[k]) || 0),
  ].join('|');
}

/** Hitung berapa baris identik yang SUDAH ada di database untuk tiap kunci identitas. */
export async function hitungIdentitasDiDb(baris: BarisPesawat[]): Promise<Map<string, number>> {
  const ada = new Map<string, number>();
  if (baris.length === 0) return ada;

  const perWilker = new Map<string, { min: string; maks: string }>();
  for (const b of baris) {
    const r = perWilker.get(b.kode_wilker);
    if (!r) perWilker.set(b.kode_wilker, { min: b.tanggal, maks: b.tanggal });
    else {
      if (b.tanggal < r.min) r.min = b.tanggal;
      if (b.tanggal > r.maks) r.maks = b.tanggal;
    }
  }

  const kolom = ['kode_wilker', 'tanggal', 'maskapai', 'keberangkatan', 'kedatangan', ...KUNCI_ANGKA].join(', ');
  for (const [kode, { min, maks }] of perWilker) {
    const r = await getDbClient().execute({
      sql: `SELECT ${kolom} FROM kegiatan_pesawat WHERE kode_wilker = ? AND tanggal BETWEEN ? AND ?`,
      args: [kode, min, maks],
    });
    for (const x of r.rows) {
      const angkaDb = Object.fromEntries(KUNCI_ANGKA.map((k) => [k, Number(x[k]) || 0])) as Record<KunciAngka, number>;
      const kunci = kunciIdentitas({
        kode_wilker: String(x.kode_wilker),
        tanggal: String(x.tanggal),
        maskapai: String(x.maskapai ?? ''),
        keberangkatan: x.keberangkatan == null ? null : String(x.keberangkatan),
        kedatangan: x.kedatangan == null ? null : String(x.kedatangan),
        ...angkaDb,
      });
      ada.set(kunci, (ada.get(kunci) ?? 0) + 1);
    }
  }
  return ada;
}

/**
 * Tandai baris yang sudah ada di database. Pencocokan bersifat multiset: bila database sudah memuat 1 baris
 * identik dan file memuat 2, hanya yang pertama ditandai duplikat (yang kedua dianggap penerbangan terpisah).
 * Hasil sejajar dengan `baris`: true = sudah ada.
 */
export function tandaiDuplikat(baris: BarisPesawat[], adaDiDb: Map<string, number>): boolean[] {
  const sisa = new Map(adaDiDb);
  return baris.map((b) => {
    const k = kunciIdentitas(b);
    const n = sisa.get(k) ?? 0;
    if (n > 0) {
      sisa.set(k, n - 1);
      return true;
    }
    return false;
  });
}

// ---------------------------------------------------------------- penulisan

const KOLOM_INSERT = [
  'kode_wilker', 'tanggal', 'maskapai', 'keberangkatan', 'kedatangan', ...KUNCI_ANGKA, 'status_data', 'created_by',
] as const;
const UKURAN_POTONGAN = 100;

const adalahUuid = (s: string | null | undefined): s is string => !!s && /^[0-9a-fA-F-]{36}$/.test(s);

/**
 * Simpan banyak baris dalam SATU transaksi (semua tersimpan atau tidak sama sekali). Baris diasumsikan sudah
 * lolos validasiBarisPesawat. `idPengguna` dicatat di created_by bila berbentuk UUID (kolom CHAR(36)).
 */
export async function simpanBarisPesawat(baris: BarisPesawat[], idPengguna: string | null): Promise<number> {
  if (baris.length === 0) return 0;
  const tx = await getDbClient().transaction();
  try {
    for (let i = 0; i < baris.length; i += UKURAN_POTONGAN) {
      const potong = baris.slice(i, i + UKURAN_POTONGAN);
      const args: (string | number | null)[] = [];
      for (const b of potong) {
        args.push(
          b.kode_wilker, b.tanggal, b.maskapai, b.keberangkatan, b.kedatangan,
          ...KUNCI_ANGKA.map((k) => b[k]),
          b.status_data, adalahUuid(idPengguna) ? idPengguna : null,
        );
      }
      const satuBaris = `(${KOLOM_INSERT.map(() => '?').join(', ')})`;
      await tx.execute({
        sql: `INSERT INTO kegiatan_pesawat (${KOLOM_INSERT.join(', ')}) VALUES ${potong.map(() => satuBaris).join(', ')}`,
        args,
      });
    }
    await tx.commit();
    return baris.length;
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  }
}

/**
 * Naikkan baris 'rencana' yang tanggalnya sudah tiba menjadi 'final' (pengganti skrip malam Google Sheets).
 * Idempoten dan murah; aman dipanggil berulang. Mengembalikan jumlah baris yang dinaikkan.
 */
export async function naikkanRencanaKeFinal(hariIni: string): Promise<number> {
  const r = await getDbClient().execute({
    sql: "UPDATE kegiatan_pesawat SET status_data = 'final' WHERE status_data = 'rencana' AND tanggal <= ?",
    args: [hariIni],
  });
  return r.rowsAffected;
}

export interface BarisPesawatTerbaru {
  id: string;
  tanggal: string;
  maskapai: string;
  keberangkatan: string | null;
  kedatangan: string | null;
  crew_berangkat: number;
  penumpang_berangkat: number;
  crew_datang: number;
  penumpang_datang: number;
  status_data: string;
}

/** Baris terakhir yang masuk (urut waktu dibuat), untuk konfirmasi visual. */
export async function getPesawatTerbaru(batas = 10): Promise<BarisPesawatTerbaru[]> {
  const r = await getDbClient().execute({
    sql: `SELECT id, tanggal, maskapai, keberangkatan, kedatangan, crew_berangkat, penumpang_berangkat,
                 crew_datang, penumpang_datang, status_data
            FROM kegiatan_pesawat ORDER BY created_at DESC, tanggal DESC LIMIT ${Math.max(1, Math.min(50, Math.trunc(batas)))}`,
    args: [],
  });
  return r.rows.map((x) => ({
    id: String(x.id),
    tanggal: String(x.tanggal ?? ''),
    maskapai: String(x.maskapai ?? ''),
    keberangkatan: x.keberangkatan == null ? null : String(x.keberangkatan),
    kedatangan: x.kedatangan == null ? null : String(x.kedatangan),
    crew_berangkat: Number(x.crew_berangkat) || 0,
    penumpang_berangkat: Number(x.penumpang_berangkat) || 0,
    crew_datang: Number(x.crew_datang) || 0,
    penumpang_datang: Number(x.penumpang_datang) || 0,
    status_data: String(x.status_data ?? ''),
  }));
}

// ---------------------------------------------------------------- pemeriksaan massal (unggah Excel)

export type StatusBaris = 'siap' | 'duplikat' | 'galat';

export interface HasilBaris {
  nomor: number; // nomor baris di file (atau urutan, untuk simpan)
  status: StatusBaris;
  galat?: string[];
  data?: BarisPesawat;
}

/**
 * Validasi tiap baris lalu tandai yang sudah ada di database. Dipanggil dua kali pada unggah Excel: saat
 * pratinjau dan saat menyimpan (server tidak mempercayai hasil pratinjau dari browser).
 */
export async function periksaBanyak(
  masukan: { nomor: number; mentah: Record<string, unknown> }[],
  hariIni: string,
  kodeWilker: string,
): Promise<HasilBaris[]> {
  const hasil: HasilBaris[] = masukan.map(({ nomor, mentah }) => {
    const v = validasiBarisPesawat(mentah, hariIni, kodeWilker);
    return 'data' in v ? { nomor, status: 'siap' as const, data: v.data } : { nomor, status: 'galat' as const, galat: v.galat };
  });

  const sah = hasil.filter((h) => h.status === 'siap');
  const tanda = tandaiDuplikat(sah.map((h) => h.data!), await hitungIdentitasDiDb(sah.map((h) => h.data!)));
  sah.forEach((h, i) => {
    if (tanda[i]) h.status = 'duplikat';
  });
  return hasil;
}
