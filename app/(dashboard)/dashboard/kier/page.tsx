// app/(dashboard)/dashboard/kier/page.tsx
import {
  getRingkasanKier,
  getTrenMingguanKier,
  getTrenBulananKier,
  getTrenMingguanPerWilkerKier,
  getTrenBulananPerWilkerKier,
  getDaftarTahunKier,
  getDaftarWilkerAktif,
  DAFTAR_WILKER_KIER,
} from '@/lib/turso/kier';
import KierClient from './KierClient';

export default async function HalamanKierKesehatan({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;

  const sekarang = new Date();
  const tahun = Number(params.tahun) || sekarang.getFullYear();
  const wilayahKerja = params.wilker || undefined; // undefined = Semua Wilayah Kerja

  const mingguAwal = Number(params.mingguAwal) || 1;
  const mingguAkhir = Number(params.mingguAkhir) || 52;
  const bulanAwal = Number(params.bulanAwal) || 1;
  const bulanAkhir = Number(params.bulanAkhir) || 12;

  // Daftar wilker AKTIF (sesuai data asli di Turso) diambil dulu, supaya
  // breakdown mingguan/bulanan di bawah pasti cocok dengan ejaan aslinya.
  const daftarWilkerAktif = await getDaftarWilkerAktif(tahun);

  const [ringkasan, trenMingguan, trenBulanan, trenMingguanWilker, trenBulananWilker, daftarTahun] = await Promise.all([
    getRingkasanKier(tahun, wilayahKerja),
    getTrenMingguanKier(tahun, mingguAwal, mingguAkhir, wilayahKerja),
    getTrenBulananKier(tahun, bulanAwal, bulanAkhir, wilayahKerja),
    getTrenMingguanPerWilkerKier(tahun, mingguAwal, mingguAkhir, daftarWilkerAktif),
    getTrenBulananPerWilkerKier(tahun, bulanAwal, bulanAkhir, daftarWilkerAktif),
    getDaftarTahunKier(),
  ]);

  return (
    <KierClient
      tahun={tahun}
      wilayahKerja={wilayahKerja}
      daftarWilker={DAFTAR_WILKER_KIER}
      daftarWilkerAktifAwal={daftarWilkerAktif}
      daftarTahun={daftarTahun.length > 0 ? daftarTahun : [sekarang.getFullYear()]}
      ringkasan={ringkasan}
      trenMingguanAwal={trenMingguan}
      trenBulananAwal={trenBulanan}
      trenMingguanWilkerAwal={trenMingguanWilker}
      trenBulananWilkerAwal={trenBulananWilker}
      rentangAwal={{ mingguAwal, mingguAkhir, bulanAwal, bulanAkhir }}
    />
  );
}