// app/(dashboard)/dashboard/poliklinik/page.tsx
import {
  getKunjunganRawData,
  hitungRingkasanKunjungan,
  hitungTrenMingguanKunjungan,
  hitungTrenBulananKunjungan,
  hitungTopDiagnosa,
  hitungDonutJenisKelaminKunjungan,
  hitungDonutKelompokUsia,
  hitungBreakdownWilker,
  hitungPolaHariKunjungan,
  DAFTAR_WILKER_POLIKLINIK,
} from '@/lib/turso/poliklinik';
import PoliklinikClient from './PoliklinikClient';

export const dynamic = 'force-dynamic';

export default async function HalamanPoliklinik({
  searchParams,
}: {
  searchParams: { tahun?: string; wilayah?: string };
}) {
  const tahunBerjalan = new Date().getFullYear();
  const tahun = searchParams.tahun ? parseInt(searchParams.tahun, 10) : tahunBerjalan;
  const wilayahKerja = searchParams.wilayah && searchParams.wilayah !== 'semua' ? searchParams.wilayah : undefined;

  // rows: sudah difilter wilker (kalau dipilih) -- dipakai untuk semua
  // chart yang memang seharusnya ikut berubah sesuai filter wilker.
  // rowsSemuaWilker: TIDAK difilter wilker (cuma tahun) -- khusus untuk
  // chart perbandingan antar-wilker, supaya tetap tampil semua wilker
  // sebagai pembanding walau user sedang memfilter 1 wilker tertentu.
  const [rows, rowsSemuaWilker] = await Promise.all([
    getKunjunganRawData(tahun, wilayahKerja),
    wilayahKerja ? getKunjunganRawData(tahun) : Promise.resolve(null),
  ]);
  const dataUntukBreakdownWilker = rowsSemuaWilker ?? rows;

  const ringkasan = hitungRingkasanKunjungan(rows);
  const trenMingguan = hitungTrenMingguanKunjungan(rows);
  const trenBulanan = hitungTrenBulananKunjungan(rows);
  const topDiagnosa = hitungTopDiagnosa(rows, 10);
  const donutJenisKelamin = hitungDonutJenisKelaminKunjungan(rows);
  const donutKelompokUsia = hitungDonutKelompokUsia(rows);
  const breakdownWilker = hitungBreakdownWilker(dataUntukBreakdownWilker);
  const polaHari = hitungPolaHariKunjungan(rows);

  return (
    <PoliklinikClient
      tahunBerjalan={tahun}
      wilayahTerpilih={wilayahKerja ?? 'semua'}
      daftarWilker={DAFTAR_WILKER_POLIKLINIK}
      ringkasan={ringkasan}
      trenMingguan={trenMingguan}
      trenBulanan={trenBulanan}
      topDiagnosa={topDiagnosa}
      donutJenisKelamin={donutJenisKelamin}
      donutKelompokUsia={donutKelompokUsia}
      breakdownWilker={breakdownWilker}
      polaHari={polaHari}
    />
  );
}