import KlinikDashboardClient from './KlinikDashboardClient';
import { getRingkasanKlinikMingguan, getRingkasanKlinikBulanan } from '@/lib/klinik/ringkasanPeriode';
import { getDatasetKlinik } from '@/lib/klinik/dataset';
import { ringkasanKartuIcv, donutJenisKelamin, donutUmur, donutJenisDokumenIcv, donutWus } from '@/lib/klinik/agregasiIcv';
import { getStandarHariVaksin } from '@/lib/klinik/pengaturan';
import { getAksesKlinik, opsiDariAkses } from '@/lib/klinik/akses';
import { getDbClient } from '@/lib/db/client';
import { periodeMingguanDariTanggal, periodeBulananDariTanggal } from '@/lib/ai/periode';
import { bacaTahun, jumlahMingguEpid } from '@/lib/tahun';

const kategoriEfektif = (k: any) => k.kategori ?? 'klinik';

export default async function KlinikPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string | string[] }>;
}) {
  const { tahun: tahunParam } = await searchParams;
  const tahun = bacaTahun(Array.isArray(tahunParam) ? tahunParam[0] : tahunParam);

  const akses = await getAksesKlinik();
  const user = akses.pengguna;
  const opsi = opsiDariAkses(akses); // petugas_klinik: hanya klinik yang ditautkan ke akunnya

  const [dataMingguanAll, dataBulananAll, { rows: daftarKlinikRow }, dataset, standarHariVaksin] = await Promise.all([
    getRingkasanKlinikMingguan(opsi, tahun),
    getRingkasanKlinikBulanan(opsi, tahun),
    getDbClient().execute('SELECT id, nama_klinik, kategori FROM klinik_binaan ORDER BY nama_klinik'),
    getDatasetKlinik({ ...opsi, tahun }), // kartu dan donat hanya untuk tahun terpilih
    getStandarHariVaksin(),
  ]);

  const semuaIcv = dataset.flatMap((d) => d.icv);
  const rekapGabungan = {
    kartu: ringkasanKartuIcv(semuaIcv),
    donutJenisKelamin: donutJenisKelamin(semuaIcv),
    donutUmur: donutUmur(semuaIcv),
    donutJenisDokumenIcv: donutJenisDokumenIcv(semuaIcv),
    donutWus: donutWus(semuaIcv),
  };

  // Klinik yang gagal dimuat (mis. kena rate limit Google Sheets saat fetch) —
  // ditampilkan sebagai peringatan di dashboard supaya user tahu angka rekap
  // sementara belum termasuk klinik-klinik ini, bukan berarti datanya nol.
  const klinikGagalDimuat = dataset
    .filter((d) => d.gagalDimuat)
    .map((d) => d.klinik.nama_klinik as string);

  const baris = (daftarKlinikRow ?? []).filter((k) => akses.semua || akses.klinikIds.includes(k.id as string));
  const daftarKlinikNama = baris.filter((k) => kategoriEfektif(k) === 'klinik').map((k) => k.nama_klinik);
  const daftarBkkNama = baris.filter((k) => kategoriEfektif(k) === 'bkk').map((k) => k.nama_klinik);

  const sekarang = new Date();
  const periodeMingguSekarang = periodeMingguanDariTanggal(sekarang);
  const periodeBulanSekarang = periodeBulananDariTanggal(sekarang);

  // Tahun yang dipilih bukan tahun ini: tampilkan seluruh bulan/minggu tahun itu.
  const tahunIni = tahun === periodeBulanSekarang.tahun;
  const bulanBerjalan = tahunIni ? periodeBulanSekarang.bulan : 12;
  const mingguEpidBerjalan = tahun === periodeMingguSekarang.tahun ? periodeMingguSekarang.minggu : jumlahMingguEpid(tahun);

  return (
    <KlinikDashboardClient
      key={tahun}
      dataMingguanAll={dataMingguanAll}
      dataBulananAll={dataBulananAll}
      daftarKlinikNama={daftarKlinikNama}
      daftarBkkNama={daftarBkkNama}
      rekapGabungan={rekapGabungan}
      klinikGagalDimuat={klinikGagalDimuat}
      role={user?.role ?? 'publik'}
      tahunBerjalan={tahun}
      bulanBerjalan={bulanBerjalan}
      tahunEpidBerjalan={tahun}
      mingguEpidBerjalan={mingguEpidBerjalan}
      standarHariVaksin={standarHariVaksin}
    />
  );
}
