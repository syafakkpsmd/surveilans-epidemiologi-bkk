/**
 * Konvensi `periode_key` yang dipakai di seluruh Segmen 9 (dikirim
 * dari client, dipakai sebagai kunci cache & untuk query data):
 *   - Mingguan : "{tahun_epid}-W{minggu_epid}"   contoh: "2026-W27"
 *   - Bulanan  : "{tahun}-{bulan}"                contoh: "2026-6"
 */

export type PeriodeMingguan = { jenis: 'mingguan'; tahun: number; minggu: number };
export type PeriodeBulanan = { jenis: 'bulanan'; tahun: number; bulan: number };
export type Periode = PeriodeMingguan | PeriodeBulanan;

const POLA_MINGGUAN = /^(\d{4})-W(\d{1,2})$/;
const POLA_BULANAN = /^(\d{4})-(\d{1,2})$/;

export function parsePeriodeMingguan(periodeKey: string): PeriodeMingguan {
  const cocok = periodeKey.match(POLA_MINGGUAN);
  if (!cocok) {
    throw new Error(
      `periode_key "${periodeKey}" tidak valid untuk konteks mingguan (format yang benar: "2026-W27").`
    );
  }
  return { jenis: 'mingguan', tahun: Number(cocok[1]), minggu: Number(cocok[2]) };
}

export function parsePeriodeBulanan(periodeKey: string): PeriodeBulanan {
  const cocok = periodeKey.match(POLA_BULANAN);
  if (!cocok) {
    throw new Error(
      `periode_key "${periodeKey}" tidak valid untuk konteks bulanan (format yang benar: "2026-6").`
    );
  }
  return { jenis: 'bulanan', tahun: Number(cocok[1]), bulan: Number(cocok[2]) };
}

export function labelPeriodeMingguan(p: PeriodeMingguan): string {
  return `minggu epidemiologi ke-${p.minggu} tahun ${p.tahun}`;
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function labelPeriodeBulanan(p: PeriodeBulanan): string {
  return `${NAMA_BULAN[p.bulan - 1] ?? p.bulan} ${p.tahun}`;
}

/**
 * Periode mingguan sebelumnya. Kalau minggu saat ini adalah minggu
 * ke-1, mundur ke tahun sebelumnya -- TAPI jumlah minggu epidemiologi
 * di tahun sebelumnya bisa 52 ATAU 53 tergantung kalender (ditentukan
 * mmwr_week di database, bukan diasumsikan tetap 52 di sini). Pemanggil
 * (lib/ai/data.ts) yang query data harus menangani kemungkinan minggu
 * ke-53 kosong (tidak ada baris) dengan wajar, bukan error.
 */
export function periodeMingguanSebelumnya(p: PeriodeMingguan): PeriodeMingguan {
  if (p.minggu > 1) {
    return { jenis: 'mingguan', tahun: p.tahun, minggu: p.minggu - 1 };
  }
  return { jenis: 'mingguan', tahun: p.tahun - 1, minggu: 53 };
}

export function periodeBulananSebelumnya(p: PeriodeBulanan): PeriodeBulanan {
  if (p.bulan > 1) {
    return { jenis: 'bulanan', tahun: p.tahun, bulan: p.bulan - 1 };
  }
  return { jenis: 'bulanan', tahun: p.tahun - 1, bulan: 12 };
}

export function formatPeriodeKeyMingguan(p: PeriodeMingguan): string {
  return `${p.tahun}-W${p.minggu}`;
}

export function formatPeriodeKeyBulanan(p: PeriodeBulanan): string {
  return `${p.tahun}-${p.bulan}`;
}

/**
 * Menghitung minggu epidemiologi (WHO/CDC MMWR) dari sebuah tanggal --
 * REPLIKA PERSIS dari fungsi SQL `mmwr_week(date)` (lihat SQL Segmen
 * 1). Kalau ada perubahan di logika SQL-nya, ubah juga di sini supaya
 * periodeKey yang dikirim dari UI tetap match dengan skema data.
 *
 * Dipakai untuk halaman yang butuh "periode berjalan hari ini" tanpa
 * filter eksplisit dari user (mis. dashboard utama). Halaman dengan
 * filter minggu/bulan sendiri (Segmen 6-8) HARUS memakai minggu/bulan
 * yang sedang dipilih user, BUKAN fungsi ini.
 */
export function periodeMingguanDariTanggal(tanggal: Date): PeriodeMingguan {
  let tahun = tanggal.getUTCFullYear();
  let jan1 = Date.UTC(tahun, 0, 1);
  let jan1Dow = new Date(jan1).getUTCDay(); // 0=Minggu ... 6=Sabtu

  let minggu1Mulai = jan1Dow <= 3 ? jan1 - jan1Dow * 86400000 : jan1 + (7 - jan1Dow) * 86400000;

  const hariIni = Date.UTC(tanggal.getUTCFullYear(), tanggal.getUTCMonth(), tanggal.getUTCDate());

  if (hariIni < minggu1Mulai) {
    tahun -= 1;
    jan1 = Date.UTC(tahun, 0, 1);
    jan1Dow = new Date(jan1).getUTCDay();
    minggu1Mulai = jan1Dow <= 3 ? jan1 - jan1Dow * 86400000 : jan1 + (7 - jan1Dow) * 86400000;
  }

  const selisihHari = Math.round((hariIni - minggu1Mulai) / 86400000);
  return { jenis: 'mingguan', tahun, minggu: Math.floor(selisihHari / 7) + 1 };
}

export function periodeBulananDariTanggal(tanggal: Date): PeriodeBulanan {
  return { jenis: 'bulanan', tahun: tanggal.getUTCFullYear(), bulan: tanggal.getUTCMonth() + 1 };
}


/**
 * Batas awal & akhir "hari ini" menurut WITA (UTC+8, tanpa DST) --
 * Samarinda & Kalimantan Timur memakai WITA, BUKAN WIB (UTC+7).
 * Dipakai Route Handler untuk cek cache harian terhadap kolom
 * `dibuat_pada` (timestamptz, disimpan UTC).
 */
export function rentangHariIniWita(sekarang: Date = new Date()): { mulaiUtc: Date; akhirUtc: Date } {
  const OFFSET_WITA_MS = 8 * 60 * 60 * 1000;
  const waktuWita = new Date(sekarang.getTime() + OFFSET_WITA_MS);

  const mulaiWita = Date.UTC(
    waktuWita.getUTCFullYear(),
    waktuWita.getUTCMonth(),
    waktuWita.getUTCDate(),
    0, 0, 0, 0
  );

  const mulaiUtc = new Date(mulaiWita - OFFSET_WITA_MS);
  const akhirUtc = new Date(mulaiUtc.getTime() + 24 * 60 * 60 * 1000);

  return { mulaiUtc, akhirUtc };
}
