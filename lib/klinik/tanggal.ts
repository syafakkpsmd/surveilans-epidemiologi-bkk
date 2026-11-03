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
export function parseTanggalSheet(nilai: any): Date | null {
  if (nilai === null || nilai === undefined || nilai === '') return null;

  // Kasus 1: angka serial Google Sheets (peninggalan sumber data lama,
  // dipertahankan sebagai jaring pengaman selama fallback Sheets belum
  // dipastikan mati total)
  if (typeof nilai === 'number') {
    return new Date(Date.UTC(1899, 11, 30) + nilai * 86400000);
  }

  if (typeof nilai !== 'string') return null;
  const str = nilai.trim();
  if (!str) return null;

  // Kasus 2: dd/MM/yyyy (format raw_json dari Turso)
  const bagianSlash = str.split('/');
  if (bagianSlash.length === 3) {
    const [dd, mm, yyyy] = bagianSlash.map(Number);
    if (dd && mm && yyyy) return new Date(Date.UTC(yyyy, mm - 1, dd));
  }

  // Kasus 3: yyyy-MM-dd
  const bagianDash = str.split('-');
  if (bagianDash.length === 3) {
    const [yyyy, mm, dd] = bagianDash.map(Number);
    if (dd && mm && yyyy) return new Date(Date.UTC(yyyy, mm - 1, dd));
  }

  return null;
}