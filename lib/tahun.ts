// lib/tahun.ts
// Murni (tanpa import server), aman dipakai di server maupun client.

/** Tahun pertama yang punya data. Ubah bila ada data tahun yang lebih awal. */
export const TAHUN_MULAI = 2026;

/** Tahun kalender saat ini menurut WITA, supaya sama di server (UTC) dan browser. */
export function tahunBerjalanWita(): number {
  return Number(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }).slice(0, 4));
}

/** Berapa tahun ke depan boleh dipilih di modul sanitasi (TPP, TTU, PAB). Modul lain tetap 0. */
export const TAHUN_MAJU_SANITASI = 2;

/** Daftar tahun untuk dropdown, terbaru di atas. `maju` = jumlah tahun setelah tahun berjalan yang ikut ditawarkan. */
export function daftarTahun(maju = 0): number[] {
  const akhir = tahunBerjalanWita() + Math.max(0, maju);
  const hasil: number[] = [];
  for (let t = akhir; t >= TAHUN_MULAI; t--) hasil.push(t);
  return hasil.length ? hasil : [tahunBerjalanWita()];
}

/** Baca parameter ?tahun=; nilai tidak valid atau di luar rentang jatuh ke tahun berjalan. `maju` harus sama dengan yang dipakai dropdown. */
export function bacaTahun(param?: string | null, maju = 0): number {
  const sekarang = tahunBerjalanWita();
  const n = Number(param);
  return Number.isInteger(n) && n >= TAHUN_MULAI && n <= sekarang + Math.max(0, maju) ? n : sekarang;
}

/** Bulan terakhir yang ditampilkan: bulan berjalan untuk tahun ini, 12 untuk tahun lain (lalu maupun depan). */
export function bulanTampil(tahun: number): number {
  const sekarang = tahunBerjalanWita();
  if (tahun !== sekarang) return 12;
  return Number(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }).slice(5, 7));
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