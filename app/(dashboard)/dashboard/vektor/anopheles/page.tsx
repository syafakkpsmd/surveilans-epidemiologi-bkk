// ================================================================
// app/(dashboard)/dashboard/vektor/anopheles/page.tsx (VERSI BARU)
// ================================================================

import { getWilkerRef } from '@/lib/supabase/queries';
import {
  getTrenAnophelesDewasa,
  getMetodeTangkap,
} from '@/lib/supabase/queries'; // sudah digabung ke queries.ts
import { getUserRole } from '@/lib/auth/get-user-role';
import FilterWilker from '@/components/vektor/FilterWilker';
import FilterZonaSubLokasi from '@/components/vektor/FilterZonaSubLokasi';
import PanelTrenPeriode from '@/components/vektor/PanelTrenPeriode';
import DonutChart from '@/components/vektor/DonutChart';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import { getMingguEpidSaatIni } from '@/lib/epi-week';
import FilterRentangMinggu from '@/components/vektor/FilterRentangMinggu';
import { getBanyakHasilAI, kunciAI, type PermintaanHasilAI } from '@/lib/ai/getBanyakHasilAI';

export default async function AnophelesDewasaPage({
  searchParams,
}: {
  searchParams: Promise<{
    wilker?: string;
    tahun?: string;
    mgDari?: string;
    mgSampai?: string;
    bulanDari?: string;
    bulanSampai?: string;
    mode?: string;
  }>;
}) {
  const { wilker, tahun: tahunParam, mgDari, mgSampai, bulanDari, bulanSampai, mode } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();
  const { mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();
  const bulanBerjalanNum = new Date().getMonth() + 1;

  const modeAktif: 'mingguan' | 'bulanan' = mode === 'bulanan' ? 'bulanan' : 'mingguan';

  // Rentang Mingguan (dari FilterRentangMinggu: angka polos "1".."52")
  const mgAwalDipilih = mgDari ? parseInt(mgDari, 10) : mingguBerjalan;
  const mgAkhirDipilih = mgSampai ? parseInt(mgSampai, 10) : mingguBerjalan;
  const periodeKeyMingguan = `${tahun}-W${mgAwalDipilih}_W${mgAkhirDipilih}`;

  // Rentang Bulanan (dari FilterRentangBulan: format "2026-01" -- tahun
  // digabung dengan bulan, jadi tahun rentang diambil dari string ini,
  // bukan dari param `tahun` biasa)
  const bulanAwalDipilih = bulanDari ? parseInt(bulanDari.split('-')[1], 10) : bulanBerjalanNum;
  const bulanAkhirDipilih = bulanSampai ? parseInt(bulanSampai.split('-')[1], 10) : bulanBerjalanNum;
  const tahunBulan = bulanDari ? parseInt(bulanDari.split('-')[0], 10) : tahun;
  const periodeKeyBulanan = `${tahunBulan}-M${bulanAwalDipilih}_M${bulanAkhirDipilih}`;

  const konteksMingguan = 'anopheles-dewasa-mingguan';
  const konteksBulanan = 'anopheles-dewasa-bulanan';

  // ============================================================
  // BATCH-FETCH HASIL AI -- Box AI di halaman ini mengikuti tab
  // (Mingguan/Bulanan) yang lagi aktif, jadi cuma SATU pasang
  // (analisis + prediksi) yang benar-benar dirender & dibutuhkan
  // per render server -- bukan 4 kombinasi sekaligus (beda dari
  // PHQC/Vektor Aedes yang semua boxnya tampil bersamaan). Konteks
  // & periodeKey dipilih sesuai modeAktif, lalu getBanyakHasilAI
  // dipanggil sedini mungkin & di-await belakangan bareng query
  // chart, supaya jalan PARALEL.
  // ============================================================
  const konteksAktif = modeAktif === 'mingguan' ? konteksMingguan : konteksBulanan;
  const periodeKeyAktif = modeAktif === 'mingguan' ? periodeKeyMingguan : periodeKeyBulanan;
  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, tipe: 'analisis' },
    { konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, tipe: 'prediksi' },
  ];
  const hasilAIPromise = getBanyakHasilAI(permintaanAI);

  const [role, daftarWilker, dataMingguan, dataBulanan, metodeTangkap] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getTrenAnophelesDewasa(tahun, wilker, 'mingguan'),
    getTrenAnophelesDewasa(tahun, wilker, 'bulanan'),
    getMetodeTangkap(tahun, wilker),
  ]);

  // Ambil hasil batch AI yang sudah jalan di background sejak awal fungsi ini.
  const hasilAI = await hasilAIPromise;
  const hasilAnalisisAktif = hasilAI[kunciAI({ konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, tipe: 'analisis' })];
  const hasilPrediksiAktif = hasilAI[kunciAI({ konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, tipe: 'prediksi' })];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🦟 Surveilans Vektor Anopheles — Dewasa</h1>
          <p className="text-sm text-gray-500">
            MHD, MBR, korelasi cuaca/suhu/kelembaban, dan metode tangkap.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} />
          <FilterZonaSubLokasi />
        </div>
      </div>

      <PanelTrenPeriode
        judulBulanan="Distribusi Hasil Survei Nyamuk Anopheles di Wilayah Kerja BKK Kelas I Samarinda"
        judulMingguan="Tren Mingguan Hasil Survei Nyamuk Anopheles di Wilayah Kerja BKK Kelas I Samarinda"
        dataMingguan={dataMingguan}
        dataBulanan={dataBulanan}
        seriesListMingguan={[
          { key: 'mhd', label: 'MHD', warna: '#0F2A38' },
          { key: 'mbr', label: 'MBR (per jam)', warna: '#1B5E20' },
          { key: 'suhu', label: 'Suhu (°C)', warna: '#E65100', axis: 'kanan' },
          { key: 'kelembaban', label: 'Kelembaban (%)', warna: '#1565C0', axis: 'kanan' },
        ]}
        seriesListBulanan={[
          { key: 'mhd', label: 'MHD', warna: '#0F2A38' },
          { key: 'mbr', label: 'MBR (per jam)', warna: '#1B5E20' },
          { key: 'suhu', label: 'Suhu (°C)', warna: '#E65100', axis: 'kanan' },
          { key: 'kelembaban', label: 'Kelembaban (%)', warna: '#1565C0', axis: 'kanan' },
        ]}
      />

      {/* Kotak AI mengikuti tab (Mingguan/Bulanan) yang sedang aktif di
         PanelTrenPeriode -- hanya SATU pasang yang tampil di satu waktu */}
      {modeAktif === 'mingguan' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <BoxAnalisisAI
            konteks={konteksMingguan}
            periodeKey={periodeKeyMingguan}
            wilayahKerja={wilker}
            sudahLogin={!!role}
            role={role === 'tamu' ? null : role}
            hasilAwal={hasilAnalisisAktif}
          />
          <BoxPrediksiAI
            konteks={konteksMingguan}
            periodeKey={periodeKeyMingguan}
            wilayahKerja={wilker}
            sudahLogin={!!role}
            role={role === 'tamu' ? null : role}
            hasilAwal={hasilPrediksiAktif}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <BoxAnalisisAI
            konteks={konteksBulanan}
            periodeKey={periodeKeyBulanan}
            wilayahKerja={wilker}
            sudahLogin={!!role}
            role={role === 'tamu' ? null : role}
            hasilAwal={hasilAnalisisAktif}
          />
          <BoxPrediksiAI
            konteks={konteksBulanan}
            periodeKey={periodeKeyBulanan}
            wilayahKerja={wilker}
            sudahLogin={!!role}
            role={role === 'tamu' ? null : role}
            hasilAwal={hasilPrediksiAktif}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DonutChart judul="Metode Tangkap" data={metodeTangkap} />
      </div>
    </div>
  );
}