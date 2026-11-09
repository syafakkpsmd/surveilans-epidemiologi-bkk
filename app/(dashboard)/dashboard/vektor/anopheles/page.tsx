// app/(dashboard)/dashboard/vektor/anopheles/page.tsx
import { getWilkerRef } from '@/lib/db/queries/umum';
import { getTrenAnophelesDewasa, getMetodeTangkap } from '@/lib/db/queries/umum';
import { getUserRole } from '@/lib/auth/get-user-role';
import FilterWilker from '@/components/vektor/FilterWilker';
import FilterZonaSubLokasi from '@/components/vektor/FilterZonaSubLokasi';
import { getWilayahSubLokasiVektor } from '@/lib/wilayah-kerja/server';
import PanelTrenPeriode from '@/components/vektor/PanelTrenPeriode';
import DonutChart from '@/components/vektor/DonutChart';
import KartuRingkasAnopheles, { hitungRingkasAnopheles } from '@/components/vektor/KartuRingkasAnopheles';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import FilterTahun from '@/components/FilterTahun';
import { getMingguEpidSaatIni } from '@/lib/epi-week';
import { bacaTahun } from '@/lib/tahun';
import { getBanyakHasilAI, kunciAI, type PermintaanHasilAI } from '@/lib/ai/getBanyakHasilAI';
import { NAMA_BKK } from '@/lib/konfigurasi/instansi';

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

  // ---------- Tahun ----------
  const tahunBerjalan = new Date().getFullYear();
  const tahun = tahunParam ? bacaTahun(tahunParam, 0) : tahunBerjalan; // 0 = sama dengan maju di FilterTahun
  const { mingguEpid: mingguSekarang } = getMingguEpidSaatIni();

  const modeAktif: 'mingguan' | 'bulanan' = mode === 'bulanan' ? 'bulanan' : 'mingguan';

  // Tahun lampau: default sampai akhir tahun. Tahun berjalan: minggu/bulan sekarang.
  const mingguBerjalan = tahun < tahunBerjalan ? 52 : mingguSekarang;
  const bulanBerjalanNum = tahun < tahunBerjalan ? 12 : new Date().getMonth() + 1;

  // ---------- Rentang ----------
  // Mingguan: angka polos "1".."52"; default Mg 1 s/d minggu berjalan
  const mgAwalDipilih = mgDari ? parseInt(mgDari, 10) : 1;
  const mgAkhirDipilih = mgSampai ? parseInt(mgSampai, 10) : mingguBerjalan;
  const periodeKeyMingguan = `${tahun}-W${mgAwalDipilih}_W${mgAkhirDipilih}`;

  // Bulanan: format "2026-01", hanya bagian bulan dipakai; default Jan s/d bulan berjalan
  const bulanAwalDipilih = bulanDari ? parseInt(bulanDari.split('-')[1], 10) : 1;
  const bulanAkhirDipilih = bulanSampai ? parseInt(bulanSampai.split('-')[1], 10) : bulanBerjalanNum;
  const periodeKeyBulanan = `${tahun}-M${bulanAwalDipilih}_M${bulanAkhirDipilih}`;

  const konteksMingguan = 'anopheles-dewasa-mingguan';
  const konteksBulanan = 'anopheles-dewasa-bulanan';

  // ---------- Batch AI: hanya sepasang yang sesuai mode aktif ----------
  const konteksAktif = modeAktif === 'mingguan' ? konteksMingguan : konteksBulanan;
  const periodeKeyAktif = modeAktif === 'mingguan' ? periodeKeyMingguan : periodeKeyBulanan;
  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, tipe: 'analisis' },
    { konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, tipe: 'prediksi' },
  ];
  const hasilAIPromise = getBanyakHasilAI(permintaanAI);

  // ---------- Data ----------
  const [role, daftarWilker, dataMingguan, dataBulanan, metodeTangkap, wilayahSubLokasi] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getTrenAnophelesDewasa(tahun, wilker, 'mingguan', { awal: mgAwalDipilih, akhir: mgAkhirDipilih }),
    getTrenAnophelesDewasa(tahun, wilker, 'bulanan', { awal: bulanAwalDipilih, akhir: bulanAkhirDipilih }),
    getMetodeTangkap(tahun, wilker),
    getWilayahSubLokasiVektor(),
  ]);

  const hasilAI = await hasilAIPromise;
  const hasilAnalisisAktif =
    hasilAI[kunciAI({ konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, tipe: 'analisis' })];
  const hasilPrediksiAktif =
    hasilAI[kunciAI({ konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, tipe: 'prediksi' })];

  // ---------- Kartu ringkas ----------
  const dataAktif = modeAktif === 'mingguan' ? dataMingguan : dataBulanan;
  const ringkas = hitungRingkasAnopheles(dataAktif, modeAktif);
  const labelRentang =
    modeAktif === 'mingguan'
      ? `Mg ${Math.min(mgAwalDipilih, mgAkhirDipilih)}–${Math.max(mgAwalDipilih, mgAkhirDipilih)} ${tahun}`
      : `${NAMA_BULAN[Math.min(bulanAwalDipilih, bulanAkhirDipilih) - 1]}–${NAMA_BULAN[Math.max(bulanAwalDipilih, bulanAkhirDipilih) - 1]} ${tahun}`;

  const roleAI = role === 'tamu' ? null : role;

  return (
    <div className="space-y-6">
      {/* Header + filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🦟 Surveilans Vektor Anopheles — Dewasa</h1>
          <p className="text-sm text-gray-500">
            MHD, MBR, korelasi cuaca/suhu/kelembaban, dan metode tangkap.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <FilterTahun maju={0} />
          <FilterWilker daftarWilker={daftarWilker} />
          <FilterZonaSubLokasi wilayahSubLokasi={wilayahSubLokasi} />
        </div>
      </div>

      {/* Kartu ringkas */}
      <KartuRingkasAnopheles ringkas={ringkas} mode={modeAktif} labelRentang={labelRentang} />

      {/* Grafik tren + filter rentang (di dalam panel) */}
      <PanelTrenPeriode
        judulBulanan={`Distribusi Hasil Survei Nyamuk Anopheles di Wilayah Kerja ${NAMA_BKK}`}
        judulMingguan={`Tren Mingguan Hasil Survei Nyamuk Anopheles di Wilayah Kerja ${NAMA_BKK}`}
        dataMingguan={dataMingguan}
        dataBulanan={dataBulanan}
        mingguAkhirDefault={mingguBerjalan}
        bulanAkhirDefault={bulanBerjalanNum}
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

      {/* Kotak AI mengikuti mode aktif */}
      <div className="grid gap-4 sm:grid-cols-2">
        <BoxAnalisisAI
          konteks={konteksAktif}
          periodeKey={periodeKeyAktif}
          wilayahKerja={wilker}
          sudahLogin={!!role}
          role={roleAI}
          hasilAwal={hasilAnalisisAktif}
        />
        <BoxPrediksiAI
          konteks={konteksAktif}
          periodeKey={periodeKeyAktif}
          wilayahKerja={wilker}
          sudahLogin={!!role}
          role={roleAI}
          hasilAwal={hasilPrediksiAktif}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DonutChart judul="Metode Tangkap" data={metodeTangkap} />
      </div>
    </div>
  );
}