// lib/posko/perintahInput.ts
// Validasi + perintah SQL untuk input data harian posko (fungsi murni, tanpa Next/Turso -> mudah diuji).
import {
  DAFTAR_PENYAKIT,
  DAFTAR_PTM,
  WILAYAH_POSKO,
  type JenisPosko,
  type WilayahPosko,
} from './konstanta';

export type InputHarianPayload = {
  posko: JenisPosko;
  tanggal: string;
  wilayah: WilayahPosko;
  /** jenis penyakit -> 8 angka: kasus L<5, L>=5, P<5, P>=5, lalu meninggal L<5, L>=5, P<5, P>=5 */
  penyakit: Record<string, number[]>;
  klbJumlah: number;
  klbKeterangan: string;
  /** jenis PTM -> jumlah kasus */
  ptm: Record<string, number>;
};

export const BATAS_ANGKA = 1_000_000;

export function tanggalSah(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function angkaSah(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= BATAS_ANGKA;
}

/** null = lolos; selain itu pesan kesalahan. Semua angka diperiksa SEBELUM menulis apa pun. */
export function validasiInputHarian(input: InputHarianPayload, hariIni: string): string | null {
  if (input.posko !== 'nataru' && input.posko !== 'idul_fitri') return 'Jenis posko tidak dikenal.';
  if (!tanggalSah(input.tanggal)) return 'Tanggal tidak valid.';
  if (!(WILAYAH_POSKO as readonly string[]).includes(input.wilayah)) return 'Wilayah kerja tidak valid.';
  if (input.tanggal > hariIni) return 'Tanggal belum tiba, data belum bisa diinput.';
  if (!angkaSah(input.klbJumlah)) return 'Jumlah kejadian KLB harus bilangan bulat 0 atau lebih.';
  for (const jenis of DAFTAR_PENYAKIT) {
    const nilai = input.penyakit?.[jenis];
    if (!Array.isArray(nilai) || nilai.length !== 8 || !nilai.every(angkaSah)) {
      return `Angka penyakit "${jenis}" harus bilangan bulat 0 atau lebih.`;
    }
  }
  for (const jenis of DAFTAR_PTM) {
    if (!angkaSah(input.ptm?.[jenis])) return `Jumlah "${jenis}" harus bilangan bulat 0 atau lebih.`;
  }
  return null;
}

export const SQL_PENYAKIT =
  `INSERT INTO posko_penyakit_harian (posko, tahun, tanggal, wilayah_kerja, jenis_penyakit,
     kasus_lk_lt5, kasus_lk_ge5, kasus_pr_lt5, kasus_pr_ge5, mati_lk_lt5, mati_lk_ge5, mati_pr_lt5, mati_pr_ge5)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT (posko, tahun, tanggal, wilayah_kerja, jenis_penyakit) DO UPDATE SET
     kasus_lk_lt5 = excluded.kasus_lk_lt5, kasus_lk_ge5 = excluded.kasus_lk_ge5,
     kasus_pr_lt5 = excluded.kasus_pr_lt5, kasus_pr_ge5 = excluded.kasus_pr_ge5,
     mati_lk_lt5 = excluded.mati_lk_lt5, mati_lk_ge5 = excluded.mati_lk_ge5,
     mati_pr_lt5 = excluded.mati_pr_lt5, mati_pr_ge5 = excluded.mati_pr_ge5, diperbarui = datetime('now')`;

export const SQL_KLB =
  `INSERT INTO posko_klb_harian (posko, tahun, tanggal, wilayah_kerja, jumlah_klb, keterangan) VALUES (?, ?, ?, ?, ?, ?)
   ON CONFLICT (posko, tahun, tanggal, wilayah_kerja) DO UPDATE SET
     jumlah_klb = excluded.jumlah_klb, keterangan = excluded.keterangan, diperbarui = datetime('now')`;

export const SQL_PTM =
  `INSERT INTO posko_ptm_harian (posko, tahun, tanggal, wilayah_kerja, jenis_ptm, jumlah_kasus) VALUES (?, ?, ?, ?, ?, ?)
   ON CONFLICT (posko, tahun, tanggal, wilayah_kerja, jenis_ptm) DO UPDATE SET
     jumlah_kasus = excluded.jumlah_kasus, diperbarui = datetime('now')`;

/** 25 baris penyakit + 1 baris KLB + 7 baris PTM = 33 perintah (dijalankan sebagai satu transaksi). */
export function bangunPerintahInputHarian(input: InputHarianPayload, tahun: number) {
  const dasar = [input.posko, tahun, input.tanggal, input.wilayah];
  const ket = String(input.klbKeterangan ?? '').trim().slice(0, 300);
  return [
    ...DAFTAR_PENYAKIT.map((jenis) => ({ sql: SQL_PENYAKIT, args: [...dasar, jenis, ...input.penyakit[jenis]] })),
    { sql: SQL_KLB, args: [...dasar, input.klbJumlah, ket === '' ? null : ket] },
    ...DAFTAR_PTM.map((jenis) => ({ sql: SQL_PTM, args: [...dasar, jenis, input.ptm[jenis]] })),
  ];
}
