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
  DAFTAR_WILKER_TB,
} from '@/lib/turso/tb';
import TbClient from './TbClient';

export const dynamic = 'force-dynamic';

export default async function HalamanTb({
  searchParams,
}: {
  searchParams: { tahun?: string; wilayah?: string };
}) {
  const tahunBerjalan = new Date().getFullYear();
  const tahun = searchParams.tahun ? parseInt(searchParams.tahun, 10) : tahunBerjalan;
  const wilayahKerja =
    searchParams.wilayah && searchParams.wilayah !== 'semua' ? searchParams.wilayah : undefined;

  const [{ sudahLogin, role }, rows, rowsSemuaWilker] = await Promise.all([
    getStatusAkses(),
    getTbRawData(tahun, wilayahKerja),
    // Dipakai KHUSUS untuk chart "per Wilayah Kerja" -- selalu semua
    // wilker (cuma difilter tahun) supaya tetap jadi pembanding walau
    // user sedang memfilter 1 wilker tertentu. Kalau tidak sedang
    // memfilter wilker, rows di atas sudah = data semua wilker, jadi
    // tidak perlu fetch dobel.
    wilayahKerja ? getTbRawData(tahun) : Promise.resolve(null),
  ]);
  const dataUntukBreakdownWilker = rowsSemuaWilker ?? rows;

  // roleAI: hanya admin/petugas/petugas_klinik yang boleh menekan
  // "Generate" di BoxAnalisisAI/BoxPrediksiAI -- pola sama seperti dipakai
  // di tempat lain di project ini.
  const roleAI = role === 'admin' || role === 'petugas' || role === 'petugas_klinik' ? role : null;

  const cascade = hitungCascadeTb(rows);
  const trenMingguan = hitungTrenMingguanTb(rows);
  const trenBulanan = hitungTrenBulananTb(rows);
  const breakdownFaktorRisiko = hitungBreakdownFaktorRisikoTb(rows);
  const breakdownWilker = hitungBreakdownWilkerTb(dataUntukBreakdownWilker);
  const delayDiagnosis = hitungDelayDiagnosisTb(rows);
  const distribusiKabKota = hitungDistribusiKabKotaTb(rows); // sudah dibatasi Top 15 + "Lainnya"
  const donutJenisKelamin = hitungDonutJenisKelaminTb(rows);

  // Data individu (nama, dll) terduga/kasus TBC adalah data sensitif --
  // TIDAK dikirim ke client sama sekali kalau tidak berwenang, supaya
  // tidak bocor lewat network tab walau di-UI disembunyikan.
  // Khusus admin & petugas_klinik yang boleh lihat daftar nama.
  const bolehLihatDaftarSensitif = role === 'admin' || role === 'petugas_klinik';
  const daftarLengkapBelumTindakLanjut = ambilDaftarBelumTindakLanjutTb(rows);
  const daftarBelumTindakLanjut = bolehLihatDaftarSensitif ? daftarLengkapBelumTindakLanjut : [];
  const jumlahBelumTindakLanjut = daftarLengkapBelumTindakLanjut.length;

  return (
    <TbClient
      sudahLogin={sudahLogin}
      roleAI={roleAI}
      tahunBerjalan={tahun}
      daftarWilker={DAFTAR_WILKER_TB}
      wilayahTerpilih={wilayahKerja ?? 'semua'}
      cascade={cascade}
      trenMingguan={trenMingguan}
      trenBulanan={trenBulanan}
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