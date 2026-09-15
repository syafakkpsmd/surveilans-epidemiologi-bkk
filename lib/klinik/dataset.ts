// lib/klinik/dataset.ts — HAPUS unstable_cache di level ini, delegasikan ke per-klinik
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { readKlinikWorkbookCached } from './sheets';

export type BarisDatasetKlinik = {
  klinik: { id: string; nama_klinik: string; spreadsheet_id: string; [key: string]: any };
  icv: Record<string, any>[];
  /** true kalau fetch klinik ini gagal (mis. kena rate limit Google) — data icv/dst kosong sementara */
  gagalDimuat?: boolean;
  [key: string]: any;
};

// Batas request Google Sheets yang ditembak BERSAMAAN. Kuota default Google Sheets API
// adalah 60 read request/menit PER SERVICE ACCOUNT — kalau semua ~20 klinik di-fetch
// serentak (terutama saat cache kosong / cold start Vercel), gampang kena 429
// RESOURCE_EXHAUSTED. Dengan dibatasi per-batch + jeda, request tersebar dalam waktu,
// jauh di bawah limit per menit.
const BATAS_KONKUREN = 5;
const JEDA_ANTAR_BATCH_MS = 300;

function tidur(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Jalankan `fn` untuk tiap item, maksimal `batasKonkuren` job berjalan bersamaan,
 *  dengan jeda antar-batch. Kegagalan satu item TIDAK menghentikan item lain. */
async function petakanDenganBatasKonkuren<T, R>(
  items: T[],
  batasKonkuren: number,
  jedaMs: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const hasil: R[] = [];
  for (let i = 0; i < items.length; i += batasKonkuren) {
    const batch = items.slice(i, i + batasKonkuren);
    const hasilBatch = await Promise.all(batch.map(fn));
    hasil.push(...hasilBatch);

    const masihAdaBatchBerikutnya = i + batasKonkuren < items.length;
    if (masihAdaBatchBerikutnya && jedaMs > 0) {
      await tidur(jedaMs);
    }
  }
  return hasil;
}

export async function getDatasetKlinik(): Promise<BarisDatasetKlinik[]> {
  const supabase = createServiceRoleClient();
  const { data: daftarKlinik } = await supabase
    .from('klinik_binaan')
    .select('*')
    .not('spreadsheet_id', 'is', null);

  const semuaData = await petakanDenganBatasKonkuren(
    daftarKlinik ?? [],
    BATAS_KONKUREN,
    JEDA_ANTAR_BATCH_MS,
    async (k) => {
      try {
        const workbook = await readKlinikWorkbookCached(k.spreadsheet_id as string);
        return { klinik: k, ...workbook } as BarisDatasetKlinik;
      } catch (err) {
        // Satu klinik gagal (mis. 429 dari Google) tidak boleh menjatuhkan seluruh
        // dashboard — log untuk observability, lalu kembalikan baris kosong bertanda
        // gagal supaya klinik lain tetap tampil normal.
        console.error(`[getDatasetKlinik] Gagal memuat klinik "${k.nama_klinik}" (${k.id}):`, err);
        return {
          klinik: k,
          icv: [],
          gagalDimuat: true,
        } as BarisDatasetKlinik;
      }
    }
  );

  return semuaData;
}