// lib/klinik/dataset.ts — HAPUS unstable_cache di level ini, delegasikan ke per-klinik
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { readKlinikWorkbookCached } from './sheets';

export type BarisDatasetKlinik = {
  klinik: { id: string; nama_klinik: string; spreadsheet_id: string; [key: string]: any };
  icv: Record<string, any>[];
  [key: string]: any;
};

export async function getDatasetKlinik(): Promise<BarisDatasetKlinik[]> {
  const supabase = createServiceRoleClient();
  const { data: daftarKlinik } = await supabase
    .from('klinik_binaan')
    .select('*')
    .not('spreadsheet_id', 'is', null);

  const semuaData = await Promise.all(
    (daftarKlinik ?? []).map(async (k) => ({
      klinik: k,
      ...(await readKlinikWorkbookCached(k.spreadsheet_id as string)),
    }))
  );
  return semuaData as BarisDatasetKlinik[];
}