import { getUserRole } from '@/lib/auth/get-user-role';
import {
  ambilHivRaw, getDaftarWilayahKerjaHiv, hitungRingkasanHiv, hitungDistribusi,
  hitungDistribusiUsia, hitungTrenMingguan, hitungTrenBulanan,
  hitungDiperiksaReaktifMingguan, hitungDiperiksaReaktifBulanan,
  hitungTrenMingguanHasilPerWilayah, hitungTrenMingguanHubunganBerisikoPerWilayah,
  hitungTrenBulananHasilPerWilayah, hitungTrenBulananHubunganBerisikoPerWilayah
} from '@/lib/turso/hiv';
import HivClient from './HivClient';

export default async function HalamanHiv({
  searchParams
}: {
  searchParams: Promise<{ tahun?: string; wilayah?: string }>;
}) {
  const { tahun: tahunParam, wilayah: wilayahParam } = await searchParams;
  const tahun = Number(tahunParam) || new Date().getFullYear();
  const wilayahFilter = wilayahParam || undefined;

  const [role, daftarWilayah, semuaRow] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaHiv(),
    ambilHivRaw(tahun)
  ]);

  const rowUntukRingkasan = wilayahFilter ? semuaRow.filter(r => r.wilayah_kerja === wilayahFilter) : semuaRow;

  const props = {
    role,
    daftarWilayah,
    tahunBerjalan: tahun,
    wilayahParam: wilayahFilter,
    ringkasan: hitungRingkasanHiv(rowUntukRingkasan),
    trenMingguan: hitungTrenMingguan(rowUntukRingkasan, tahun),
    trenBulanan: hitungTrenBulanan(rowUntukRingkasan, tahun),
    diperiksaReaktifMingguan: hitungDiperiksaReaktifMingguan(rowUntukRingkasan, tahun),
    diperiksaReaktifBulanan: hitungDiperiksaReaktifBulanan(rowUntukRingkasan, tahun),
    donutJenisKelamin: hitungDistribusi(rowUntukRingkasan, 'sex'),
    donutUsia: hitungDistribusiUsia(rowUntukRingkasan),
    donutStatusPerkawinan: hitungDistribusi(rowUntukRingkasan, 'status_perkawinan'),
    donutKunjungan: hitungDistribusi(rowUntukRingkasan, 'kunjungan'),
    donutHasil: hitungDistribusi(rowUntukRingkasan, 'hasil'),
    donutHubunganBerisiko: hitungDistribusi(rowUntukRingkasan, 'hubungan_berisiko'),
    barJenisReagen: hitungDistribusi(rowUntukRingkasan, 'jenis_reagen'),
    trenMingguanHasilPerWilayah: hitungTrenMingguanHasilPerWilayah(semuaRow, tahun, daftarWilayah),
    trenMingguanHubunganBerisikoPerWilayah: hitungTrenMingguanHubunganBerisikoPerWilayah(semuaRow, tahun, daftarWilayah),
    trenBulananHasilPerWilayah: hitungTrenBulananHasilPerWilayah(semuaRow, tahun, daftarWilayah),
    trenBulananHubunganBerisikoPerWilayah: hitungTrenBulananHubunganBerisikoPerWilayah(semuaRow, tahun, daftarWilayah)
  };

  return <HivClient {...props} />;
}