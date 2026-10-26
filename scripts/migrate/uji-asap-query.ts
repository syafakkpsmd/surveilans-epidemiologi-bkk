// Uji asap: panggil fungsi-fungsi query aplikasi terhadap MariaDB untuk menangkap galat SQL
// (sintaks, nama kolom, tipe) SEBELUM dibuka di dashboard. Tidak menulis data.
//
// Jalankan dari root repo (butuh .env.local berisi DB_*):
//   npx tsx --env-file=.env.local scripts/migrate/uji-asap-query.ts
// Opsi: TAHUN=2026 npx tsx ... (default 2026)
//
// Hasil "OK (n)" berarti query jalan dan mengembalikan n baris/entri. "OK (0)" tidak selalu salah:
// bisa saja memang tidak ada data pada filter itu. "GALAT" berarti ada yang harus diperbaiki.
import { tutupDb } from '@/lib/db/client';
import * as hiv from '@/lib/turso/hiv';
import * as kier from '@/lib/turso/kier';
import * as sklt from '@/lib/turso/sklt';
import * as tb from '@/lib/turso/tb';
import * as poli from '@/lib/turso/poliklinik';
import * as qTb from '@/lib/turso/queriesTb';
import * as qHiv from '@/lib/turso/queriesHivVct';
import * as mal from '@/lib/turso/queriesMigrasiMalaria';
import * as modul from '@/lib/turso/queriesModulKlinik';
import * as kapal from '@/lib/turso/queriesPenumpangKapal';
import * as siaos from '@/lib/turso/queriesSiaos';
import * as posko from '@/lib/posko/queries';
import * as llo from '@/lib/status-laporan/queriesLaluLintasOrang';
import * as ispa from '@/lib/karhutla/ispaPoliklinik';
import * as stok from '@/lib/klinik/stok-queries';
import * as icv from '@/lib/klinik/turso-queries';

const T = Number(process.env.TAHUN ?? 2026);
let galat = 0;
let nol = 0;

function ukuran(x: unknown): number {
  if (Array.isArray(x)) return x.length;
  if (x instanceof Map) return x.size;
  if (x && typeof x === 'object') return Object.keys(x as object).length;
  return x == null ? 0 : 1;
}

async function uji(nama: string, fn: () => Promise<unknown>) {
  try {
    const n = ukuran(await fn());
    if (n === 0) nol++;
    console.log(`OK     ${nama} (${n})`);
  } catch (e) {
    galat++;
    console.log(`GALAT  ${nama}\n         ${(e as Error).message.split('\n')[0].slice(0, 230)}`);
  }
}

const kategori = ['jenis_kelamin', 'pekerjaan', 'pendidikan_terakhir', 'pernah_sakit_malaria', 'tahu_penyakit_malaria', 'tahu_gejala_malaria',
  'sekitar_pernah_sakit_malaria', 'pernah_dapat_informasi_malaria', 'punya_ternak', 'tempat_buang_hajat', 'pakai_baju_panjang_repellent', 'hasil_rdt'] as const;
const multi = ['pakai_saat_tidur', 'tempat_berobat', 'sekitar_dekat_dengan'] as const;

async function main() {
  // HIV
  await uji('hiv.ambilHivRaw', () => hiv.ambilHivRaw(T));
  await uji('hiv.getDaftarWilayahKerjaHiv', () => hiv.getDaftarWilayahKerjaHiv());
  await uji('queriesHivVct.getWilayahKerjaHiv', () => qHiv.getWilayahKerjaHiv());
  await uji('queriesHivVct.getBarisHivVct (tahun)', () => qHiv.getBarisHivVct({ tahun: T }));
  await uji('queriesHivVct.getBarisHivVct (tahun+bulan+wilker)', () => qHiv.getBarisHivVct({ tahun: T, bulan: 10, wilker: 'Samarinda' }));
  // KIER
  await uji('kier.getRingkasanKier', () => kier.getRingkasanKier(T));
  await uji('kier.getRingkasanKier (wilker)', () => kier.getRingkasanKier(T, 'Samarinda'));
  await uji('kier.getTrenMingguanKier', () => kier.getTrenMingguanKier(T, 1, 53));
  await uji('kier.getTrenBulananKier', () => kier.getTrenBulananKier(T, 1, 12));
  await uji('kier.getDaftarTahunKier', () => kier.getDaftarTahunKier());
  await uji('kier.getDaftarWilkerAktif', () => kier.getDaftarWilkerAktif(T));
  await uji('kier.getTrenMingguanPerWilkerKier', () => kier.getTrenMingguanPerWilkerKier(T, 1, 53));
  await uji('kier.getTrenBulananPerWilkerKier', () => kier.getTrenBulananPerWilkerKier(T, 1, 12));
  // SKLT
  await uji('sklt.getTahunSklt', () => sklt.getTahunSklt());
  await uji('sklt.getSkltData', () => sklt.getSkltData(T));
  // TB
  await uji('tb.getTbRawData', () => tb.getTbRawData(T));
  await uji('tb.getTbRawData (wilker)', () => tb.getTbRawData(T, 'Samarinda'));
  await uji('queriesTb.getWilayahKerjaTb', () => qTb.getWilayahKerjaTb());
  await uji('queriesTb.getBarisTb', () => qTb.getBarisTb({ tahun: T }));
  await uji('queriesTb.getBarisTb (bulan+wilker)', () => qTb.getBarisTb({ tahun: T, bulan: 10, wilker: 'Samarinda' }));
  // Poliklinik
  await uji('poliklinik.getKunjunganRawData', () => poli.getKunjunganRawData(T));
  await uji('poliklinik.getKunjunganRawData (wilker)', () => poli.getKunjunganRawData(T, 'Samarinda'));
  // Migrasi malaria
  await uji('malaria.getDaftarWilkerMigrasi', () => mal.getDaftarWilkerMigrasi());
  await uji('malaria.getRingkasanUtamaMigrasi', () => mal.getRingkasanUtamaMigrasi({ tahun: T }));
  for (const k of kategori) await uji(`malaria.getBreakdownKategoriMigrasi[${k}]`, () => mal.getBreakdownKategoriMigrasi({ tahun: T, kolom: k }));
  for (const k of multi) await uji(`malaria.getBreakdownMultiSelectMigrasi[${k}]`, () => mal.getBreakdownMultiSelectMigrasi({ tahun: T, kolom: k }));
  await uji('malaria.getRuteMigrasiTeratas', () => mal.getRuteMigrasiTeratas({ tahun: T }));
  await uji('malaria.getDistribusiUsiaMigrasi', () => mal.getDistribusiUsiaMigrasi({ tahun: T }));
  await uji('malaria.getTrenMingguanRdtGender', () => mal.getTrenMingguanRdtGender({ tahun: T, mgDari: 1, mgSampai: 53 }));
  await uji('malaria.getTrenBulananRdtGender', () => mal.getTrenBulananRdtGender({ tahun: T, bulanDari: 1, bulanSampai: 12 }));
  await uji('malaria.getBreakdownKapalPesawat', () => mal.getBreakdownKapalPesawat({ tahun: T, bulanDari: 1, bulanSampai: 12 }));
  await uji('malaria.getDonatUsiaMigrasiMalaria', () => mal.getDonatUsiaMigrasiMalaria({ tahun: T, bulanDari: 1, bulanSampai: 12 }));
  await uji('malaria.getDonatPekerjaanMigrasiMalaria', () => mal.getDonatPekerjaanMigrasiMalaria({ tahun: T, bulanDari: 1, bulanSampai: 12 }));
  // Modul klinik (tabel data)
  for (const m of ['poliklinik', 'kier', 'siaos', 'sklt'] as const) {
    await uji(`modulKlinik.getWilayahKerjaModul[${m}]`, () => modul.getWilayahKerjaModul(m));
    await uji(`modulKlinik.getBarisModul[${m}] tahun`, () => modul.getBarisModul(m, { tahun: T }));
    await uji(`modulKlinik.getBarisModul[${m}] bulan+wilker`, () => modul.getBarisModul(m, { tahun: T, bulan: 10, wilker: 'Samarinda' }));
  }
  // Penumpang kapal
  await uji('kapal.getPenumpangKapalMingguan', () => kapal.getPenumpangKapalMingguan(T));
  await uji('kapal.getPenumpangKapalMingguan (wilker)', () => kapal.getPenumpangKapalMingguan(T, 'Samarinda'));
  await uji('kapal.getPenumpangKapalBulanan', () => kapal.getPenumpangKapalBulanan(T));
  await uji('kapal.getPenumpangKapalMentah mingguan', () => kapal.getPenumpangKapalMentah({ tahun: T, granularitas: 'mingguan', awal: 1, akhir: 53 }));
  await uji('kapal.getPenumpangKapalMentah bulanan', () => kapal.getPenumpangKapalMentah({ tahun: T, granularitas: 'bulanan', awal: 1, akhir: 12, wilker: 'Samarinda' }));
  await uji('kapal.getWilayahKerjaPenumpangKapal', () => kapal.getWilayahKerjaPenumpangKapal());
  // SIAOS
  await uji('siaos.ambilDataSiaos', () => siaos.ambilDataSiaos());
  await uji('siaos.ambilDataSiaosByWilayahKerja', () => siaos.ambilDataSiaosByWilayahKerja('Samarinda'));
  // Posko
  await uji('posko.ambilDaftarPeriode[nataru]', () => posko.ambilDaftarPeriode('nataru', []));
  await uji('posko.ambilDaftarPeriode[idul_fitri]', () => posko.ambilDaftarPeriode('idul_fitri', []));
  await uji('posko.ambilInputHarianPosko', () => posko.ambilInputHarianPosko('nataru', T, `${T}-12-25`, 'Samarinda'));
  // Status laporan lalu lintas orang
  await uji('llo.ambilStatusMingguanLlo', () => llo.ambilStatusMingguanLlo(T, 40));
  await uji('llo.ambilStatusBulananLlo', () => llo.ambilStatusBulananLlo(T, 10));
  // Karhutla (ISPA dari poliklinik)
  await uji('karhutla.ambilIspaDariPoliklinik', () => ispa.ambilIspaDariPoliklinik(`${T}-10-01`, `${T}-10-31`));
  // Klinik: stok vaksin & ICV
  await uji('stok.getStokTerbaruSemua', () => stok.getStokTerbaruSemua(['sheet-uji-1']));
  await uji('stok.getStokDenganFilter', () => stok.getStokDenganFilter(['sheet-uji-1'], `${T}-01-01`, `${T}-12-31`));
  await uji('icv.getDataIcvBySpreadsheetId', () => icv.getDataIcvBySpreadsheetId('sheet-uji-1'));
  await uji('icv.getDatasetKlinikDariTurso', () => icv.getDatasetKlinikDariTurso(['sheet-uji-1']));
  await uji('icv.cariIcvByNik', () => icv.cariIcvByNik('3171234567890123'));

  console.log(`\nSelesai: ${galat} galat${nol ? `, ${nol} query mengembalikan 0 baris` : ''}.`);
  await tutupDb();
  process.exit(galat ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
