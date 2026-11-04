// app/(dashboard)/dashboard/poliklinik/page.tsx
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/get-user-role';
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
} from '@/lib/db/modul/poliklinik';
import PoliklinikClient from './PoliklinikClient';

export const dynamic = 'force-dynamic';

const tombol = 'rounded border px-3 py-1.5 text-sm hover:bg-gray-50';
const tombolUtama = 'rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90';

export default async function HalamanPoliklinik({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; wilayah?: string; sumber?: string }>;
}) {
  const params = await searchParams;
    const role = await getUserRole();
  const admin = role === 'admin';
  const petugasKlinik = role === 'petugas_klinik';
  const bolehInputBkk = admin || petugasKlinik;
  const bolehLihatNonBkk = admin || petugasKlinik || role === 'petugas';
  const bolehGabungan = bolehLihatNonBkk;

  const tahunBerjalan = new Date().getFullYear();
  const tahun = params.tahun ? parseInt(params.tahun, 10) : tahunBerjalan;
  const wilayahKerja = params.wilayah && params.wilayah !== 'semua' ? params.wilayah : undefined;
  const sumber: 'bkk' | 'semua' = bolehGabungan && params.sumber === 'semua' ? 'semua' : 'bkk';

  const [rows, rowsSemuaWilker] = await Promise.all([
    getKunjunganRawData(tahun, wilayahKerja, sumber),
    wilayahKerja ? getKunjunganRawData(tahun, undefined, sumber) : Promise.resolve(null),
  ]);
  const dataUntukBreakdownWilker = rowsSemuaWilker ?? rows;

  return (
    <PoliklinikClient
      tahunBerjalan={tahun}
      wilayahTerpilih={wilayahKerja ?? 'semua'}
      daftarWilker={DAFTAR_WILKER_POLIKLINIK}
      basePath={sumber === 'semua' ? '/dashboard/poliklinik?sumber=semua' : '/dashboard/poliklinik'}
            aksiHeader={
        bolehLihatNonBkk ? (
          <>
            {bolehInputBkk && (
              <Link href="/dashboard/poliklinik/input" className={tombolUtama}>
                + Input Data
              </Link>
            )}
            <Link href="/dashboard/poliklinik-non-bkk" className={tombol}>
              {admin ? 'Poliklinik Non-BKK' : 'Lihat Poliklinik Non-BKK'}
            </Link>
            {admin && (
              <Link href="/admin/master" className={tombol}>
                Pengaturan Poliklinik
              </Link>
            )}
            <Link
              href={sumber === 'semua' ? '/dashboard/poliklinik' : '/dashboard/poliklinik?sumber=semua'}
              className={tombol}
            >
              {sumber === 'semua' ? 'Hanya data BKK' : 'Lihat semua (termasuk non-BKK)'}
            </Link>
          </>
        ) : null
      }
      ringkasan={hitungRingkasanKunjungan(rows)}
      trenMingguan={hitungTrenMingguanKunjungan(rows)}
      trenBulanan={hitungTrenBulananKunjungan(rows)}
      trenPerWilkerMingguan={hitungTrenPerWilkerMingguan(dataUntukBreakdownWilker)}
      trenPerWilkerBulanan={hitungTrenPerWilkerBulanan(dataUntukBreakdownWilker)}
      topDiagnosa={hitungTopDiagnosa(rows, 10)}
      donutJenisKelamin={hitungDonutJenisKelaminKunjungan(rows)}
      donutKelompokUsia={hitungDonutKelompokUsia(rows)}
      donutKategoriPasien={hitungDonutKategoriPasien(rows)}
      breakdownWilker={hitungBreakdownWilker(dataUntukBreakdownWilker)}
      polaHari={hitungPolaHariKunjungan(rows)}
    />
  );
}