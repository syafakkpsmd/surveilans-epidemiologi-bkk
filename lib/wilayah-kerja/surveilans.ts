// lib/wilayah-kerja/surveilans.ts
// Murni (tanpa impor database), aman dipakai di mana saja.

/**
 * Wilayah kerja yang ikut laporan/seri surveilans: AKTIF di wilker_ref dan bukan kantor induk.
 * (Dulu memakai `kode <= "WK07"`, yang membuang wilayah baru dari pengaturan.) Wilayah yang tidak relevan untuk
 * surveilans (mis. bandara privat) cukup dinonaktifkan di /dashboard/pengaturan-wilayah-kerja.
 * Baris tanpa kolom `aktif` (migrasi belum dijalankan) dianggap aktif.
 */
export function wilkerSurveilans(w: { aktif?: boolean | null; jenis?: string | null }): boolean {
  return w.aktif !== false && w.jenis !== 'Kantor';
}
