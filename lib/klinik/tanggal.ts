// lib/klinik/tanggal.ts
export function parseTanggalSheet(nilai: any): Date | null {
  if (nilai === null || nilai === undefined || nilai === '') return null;

  // Kasus 1: angka serial Google Sheets (muncul karena valueRenderOption UNFORMATTED_VALUE)
  if (typeof nilai === 'number') {
    return new Date(Date.UTC(1899, 11, 30) + nilai * 86400000);
  }

  // Kasus 2: string format DD/MM/YYYY (format umum di sheet ini)
  if (typeof nilai === 'string') {
    const cocok = nilai.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (cocok) {
      const [, dd, mm, yyyy] = cocok;
      return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    }
    const fallback = new Date(nilai);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  return null;
}