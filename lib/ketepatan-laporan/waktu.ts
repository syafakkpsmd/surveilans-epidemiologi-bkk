/**
 * lib/ketepatan-laporan/waktu.ts
 *
 * Perhitungan tanggal & deadline dalam WITA (UTC+8, tanpa DST). Semua
 * aritmetika memakai epoch UTC, jadi hasilnya sama di server, browser,
 * dan zona waktu perangkat apa pun.
 *
 * Aturan minggu: minggu epidemiologi MMWR (mulai Minggu, minggu-1 = minggu
 * yang memuat >= 4 hari di tahun itu) -- sama dengan lib/epi-week.ts dan
 * fungsi SQL mmwr_week(). Modul ini sengaja berdiri sendiri supaya bisa
 * dipasang tanpa bergantung pada file lain.
 */

export const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;
const HARI_MS = 24 * 60 * 60 * 1000;

const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
export const NAMA_BULAN_PENDEK = BULAN_PENDEK;

const dua = (n: number) => String(n).padStart(2, '0');

// ------------------------------------------------------------------ Format

/** Geser ke WITA lalu baca komponen dengan getUTC*. */
function keWita(d: Date): Date {
  return new Date(d.getTime() + WITA_OFFSET_MS);
}

export function tahunWita(d: Date): number {
  return keWita(d).getUTCFullYear();
}

export function formatTanggalWita(d: Date): string {
  const g = keWita(d);
  return `${g.getUTCDate()} ${BULAN_PENDEK[g.getUTCMonth()]} ${g.getUTCFullYear()}`;
}

/** "29 Sep 2026, 14:20 WITA" */
export function formatWaktuWita(d: Date): string {
  const g = keWita(d);
  return `${formatTanggalWita(d)}, ${dua(g.getUTCHours())}:${dua(g.getUTCMinutes())} WITA`;
}

/** ISO 8601 dengan offset +08:00 (untuk data contoh). */
export function keIsoWita(d: Date): string {
  const g = keWita(d);
  return (
    `${g.getUTCFullYear()}-${dua(g.getUTCMonth() + 1)}-${dua(g.getUTCDate())}` +
    `T${dua(g.getUTCHours())}:${dua(g.getUTCMinutes())}:${dua(g.getUTCSeconds())}+08:00`
  );
}

/** "2 hari 3 jam", "5 jam 10 menit", "45 menit", "kurang dari 1 menit". */
export function formatDurasi(ms: number): string {
  const totalMenit = Math.floor(Math.abs(ms) / 60_000);
  const hari = Math.floor(totalMenit / 1440);
  const jam = Math.floor((totalMenit % 1440) / 60);
  const menit = totalMenit % 60;
  if (hari > 0) return jam > 0 ? `${hari} hari ${jam} jam` : `${hari} hari`;
  if (jam > 0) return menit > 0 ? `${jam} jam ${menit} menit` : `${jam} jam`;
  if (menit > 0) return `${menit} menit`;
  return 'kurang dari 1 menit';
}

// ------------------------------------------------------------------ Mingguan

function mulaiMingguSatuMs(tahun: number): number {
  const jan1 = Date.UTC(tahun, 0, 1);
  const dow = new Date(jan1).getUTCDay(); // 0 = Minggu
  const geser = dow <= 3 ? -dow : 7 - dow;
  return jan1 + geser * HARI_MS;
}

/** Hari Minggu pembuka minggu epid (tanggal saja, disimpan sebagai 00:00 UTC). */
export function awalMingguEpid(tahun: number, minggu: number): Date {
  return new Date(mulaiMingguSatuMs(tahun) + (minggu - 1) * 7 * HARI_MS);
}

/**
 * Deadline mingguan: Selasa pukul 17:00 WITA pada minggu BERIKUTNYA.
 * Minggu N mulai Minggu S -> minggu berikutnya mulai S+7 -> Selasa = S+9.
 */
export function deadlineMingguan(tahun: number, minggu: number): Date {
  const awal = awalMingguEpid(tahun, minggu).getTime();
  return new Date(awal + 9 * HARI_MS + (17 * 60 * 60 * 1000 - WITA_OFFSET_MS));
}

/** Saat minggu itu selesai: Minggu berikutnya 00:00 WITA. */
export function akhirMingguan(tahun: number, minggu: number): Date {
  return new Date(awalMingguEpid(tahun, minggu).getTime() + 7 * HARI_MS - WITA_OFFSET_MS);
}

function fmtTanggalUtc(d: Date, denganTahun: boolean): string {
  const t = `${d.getUTCDate()} ${BULAN_PENDEK[d.getUTCMonth()]}`;
  return denganTahun ? `${t} ${d.getUTCFullYear()}` : t;
}

/** "20-26 Sep 2026" atau "28 Des 2025-3 Jan 2026". */
export function labelRentangMinggu(tahun: number, minggu: number): string {
  const a = awalMingguEpid(tahun, minggu);
  const b = new Date(a.getTime() + 6 * HARI_MS);
  if (a.getUTCFullYear() !== b.getUTCFullYear()) {
    return `${fmtTanggalUtc(a, true)}-${fmtTanggalUtc(b, true)}`;
  }
  if (a.getUTCMonth() !== b.getUTCMonth()) {
    return `${fmtTanggalUtc(a, false)}-${fmtTanggalUtc(b, true)}`;
  }
  return `${a.getUTCDate()}-${fmtTanggalUtc(b, true)}`;
}

// ------------------------------------------------------------------- Bulanan

/**
 * Deadline bulanan: tanggal 10 bulan berikutnya pukul 23:59 WITA. Dihitung
 * sampai akhir menit 23:59 (23:59:59.999), jadi kiriman pukul 23:59:30 masih
 * tepat waktu. Bulan 12 otomatis jatuh ke 10 Januari tahun berikutnya.
 */
export function deadlineBulanan(tahun: number, bulan: number): Date {
  // bulan 1-12 -> indeks bulan berikutnya = `bulan` (0-based)
  return new Date(Date.UTC(tahun, bulan, 10, 23, 59, 59, 999) - WITA_OFFSET_MS);
}

/** Saat bulan itu selesai: tanggal 1 bulan berikutnya 00:00 WITA. */
export function akhirBulanan(tahun: number, bulan: number): Date {
  return new Date(Date.UTC(tahun, bulan, 1) - WITA_OFFSET_MS);
}

export function namaBulanPanjang(bulan: number): string {
  return BULAN_PANJANG[bulan - 1];
}
