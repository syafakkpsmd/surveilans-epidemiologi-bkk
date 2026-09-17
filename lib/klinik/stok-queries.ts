import { getTursoClient } from '@/lib/turso/client';
import type { BarisStok } from './agregasiStok';

export type BarisStokMentah = {
  spreadsheetId: string;
  jenisStok: string;
  noBaris: number;
  tanggal: string;
  data: BarisStok;
};

// Ambil N baris TERAKHIR (berdasarkan no_baris, proxy urutan waktu) per klinik per jenis vaksin,
// dalam SATU query (bukan loop per klinik) - efisien untuk ~22 klinik x 6 jenis vaksin.
export async function getStokTerbaruSemua(
  daftarSpreadsheetId: string[],
  jumlahBarisTerakhir = 30
): Promise<BarisStokMentah[]> {
  const idsValid = daftarSpreadsheetId.filter(Boolean);
  if (idsValid.length === 0) return [];

  const client = getTursoClient();
  const placeholders = idsValid.map(() => '?').join(',');

  const sql = `
    WITH berurutan AS (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY spreadsheet_id, jenis_stok ORDER BY no_baris DESC) AS rn
      FROM stok_vaksin
      WHERE spreadsheet_id IN (${placeholders})
    )
    SELECT spreadsheet_id, jenis_stok, no_baris, tanggal, raw_json
    FROM berurutan
    WHERE rn <= ?
    ORDER BY spreadsheet_id, jenis_stok, no_baris DESC
  `;

  const result = await client.execute({ sql, args: [...idsValid, jumlahBarisTerakhir] });

  return result.rows.map((row) => ({
    spreadsheetId: row.spreadsheet_id as string,
    jenisStok: row.jenis_stok as string,
    noBaris: row.no_baris as number,
    tanggal: row.tanggal as string,
    data: JSON.parse(row.raw_json as string),
  }));
}
// Tambahkan fungsi ini ke file yang sudah ada (jangan hapus getStokTerbaruSemua)
export async function getStokDenganFilter(
  daftarSpreadsheetId: string[],
  tanggalMulai: string, // format yyyy-MM-dd
  tanggalAkhir: string  // format yyyy-MM-dd
): Promise<BarisStokMentah[]> {
  const idsValid = daftarSpreadsheetId.filter(Boolean);
  if (idsValid.length === 0) return [];

  const client = getTursoClient();
  const placeholders = idsValid.map(() => '?').join(',');

  const sql = `
    SELECT spreadsheet_id, jenis_stok, no_baris, tanggal, raw_json
    FROM stok_vaksin
    WHERE spreadsheet_id IN (${placeholders})
      AND tanggal >= ? AND tanggal <= ?
    ORDER BY spreadsheet_id, jenis_stok, no_baris ASC
  `;

  const result = await client.execute({ sql, args: [...idsValid, tanggalMulai, tanggalAkhir] });

  return result.rows.map((row) => ({
    spreadsheetId: row.spreadsheet_id as string,
    jenisStok: row.jenis_stok as string,
    noBaris: row.no_baris as number,
    tanggal: row.tanggal as string,
    data: JSON.parse(row.raw_json as string),
  }));
}