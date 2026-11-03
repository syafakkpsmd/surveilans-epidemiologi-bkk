export const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
export const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Tanggal hari ini (YYYY-MM-DD) di zona waktu WITA, aman di server Vercel (UTC) maupun browser. */
export function hariIniWita(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Makassar" }).format(new Date());
}

/**
 * Periode laporan bawaan = bulan lalu (data Januari sampai bulan lalu).
 * Dibuka Oktober 2026 -> { tahun: 2026, bulanAkhir: 9 }.
 * Dibuka Januari 2027 -> { tahun: 2026, bulanAkhir: 12 } (laporan tahun sebelumnya).
 */
export function periodeBawaan(hariIni = hariIniWita()): { tahun: number; bulanAkhir: number } {
  const [t, b] = hariIni.split("-").map(Number);
  return b === 1 ? { tahun: t - 1, bulanAkhir: 12 } : { tahun: t, bulanAkhir: b - 1 };
}

/** "Januari sampai September 2026"; untuk bulanAkhir = 1 cukup "Januari 2026". */
export function labelRentang(tahun: number, bulanAkhir: number): string {
  return bulanAkhir === 1 ? `Januari ${tahun}` : `Januari sampai ${BULAN[bulanAkhir - 1]} ${tahun}`;
}

/** Label sumbu X untuk Januari sampai bulanAkhir. */
export function labelBulanan(bulanAkhir: number): string[] {
  return BULAN_SINGKAT.slice(0, bulanAkhir);
}

const idAngka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const idDesimal = (d: number) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

/** 12345 -> "12.345" */
export const fmtAngka = (n: number | null | undefined): string => (n == null || !Number.isFinite(n) ? "-" : idAngka.format(n));
/** 12.345 -> "12,3%" */
export const fmtPersen = (n: number | null | undefined, digit = 1): string =>
  n == null || !Number.isFinite(n) ? "-" : `${idDesimal(digit).format(n)}%`;
/** Selisih terhadap bulan sebelumnya, mis. "naik 12,5%" / "turun 3,0%" / "tetap". Null bila pembanding nol atau kosong. */
export function fmtPerubahan(sekarang: number, sebelumnya: number | null | undefined): string | undefined {
  if (sebelumnya == null || sebelumnya === 0) return undefined;
  const p = ((sekarang - sebelumnya) / sebelumnya) * 100;
  if (Math.abs(p) < 0.05) return "tetap dibanding bulan lalu";
  return `${p > 0 ? "naik" : "turun"} ${idDesimal(1).format(Math.abs(p))}% dari bulan sebelumnya`;
}
