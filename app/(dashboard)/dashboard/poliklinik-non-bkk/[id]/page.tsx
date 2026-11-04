import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cekAkses, getPoliklinikById, getKunjunganPoliklinik } from '@/lib/db/modul/poliklinikNonBkk';
import {
  hitungRingkasanKunjungan, hitungTrenMingguanKunjungan, hitungTrenBulananKunjungan, hitungTopDiagnosa,
  hitungDonutJenisKelaminKunjungan, hitungDonutKelompokUsia, hitungDonutKategoriPasien,
  hitungPolaHariKunjungan, DAFTAR_WILKER_POLIKLINIK,
} from '@/lib/db/modul/poliklinik';
import PoliklinikClient from '../../poliklinik/PoliklinikClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPoliklinikNonBkk({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tahun?: string }>;
}) {
  const { id } = await params;
  const { tahun: t } = await searchParams;

  const akses = await cekAkses(id);
  if (!akses.user) redirect('/login');
  if (!akses.lihat) redirect('/dashboard');

  const p = await getPoliklinikById(id);
  if (!p) notFound();

  const tahunIni = new Date().getFullYear();
  const parsed = t ? parseInt(t, 10) : tahunIni;
  const tahun = Number.isInteger(parsed) && parsed >= 2020 && parsed <= tahunIni + 1 ? parsed : tahunIni;

  const rows = await getKunjunganPoliklinik(id, tahun);

  return (
    <PoliklinikClient
      mode="klinik"
      judul={p.nama}
      subjudul="Rekap kunjungan pasien poliklinik"
      basePath={`/dashboard/poliklinik-non-bkk/${id}`}
      aksiHeader={
        akses.kelola ? (
          <Link href={`/dashboard/poliklinik-non-bkk/${id}/input`}
            className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            + Input Data
          </Link>
        ) : null
      }
      tahunBerjalan={tahun}
      wilayahTerpilih="semua"
      daftarWilker={DAFTAR_WILKER_POLIKLINIK}
      ringkasan={hitungRingkasanKunjungan(rows)}
      trenMingguan={hitungTrenMingguanKunjungan(rows)}
      trenBulanan={hitungTrenBulananKunjungan(rows)}
      topDiagnosa={hitungTopDiagnosa(rows, 10)}
      donutJenisKelamin={hitungDonutJenisKelaminKunjungan(rows)}
      donutKelompokUsia={hitungDonutKelompokUsia(rows)}
      donutKategoriPasien={hitungDonutKategoriPasien(rows)}
      breakdownWilker={[]}
      polaHari={hitungPolaHariKunjungan(rows)}
    />
  );
}