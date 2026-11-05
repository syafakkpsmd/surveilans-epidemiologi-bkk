// lib/klinik/tanggal.ts
//
// WAJIB pakai fungsi ini untuk parsing tanggal ICV, JANGAN `new Date(str)`
// langsung - string "02/01/2026" akan salah diinterpretasikan sebagai
// MM/DD/YYYY (1 Februari) oleh parser bawaan JS, bukan 2 Januari seperti
// yang dimaksud.
//
// Dibuat dengan Date.UTC (bukan new Date(y,m,d) local time) supaya field
// UTC-nya konsisten dengan periodeMingguanDariTanggal/periodeBulananDariTanggal
// di lib/ai/periode.ts, yang membaca getUTCFullYear/getUTCMonth/getUTCDate.
export function parseTanggalSheet(nilai: unknown): Date | null {
  if (nilai === null || nilai === undefined || nilai === '') return null;

  // Objek Date (kalau pembaca Excel memakai cellDates: true)
  if (nilai instanceof Date) {
    if (isNaN(nilai.getTime())) return null;
    return new Date(Date.UTC(nilai.getFullYear(), nilai.getMonth(), nilai.getDate()));
  }

  // Serial Excel/Sheets; rentang 20000-80000 menolak angka biasa seperti 2026
  if (typeof nilai === 'number') {
    if (nilai < 20000 || nilai > 80000) return null;
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(nilai) * 86400000);
  }

  if (typeof nilai !== 'string') return null;

  // Buang jam: "20/01/2026 08:30" atau "2026-01-20T08:30:00Z"
  const str = nilai.trim().split(/[T\s]/)[0];
  const m = str.match(/^(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})$/);
  if (!m) return null;

  const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let yyyy: number, mm: number, dd: number;
  if (m[1].length === 4) {
    yyyy = a; mm = b; dd = c;                      // yyyy-MM-dd
  } else {
    dd = a; mm = b; yyyy = c < 100 ? 2000 + c : c; // dd/MM/yyyy, dd-MM-yyyy, dd.MM.yy
  }
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return d.getUTCMonth() === mm - 1 ? d : null;    // tolak 31/02 dan sejenisnya
}