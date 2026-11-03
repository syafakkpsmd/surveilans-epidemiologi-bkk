import * as XLSX from 'xlsx';

/** Unduh data yang sudah ada sebagai file .xlsx (bukan template kosong) */
export function unduhExcel<T extends Record<string, unknown>>(
  namaFile: string,
  namaSheet: string,
  kolom: { key: keyof T; label: string }[],
  baris: T[]
) {
  const header = kolom.map((k) => k.label);
  const isi = baris.map((b) => kolom.map((k) => b[k.key] ?? ''));
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...isi]);
  worksheet['!cols'] = header.map((h) => ({ wch: Math.max(h.length + 4, 12) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, namaSheet);
  XLSX.writeFile(workbook, namaFile);
}