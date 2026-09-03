// app/(dashboard)/dashboard/klinik/page.tsx
import KlinikClient from './KlinikClient';
import { getRingkasanKlinikMingguan, getRingkasanKlinikBulanan } from '@/lib/klinik/ringkasanPeriode';
import { getDatasetKlinik } from '@/lib/klinik/dataset';
import { ringkasanKartuIcv, donutJenisKelamin, donutUmur, donutJenisDokumenIcv, donutWus } from '@/lib/klinik/agregasiIcv';
import { getStandarHariVaksin } from '@/lib/klinik/pengaturan';
import { createClient } from '@/lib/supabase/server';
import { periodeMingguanDariTanggal, periodeBulananDariTanggal } from '@/lib/ai/periode';

export default async function KlinikPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };

  const [dataMingguan, dataBulanan, { data: daftarKlinikRow }, dataset, standarHariVaksin] = await Promise.all([
    getRingkasanKlinikMingguan(),
    getRingkasanKlinikBulanan(),
    supabase.from('klinik_binaan').select('nama_klinik').order('nama_klinik'),
    getDatasetKlinik(),
    getStandarHariVaksin(),
  ]);

  const semuaIcv = dataset.flatMap((d) => d.icv);
  const rekap = {
    kartu: ringkasanKartuIcv(semuaIcv),
    donutJenisKelamin: donutJenisKelamin(semuaIcv),
    donutUmur: donutUmur(semuaIcv),
    donutJenisDokumenIcv: donutJenisDokumenIcv(semuaIcv),
    donutWus: donutWus(semuaIcv),
  };

  const sekarang = new Date();
  const periodeMingguSekarang = periodeMingguanDariTanggal(sekarang);
  const periodeBulanSekarang = periodeBulananDariTanggal(sekarang);

  return (
    <KlinikClient
      daftarKlinik={(daftarKlinikRow ?? []).map((k) => k.nama_klinik)}
      dataMingguan={dataMingguan}
      dataBulanan={dataBulanan}
      rekap={rekap}
      role={profile?.role ?? 'publik'}
      tahunBerjalan={periodeBulanSekarang.tahun}
      bulanBerjalan={periodeBulanSekarang.bulan}
      tahunEpidBerjalan={periodeMingguSekarang.tahun}
      mingguEpidBerjalan={periodeMingguSekarang.minggu}
      standarHariVaksin={standarHariVaksin}
    />
  );
}