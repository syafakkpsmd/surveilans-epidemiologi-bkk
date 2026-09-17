// lib/klinik/dataset.ts
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { getTursoClient } from '@/lib/turso/client';

export type BarisIcv = Record<string, string | number | null>;

export async function getDatasetKlinik() {
  const supabase = createServiceRoleClient();
  const { data: daftarKlinik } = await supabase
    .from('klinik_binaan')
    .select('id, nama_klinik, kategori, jenis_fasilitas, kabupaten_kota, spreadsheet_id')
    .order('nama_klinik');

  if (!daftarKlinik || daftarKlinik.length === 0) return [];

  const idsValid = daftarKlinik.map((k) => k.spreadsheet_id).filter(Boolean) as string[];

  let grouped: Record<string, BarisIcv[]> = {};
  let gagalTotal = false;

  if (idsValid.length > 0) {
    try {
      const client = getTursoClient();
      const placeholders = idsValid.map(() => '?').join(',');
      const result = await client.execute({
        sql: `SELECT spreadsheet_id, raw_json FROM data_icv WHERE spreadsheet_id IN (${placeholders})`,
        args: idsValid,
      });
      for (const row of result.rows) {
        const sid = row.spreadsheet_id as string;
        (grouped[sid] ??= []).push(JSON.parse(row.raw_json as string));
      }
    } catch (err) {
      console.error('Gagal ambil data ICV dari Turso:', err);
      gagalTotal = true;
    }
  }

  return daftarKlinik.map((klinik) => ({
    klinik,
    icv: klinik.spreadsheet_id ? (grouped[klinik.spreadsheet_id] ?? []) : [],
    gagalDimuat: gagalTotal,
  }));
}

// Diturunkan langsung dari return type getDatasetKlinik — bukan didefinisikan
// manual — supaya kalau bentuk data berubah lagi (mis. field klinik nambah),
// error TypeScript langsung muncul di titik yang butuh disesuaikan, bukan
// diam-diam mismatch.
export type BarisDatasetKlinik = Awaited<ReturnType<typeof getDatasetKlinik>>[number];