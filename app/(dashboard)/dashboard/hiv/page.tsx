// app/(dashboard)/dashboard/hiv/page.tsx
// Mingguan dan Bulanan DIPISAH (seperti modul TB): hanya satu mode yang dihitung dan ditampilkan.
// Filter tahun, wilayah kerja, dan rentang periode berlaku untuk SEMUA bagian: kartu ringkasan, donut, reagen, dan grafik.
export const dynamic = 'force-dynamic';

import { getUserRole } from '@/lib/auth/get-user-role';
import {
  ambilHivRaw, getDaftarWilayahKerjaHiv, hitungRingkasanHiv, hitungDistribusi,
  hitungDistribusiUsia, hitungTrenMingguan, hitungTrenBulanan,
  hitungDiperiksaReaktifMingguan, hitungDiperiksaReaktifBulanan,
  hitungTrenMingguanHasilPerWilayah, hitungTrenMingguanHubunganBerisikoPerWilayah,
  hitungTrenBulananHasilPerWilayah, hitungTrenBulananHubunganBerisikoPerWilayah,
  bacaNomorMinggu, bacaNomorBulan, rapikanRentang,
  filterHivByRentangMinggu, filterHivByRentangBulan, potongDeret,
} from '@/lib/db/modul/hiv';
import HivClient from './HivClient';
import { bacaTahun } from '@/lib/tahun';

interface SearchParamsHiv {
  tahun?: string;
  wilayah?: string;
  granularitas?: string;
  minggu_mulai?: string;
  minggu_akhir?: string;
  bulan_mulai?: string;
  bulan_akhir?: string;
}

export default async function HalamanHiv({ searchParams }: { searchParams: Promise<SearchParamsHiv> }) {
  const sp = await searchParams;
  const tahun = sp.tahun ? bacaTahun(sp.tahun, 0) : new Date().getFullYear();
  const wilayah = sp.wilayah && sp.wilayah !== 'semua' ? sp.wilayah : undefined;
  const granularitas: 'mingguan' | 'bulanan' = sp.granularitas === 'bulanan' ? 'bulanan' : 'mingguan';

  const rentangMinggu = rapikanRentang(bacaNomorMinggu(sp.minggu_mulai), bacaNomorMinggu(sp.minggu_akhir), 53);
  const rentangBulan = rapikanRentang(bacaNomorBulan(sp.bulan_mulai), bacaNomorBulan(sp.bulan_akhir), 12);

  const [role, daftarWilayah, semuaRow] = await Promise.all([
    getUserRole(),
    getDaftarWilayahKerjaHiv(),
    ambilHivRaw(tahun),
  ]);

  // 1) wilayah, 2) rentang sesuai mode aktif. Semua perhitungan di bawah memakai rowsTampil.
  const rowsWilayah = wilayah ? semuaRow.filter(r => r.wilayah_kerja === wilayah) : semuaRow;
  const rowsTampil =
    granularitas === 'mingguan' && rentangMinggu
      ? filterHivByRentangMinggu(rowsWilayah, tahun, rentangMinggu[0], rentangMinggu[1])
      : granularitas === 'bulanan' && rentangBulan
        ? filterHivByRentangBulan(rowsWilayah, rentangBulan[0], rentangBulan[1])
        : rowsWilayah;

  // Wilayah yang digambar pada grafik per-wilayah: bila satu wilayah dipilih, hanya itu.
  const wilayahGrafik = wilayah ? [wilayah] : daftarWilayah;

  const potong = <T,>(deret: T[]): T[] => {
    const r = granularitas === 'mingguan' ? rentangMinggu : rentangBulan;
    return r ? potongDeret(deret, r[0], r[1]) : deret;
  };

  const mingguan = granularitas === 'mingguan';
  const trenTotal = potong(mingguan ? hitungTrenMingguan(rowsTampil, tahun) : hitungTrenBulanan(rowsTampil, tahun));
  const diperiksaReaktif = potong(
    mingguan ? hitungDiperiksaReaktifMingguan(rowsTampil, tahun) : hitungDiperiksaReaktifBulanan(rowsTampil, tahun)
  );
  const trenHasilPerWilayah = potong(
    mingguan
      ? hitungTrenMingguanHasilPerWilayah(rowsTampil, tahun, wilayahGrafik)
      : hitungTrenBulananHasilPerWilayah(rowsTampil, tahun, wilayahGrafik)
  );
  const trenHubunganPerWilayah = potong(
    mingguan
      ? hitungTrenMingguanHubunganBerisikoPerWilayah(rowsTampil, tahun, wilayahGrafik)
      : hitungTrenBulananHubunganBerisikoPerWilayah(rowsTampil, tahun, wilayahGrafik)
  );

  return (
    <HivClient
      role={role}
      daftarWilayah={daftarWilayah}
      wilayahGrafik={wilayahGrafik}
      tahunBerjalan={tahun}
      wilayahTerpilih={wilayah ?? 'semua'}
      granularitas={granularitas}
      mingguMulaiTerpasang={rentangMinggu ? `${tahun}-W${String(rentangMinggu[0]).padStart(2, '0')}` : ''}
      mingguAkhirTerpasang={rentangMinggu ? `${tahun}-W${String(rentangMinggu[1]).padStart(2, '0')}` : ''}
      bulanMulaiTerpasang={rentangBulan ? `${tahun}-${String(rentangBulan[0]).padStart(2, '0')}` : ''}
      bulanAkhirTerpasang={rentangBulan ? `${tahun}-${String(rentangBulan[1]).padStart(2, '0')}` : ''}
      ringkasan={hitungRingkasanHiv(rowsTampil)}
      donutJenisKelamin={hitungDistribusi(rowsTampil, 'sex')}
      donutUsia={hitungDistribusiUsia(rowsTampil)}
      donutStatusPerkawinan={hitungDistribusi(rowsTampil, 'status_perkawinan')}
      donutKunjungan={hitungDistribusi(rowsTampil, 'kunjungan')}
      donutHasil={hitungDistribusi(rowsTampil, 'hasil')}
      donutHubunganBerisiko={hitungDistribusi(rowsTampil, 'hubungan_berisiko')}
      barJenisReagen={hitungDistribusi(rowsTampil, 'jenis_reagen')}
      trenTotal={trenTotal}
      trenHasilPerWilayah={trenHasilPerWilayah}
      trenHubunganPerWilayah={trenHubunganPerWilayah}
      diperiksaReaktif={diperiksaReaktif}
    />
  );
}
