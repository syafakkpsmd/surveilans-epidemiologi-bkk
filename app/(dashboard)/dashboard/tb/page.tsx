// app/(dashboard)/dashboard/tb/page.tsx
import { getStatusAkses } from '@/lib/auth/getStatusAkses'; // sesuaikan kalau path aslinya beda
import {
  getTbRawData,
  hitungCascadeTb,
  hitungTrenMingguanTb,
  hitungTrenBulananTb,
  hitungBreakdownFaktorRisikoTb,
  hitungBreakdownWilkerTb,
  hitungDelayDiagnosisTb,
  hitungDistribusiKabKotaTb,
  hitungDonutJenisKelaminTb,
  ambilDaftarBelumTindakLanjutTb,
  filterRowsByRentangMinggu,
  filterRowsByRentangBulan,
  DAFTAR_WILKER_TB,
  type TbRow,
} from '@/lib/turso/tb';
import TbClient from './TbClient';

export const dynamic = 'force-dynamic';

interface SearchParamsTb {
  tahun?: string;
  wilayah?: string;
  granularitas?: string;
  minggu_mulai?: string;
  minggu_akhir?: string;
  bulan_mulai?: string;
  bulan_akhir?: string;
}

export default async function HalamanTb({
  searchParams,
}: {
  // FIX: Next.js 15/16 -- searchParams di Server Component sekarang
  // Promise, WAJIB di-await dulu sebelum baca propertinya.
  searchParams: Promise<SearchParamsTb>;
}) {
  const sp = await searchParams;

  const tahunBerjalan = new Date().getFullYear();
  const tahun = sp.tahun ? parseInt(sp.tahun, 10) : tahunBerjalan;
  const wilayahKerja = sp.wilayah && sp.wilayah !== 'semua' ? sp.wilayah : undefined;
  const granularitas: 'mingguan' | 'bulanan' = sp.granularitas === 'bulanan' ? 'bulanan' : 'mingguan';

  const rentangMingguMulai = sp.minggu_mulai;
  const rentangMingguAkhir = sp.minggu_akhir;
  const rentangBulanMulai = sp.bulan_mulai;
  const rentangBulanAkhir = sp.bulan_akhir;

  const [{ sudahLogin, role }, rows, rowsSemuaWilker] = await Promise.all([
    getStatusAkses(),
    getTbRawData(tahun, wilayahKerja),
    // Dipakai KHUSUS chart "per Wilayah Kerja" -- selalu semua wilker
    // (cuma difilter tahun) supaya tetap jadi pembanding walau user
    // sedang memfilter 1 wilker tertentu.
    wilayahKerja ? getTbRawData(tahun) : Promise.resolve(null),
  ]);
  const rowsSemuaWilkerMentah = rowsSemuaWilker ?? rows;

  // roleAI: hanya admin/petugas/petugas_klinik yang boleh menekan
  // "Generate" di BoxAnalisisAI/BoxPrediksiAI.
  const roleAI = role === 'admin' || role === 'petugas' || role === 'petugas_klinik' ? role : null;

  // trenMingguan/trenBulanan versi LENGKAP (satu tahun penuh, sesuai
  // wilayah terpilih) -- dipakai untuk: (1) isi opsi dropdown rentang,
  // (2) periodeKeyTerakhir buat AI, supaya AI selalu pakai periode
  // TERBARU yang sungguhan ada datanya, tidak ikut terpotong rentang.
  const trenMingguanLengkap = hitungTrenMingguanTb(rows);
  const trenBulananLengkap = hitungTrenBulananTb(rows);

  // Terapkan filter rentang -- HANYA rentang yang cocok dengan
  // granularitas aktif yang dipakai (sesuai jawaban user: kalau lagi
  // mode Bulanan pakai rentang bulan, kalau Mingguan pakai rentang
  // minggu). Kalau rentang belum dipilih (masih default), tidak ada
  // filter tambahan -- tampil satu tahun penuh seperti biasa.
  function terapkanFilterRentang(data: TbRow[]): TbRow[] {
    if (granularitas === 'mingguan' && rentangMingguMulai && rentangMingguAkhir) {
      return filterRowsByRentangMinggu(data, rentangMingguMulai, rentangMingguAkhir);
    }
    if (granularitas === 'bulanan' && rentangBulanMulai && rentangBulanAkhir) {
      return filterRowsByRentangBulan(data, rentangBulanMulai, rentangBulanAkhir);
    }
    return data;
  }

  const rowsTerfilterRentang = terapkanFilterRentang(rows);
  const rowsWilkerTerfilterRentang = terapkanFilterRentang(rowsSemuaWilkerMentah);

  // SEMUA kartu ringkasan & grafik (kecuali chart Tren yang punya
  // versi "lengkap" tersendiri di atas) dihitung dari data yang SUDAH
  // ikut wilayah + rentang terpilih.
  const cascade = hitungCascadeTb(rowsTerfilterRentang);
  const trenMingguanTampil = hitungTrenMingguanTb(rowsTerfilterRentang);
  const trenBulananTampil = hitungTrenBulananTb(rowsTerfilterRentang);
  const breakdownFaktorRisiko = hitungBreakdownFaktorRisikoTb(rowsTerfilterRentang);
  const breakdownWilker = hitungBreakdownWilkerTb(rowsWilkerTerfilterRentang);
  const delayDiagnosis = hitungDelayDiagnosisTb(rowsTerfilterRentang);
  const distribusiKabKota = hitungDistribusiKabKotaTb(rowsTerfilterRentang); // sudah dibatasi Top 15 + "Lainnya"
  const donutJenisKelamin = hitungDonutJenisKelaminTb(rowsTerfilterRentang);

  // Data individu (nama, dll) terduga/kasus TBC adalah data sensitif --
  // TIDAK dikirim ke client sama sekali kalau tidak berwenang, supaya
  // tidak bocor lewat network tab walau di-UI disembunyikan.
  const bolehLihatDaftarSensitif = role === 'admin' || role === 'petugas_klinik';
  const daftarLengkapBelumTindakLanjut = ambilDaftarBelumTindakLanjutTb(rowsTerfilterRentang);
  const daftarBelumTindakLanjut = bolehLihatDaftarSensitif ? daftarLengkapBelumTindakLanjut : [];
  const jumlahBelumTindakLanjut = daftarLengkapBelumTindakLanjut.length;

  return (
    <TbClient
      sudahLogin={sudahLogin}
      roleAI={roleAI}
      tahunBerjalan={tahun}
      daftarWilker={DAFTAR_WILKER_TB}
      wilayahTerpilih={wilayahKerja ?? 'semua'}
      granularitas={granularitas}
      rentangMingguMulaiTerpasang={rentangMingguMulai ?? ''}
      rentangMingguAkhirTerpasang={rentangMingguAkhir ?? ''}
      rentangBulanMulaiTerpasang={rentangBulanMulai ?? ''}
      rentangBulanAkhirTerpasang={rentangBulanAkhir ?? ''}
      trenMingguanLengkap={trenMingguanLengkap}
      trenBulananLengkap={trenBulananLengkap}
      trenMingguanTampil={trenMingguanTampil}
      trenBulananTampil={trenBulananTampil}
      cascade={cascade}
      breakdownFaktorRisiko={breakdownFaktorRisiko}
      breakdownWilker={breakdownWilker}
      delayDiagnosis={delayDiagnosis}
      distribusiKabKota={distribusiKabKota}
      donutJenisKelamin={donutJenisKelamin}
      bolehLihatDaftarSensitif={bolehLihatDaftarSensitif}
      daftarBelumTindakLanjut={daftarBelumTindakLanjut}
      jumlahBelumTindakLanjut={jumlahBelumTindakLanjut}
    />
  );
}