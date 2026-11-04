// lib/klinik/ckg/tanggalCkg.ts
//
// Pembungkus parseTanggalSheet (lib/klinik/tanggal.ts, dipakai bersama) untuk unggahan CKG.
// Tanpa pilihan zona waktu: yang dipakai selalu TANGGAL KALENDER sebagaimana tertulis di file,
// sehingga file dari WIB/WITA/WIT maupun dari luar negeri dibaca dengan cara yang sama.
//  - angka serial Excel (jam pecahan dibuang), dd/MM/yyyy, yyyy-MM-dd -> langsung parseTanggalSheet
//  - teks yang memuat jam ("2026-01-02T23:30:00+07:00", "2026-01-02 08:00", "02/01/2026 08:00", "...Z")
//    -> hanya bagian tanggalnya, lalu parseTanggalSheet. Jam dan offset diabaikan.
// Hasil: Date UTC tengah malam, sama seperti parseTanggalSheet.
import { parseTanggalSheet } from '@/lib/klinik/tanggal';

const TANGGAL_LALU_JAM = /^(\S+?)[T ]\d{1,2}:\d{2}/;

export function parseTanggalCkg(nilai: unknown): Date | null {
  if (nilai instanceof Date) {
    if (isNaN(nilai.getTime())) return null;
    return new Date(Date.UTC(nilai.getUTCFullYear(), nilai.getUTCMonth(), nilai.getUTCDate()));
  }
  if (typeof nilai === 'number') return parseTanggalSheet(Math.floor(nilai));
  if (typeof nilai === 'string') {
    const m = TANGGAL_LALU_JAM.exec(nilai.trim());
    if (m) return parseTanggalSheet(m[1]);
  }
  return parseTanggalSheet(nilai);
}

export function keIsoTanggal(d: Date): string {
  return d.toISOString().slice(0, 10);
}