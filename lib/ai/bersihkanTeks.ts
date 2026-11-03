// ================================================================
// SEGMEN 13 — lib/ai/bersihkanTeks.ts
// Migrasi PERSIS dari fungsi bersihkan()/s() di Code.gs (EPIC-AI).
// Menghapus karakter kontrol/non-ASCII, ganti tanda kutip & backslash,
// supaya string aman dikirim sebagai bagian dari prompt/JSON payload.
// ================================================================

export function bersihkanTeks(nilai: unknown): string {
  const teks = String(nilai ?? '');
  let hasil = '';

  for (const ch of teks) {
    const kode = ch.charCodeAt(0);
    if (kode === 10 || kode === 13 || kode === 9) {
      hasil += ' ';
    } else if (kode < 32 || kode > 126) {
      hasil += ' ';
    } else if (kode === 34) {
      hasil += "'";
    } else if (kode === 92) {
      hasil += '/';
    } else {
      hasil += ch;
    }
  }

  return hasil.replace(/\s{2,}/g, ' ').trim();
}