// lib/db/modul/limbahB3.ts  (FILE BARU)
// SERVER-ONLY. Data mentah pemeriksaan limbah B3 untuk dasbor. Seluruh penilaian/agregasi dihitung di JS
// (lib/limbah-b3/hitung.ts), mengikuti pola lib/db/modul/poliklinik.ts.
import { getDbClient } from '@/lib/db/client';
import { KOLOM_BUTIR } from '@/lib/limbah-b3/butir';
import type { BarisB3 } from '@/lib/limbah-b3/hitung';

const KOLOM = [
  'id', 'wilayah_kerja', 'nama_klinik', 'tanggal_pemeriksaan', 'jenis_layanan',
  ...KOLOM_BUTIR, // nama kolom berasal dari konfigurasi, bukan masukan pengguna
  'temuan_utama', 'rekomendasi', 'batas_waktu_tindak_lanjut', 'status_tindak_lanjut',
].map((k) => `"${k}"`).join(', ');

/** Semua pemeriksaan pada satu tahun (semua wilayah; filter wilayah/bulan dilakukan di dasbor). */
export async function getPemeriksaanLimbahB3(tahun: number): Promise<BarisB3[]> {
  const r = await getDbClient().execute({
    sql: `SELECT ${KOLOM} FROM "limbah_b3" WHERE "tanggal_pemeriksaan" >= ? AND "tanggal_pemeriksaan" < ?
          ORDER BY "tanggal_pemeriksaan" DESC, "id" DESC`,
    args: [`${tahun}-01-01`, `${tahun + 1}-01-01`],
  });
  return r.rows as unknown as BarisB3[];
}
