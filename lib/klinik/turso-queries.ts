import { getTursoClient } from '@/lib/turso/client';

export type BarisIcv = Record<string, string | number | null>;

// Ambil data 1 klinik saja
export async function getDataIcvBySpreadsheetId(spreadsheetId: string): Promise<BarisIcv[]> {
  const client = getTursoClient();
  const result = await client.execute({
    sql: 'SELECT raw_json FROM data_icv WHERE spreadsheet_id = ?',
    args: [spreadsheetId],
  });
  return result.rows.map((row) => JSON.parse(row.raw_json as string));
}

// Ambil SEMUA klinik sekaligus dalam 1 query (pengganti getDatasetKlinik yang tadinya
// fetch paralel ~19-21 spreadsheet ke Google Sheets API)
export async function getDatasetKlinikDariTurso(
  daftarSpreadsheetId: string[]
): Promise<Record<string, BarisIcv[]>> {
  const idsValid = daftarSpreadsheetId.filter(Boolean);
  if (idsValid.length === 0) return {};

  const client = getTursoClient();
  const placeholders = idsValid.map(() => '?').join(',');
  const result = await client.execute({
    sql: `SELECT spreadsheet_id, raw_json FROM data_icv WHERE spreadsheet_id IN (${placeholders})`,
    args: idsValid,
  });

  const grouped: Record<string, BarisIcv[]> = {};
  for (const row of result.rows) {
    const sid = row.spreadsheet_id as string;
    (grouped[sid] ??= []).push(JSON.parse(row.raw_json as string));
  }
  return grouped;
}

// Pencarian by NIK - sekarang query terindeks langsung ke Turso,
// bukan load semua data dulu baru filter di memory
export async function cariIcvByNik(nik: string): Promise<BarisIcv[]> {
  const client = getTursoClient();
  const result = await client.execute({
    sql: 'SELECT raw_json FROM data_icv WHERE nik = ?',
    args: [nik],
  });
  return result.rows.map((row) => JSON.parse(row.raw_json as string));
}