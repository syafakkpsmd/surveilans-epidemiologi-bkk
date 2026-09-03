// scripts/backfill-status-kepatuhan.ts
import { createClient } from '@supabase/supabase-js';
import { hitungStatusKepatuhan } from '../lib/pengawasan-klinik/hitungKepatuhan';
import type { Database } from '../types/database.types';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // pakai service role, bukan anon key
);

async function main() {
  const { data: rows, error } = await supabase
    .from('pengawasan_klinik')
    .select('*')
    .is('status_kepatuhan', null);

  if (error) throw error;
  console.log(`Ditemukan ${rows?.length ?? 0} baris tanpa status_kepatuhan.`);

  for (const row of rows ?? []) {
    const hasil = hitungStatusKepatuhan(row as unknown as Record<string, boolean | null>);
    const { error: updateError } = await supabase
      .from('pengawasan_klinik')
      .update({
        status_kepatuhan: hasil.status,
        persentase_kepatuhan: hasil.persentaseKepatuhan,
        item_bermasalah: hasil.itemBermasalah,
        skor_kritikal_gagal: hasil.jumlahKritikalGagal,
        skor_pendukung_gagal: hasil.jumlahPendukungGagal,
      })
      .eq('id', row.id);

    if (updateError) {
      console.error(`Gagal update ${row.id}:`, updateError.message);
    } else {
      console.log(`✓ ${row.id} -> ${hasil.status}`);
    }
  }
}

main();