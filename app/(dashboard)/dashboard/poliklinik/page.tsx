// app/(dashboard)/dashboard/poliklinik/page.tsx
import {
  getKunjunganRawData,
  hitungRingkasanKunjungan,
  hitungTrenMingguanKunjungan,
  hitungTrenBulananKunjungan,
  hitungTrenPerWilkerMingguan,
  hitungTrenPerWilkerBulanan,
  hitungTopDiagnosa,
  hitungDonutJenisKelaminKunjungan,
  hitungDonutKelompokUsia,
  hitungDonutKategoriPasien,
  hitungBreakdownWilker,
  hitungPolaHariKunjungan,
  DAFTAR_WILKER_POLIKLINIK,
} from '@/lib/turso/poliklinik';
import PoliklinikClient from './PoliklinikClient';

export const dynamic = 'force-dynamic';

export default async function HalamanPoliklinik({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; wilayah?: string }>;
}) {
  const params = await searchParams;
  const tahunBerjalan = new Date().getFullYear();
  const tahun = params.tahun ? parseInt(params.tahun, 10) : tahunBerjalan;
  const wilayahKerja = params.wilayah && params.wilayah !== 'semua' ? params.wilayah : undefined;

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
  // Chart perbandingan antar-wilker cuma dipakai/dirender saat wilayahKerja
  // tidak difilter ('semua'), tapi tetap dihitung dari dataUntukBreakdownWilker
  // supaya konsisten dengan breakdownWilker di bawah.
  const trenPerWilkerMingguan = hitungTrenPerWilkerMingguan(dataUntukBreakdownWilker);
  const trenPerWilkerBulanan = hitungTrenPerWilkerBulanan(dataUntukBreakdownWilker);
  const topDiagnosa = hitungTopDiagnosa(rows, 10);
  const donutJenisKelamin = hitungDonutJenisKelaminKunjungan(rows);
  const donutKelompokUsia = hitungDonutKelompokUsia(rows);
  const donutKategoriPasien = hitungDonutKategoriPasien(rows);
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
      trenPerWilkerMingguan={trenPerWilkerMingguan}
      trenPerWilkerBulanan={trenPerWilkerBulanan}
      topDiagnosa={topDiagnosa}
      donutJenisKelamin={donutJenisKelamin}
      donutKelompokUsia={donutKelompokUsia}
      donutKategoriPasien={donutKategoriPasien}
      breakdownWilker={breakdownWilker}
      polaHari={polaHari}
    />
  );
}