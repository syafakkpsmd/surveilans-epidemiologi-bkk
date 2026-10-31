// lib/klinik/dataset.ts
import { createDbServiceClient } from '@/lib/db/serviceRole';
import { getDbClient } from '@/lib/db/client';
import { kunciSumberApp } from './akses';

export type BarisIcv = Record<string, string | number | null>;

export interface OpsiDataset {
  /** Batasi ke klinik tertentu (id klinik_binaan). undefined = semua. Array kosong = tidak ada klinik. */
  klinikIds?: string[];
}



export async function getDatasetKlinik(opsi?: OpsiDataset) {
  const supabase = createDbServiceClient();
  const { data: daftarKlinik } = await supabase
    .from('klinik_binaan')
    .select('id, nama_klinik, kategori, jenis_fasilitas, kabupaten_kota, spreadsheet_id')
    .order('nama_klinik');

  if (!daftarKlinik || daftarKlinik.length === 0) return [];

  const boleh = opsi?.klinikIds ? new Set(opsi.klinikIds) : null;
  const daftarDipakai = boleh ? daftarKlinik.filter((k) => boleh.has(k.id as string)) : daftarKlinik;
  if (daftarDipakai.length === 0) return [];

  // Baris dari Sheets (spreadsheet_id klinik) + baris yang diinput lewat aplikasi (app:<id klinik>)
  const idsValid = [...new Set([
    ...(daftarDipakai.map((k) => k.spreadsheet_id).filter(Boolean) as string[]),
    ...daftarDipakai.map((k) => kunciSumberApp(k.id as string)),
  ])];

  let grouped: Record<string, BarisIcv[]> = {};
  let gagalTotal = false;

  if (idsValid.length > 0) {
    try {
      const client = getDbClient();
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

  return daftarDipakai.map((klinik) => ({
    klinik,
    icv: [
      ...(klinik.spreadsheet_id ? (grouped[klinik.spreadsheet_id] ?? []) : []),
      ...(klinik.spreadsheet_id === kunciSumberApp(klinik.id as string) ? [] : (grouped[kunciSumberApp(klinik.id as string)] ?? [])),
    ],
    gagalDimuat: gagalTotal,
  }));
}

// Diturunkan langsung dari return type getDatasetKlinik — bukan didefinisikan
// manual — supaya kalau bentuk data berubah lagi (mis. field klinik nambah),
// error TypeScript langsung muncul di titik yang butuh disesuaikan, bukan
// diam-diam mismatch.
export type BarisDatasetKlinik = Awaited<ReturnType<typeof getDatasetKlinik>>[number];