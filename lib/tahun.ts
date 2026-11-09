// lib/tahun.ts
// Murni (tanpa import server), aman dipakai di server maupun client.

/** Tahun pertama yang punya data. Ubah bila ada data tahun yang lebih awal. */
export const TAHUN_MULAI = 2026;

/** Tahun kalender saat ini menurut WITA, supaya sama di server (UTC) dan browser. */
export function tahunBerjalanWita(): number {
  return Number(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }).slice(0, 4));
}

/** Daftar tahun untuk dropdown, terbaru di atas. */
export function daftarTahun(): number[] {
  const akhir = tahunBerjalanWita();
  const hasil: number[] = [];
  for (let t = akhir; t >= TAHUN_MULAI; t--) hasil.push(t);
  return hasil.length ? hasil : [akhir];
}

/** Baca parameter ?tahun=; nilai tidak valid atau di luar rentang jatuh ke tahun berjalan. */
export function bacaTahun(param?: string | null): number {
  const sekarang = tahunBerjalanWita();
  const n = Number(param);
  return Number.isInteger(n) && n >= TAHUN_MULAI && n <= sekarang ? n : sekarang;
}

// Aturan MMWR: minggu Minggu-Sabtu; minggu 1 = minggu pertama yang punya minimal 4 hari di tahun itu.
function awalMinggu1(tahun: number): number {
  const jan1 = Date.UTC(tahun, 0, 1);
  const hari = new Date(jan1).getUTCDay(); // 0 = Minggu
  return jan1 + (hari <= 3 ? -hari : 7 - hari) * 86400000;
}

/** Jumlah minggu epid dalam satu tahun (52 atau 53). */
export function jumlahMingguEpid(tahun: number): number {
  return Math.round((awalMinggu1(tahun + 1) - awalMinggu1(tahun)) / (7 * 86400000));
}