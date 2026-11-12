import 'server-only';
import { getDbClient } from '@/lib/db/client';
import { buatKamus, klausaWilayahSql, type Wilayah } from './index';

// Tabel data yang menyimpan nama wilayah sebagai teks di kolom wilayah_kerja.
const TABEL_DATA = [
  'kegiatan_cop', 'kegiatan_phqc', 'kunjungan_poliklinik', 'ttu', 'pab', 'tpp', 'rat_guard',
  'siaos', 'kier_kesehatan', 'hiv_data', 'tb_data', 'limbah_b3', 'izin_jenazah',
];

/** Jumlah baris data per kode wilayah (digabung dari semua tabel di atas). Tabel yang gagal dibaca dilewati. */
export async function hitungDataPerWilker(daftar: readonly Wilayah[]): Promise<Record<string, number>> {
  const kamus = buatKamus(daftar);
  const db = getDbClient();
  const hasil: Record<string, number> = {};

  await Promise.all(
    TABEL_DATA.map(async (tabel) => {
      try {
        const { rows } = await db.execute(
          `SELECT ${klausaWilayahSql()} AS k, count(*)::int AS n FROM ${tabel}
            WHERE wilayah_kerja IS NOT NULL AND wilayah_kerja <> '' GROUP BY 1`
        );
        for (const r of rows as { k: string; n: number }[]) {
          const kode = kamus.kodeDariTeks(r.k);
          if (kode) hasil[kode] = (hasil[kode] ?? 0) + Number(r.n);
        }
      } catch (e) {
        console.error(`[hitungDataPerWilker] ${tabel} dilewati:`, (e as { message?: string })?.message);
      }
    })
  );
  return hasil;
}