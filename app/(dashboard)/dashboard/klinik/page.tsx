import KlinikDashboardClient from './KlinikDashboardClient';
import { getRingkasanKlinikMingguan, getRingkasanKlinikBulanan } from '@/lib/klinik/ringkasanPeriode';
import { getDatasetKlinik } from '@/lib/klinik/dataset';
import { ringkasanKartuIcv, donutJenisKelamin, donutUmur, donutJenisDokumenIcv, donutWus } from '@/lib/klinik/agregasiIcv';
import { getStandarHariVaksin } from '@/lib/klinik/pengaturan';
import { createClient } from '@/lib/supabase/server';
import { periodeMingguanDariTanggal, periodeBulananDariTanggal } from '@/lib/ai/periode';

const kategoriEfektif = (k: any) => k.kategori ?? 'klinik';

export default async function KlinikPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };

  const [dataMingguanAll, dataBulananAll, { data: daftarKlinikRow }, dataset, standarHariVaksin] = await Promise.all([
    getRingkasanKlinikMingguan(),
    getRingkasanKlinikBulanan(),
    supabase.from('klinik_binaan').select('nama_klinik, kategori').order('nama_klinik'),
    getDatasetKlinik(),
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

  const daftarKlinikNama = (daftarKlinikRow ?? []).filter((k) => kategoriEfektif(k) === 'klinik').map((k) => k.nama_klinik);
  const daftarBkkNama = (daftarKlinikRow ?? []).filter((k) => kategoriEfektif(k) === 'bkk').map((k) => k.nama_klinik);

  const sekarang = new Date();
  const periodeMingguSekarang = periodeMingguanDariTanggal(sekarang);
  const periodeBulanSekarang = periodeBulananDariTanggal(sekarang);

  return (
    <KlinikDashboardClient
      dataMingguanAll={dataMingguanAll}
      dataBulananAll={dataBulananAll}
      daftarKlinikNama={daftarKlinikNama}
      daftarBkkNama={daftarBkkNama}
      rekapGabungan={rekapGabungan}
      role={profile?.role ?? 'publik'}
      tahunBerjalan={periodeBulanSekarang.tahun}
      bulanBerjalan={periodeBulanSekarang.bulan}
      tahunEpidBerjalan={periodeMingguSekarang.tahun}
      mingguEpidBerjalan={periodeMingguSekarang.minggu}
      standarHariVaksin={standarHariVaksin}
    />
  );
}