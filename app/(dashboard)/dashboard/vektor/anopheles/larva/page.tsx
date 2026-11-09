// app/(dashboard)/dashboard/vektor/anopheles/larva/page.tsx
import { getWilkerRef } from '@/lib/db/queries/umum';
import {
  getTrenLarva,
  getMacamTempatPerindukan,
  getKeadaanTempatPerindukan,
} from '@/lib/db/queries/umum';
import { getUserRole } from '@/lib/auth/get-user-role';
import FilterWilker from '@/components/vektor/FilterWilker';
import FilterZonaSubLokasi from '@/components/vektor/FilterZonaSubLokasi';
import { getWilayahSubLokasiVektor } from '@/lib/wilayah-kerja/server';
import PanelTrenPeriode from '@/components/vektor/PanelTrenPeriode';
import DonutChart from '@/components/vektor/DonutChart';
import KartuRingkasLarva, { hitungRingkasLarva } from '@/components/vektor/KartuRingkasLarva';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import FilterTahun from '@/components/FilterTahun';
import { getMingguEpidSaatIni } from '@/lib/epi-week';
import { bacaTahun } from '@/lib/tahun';
import { getBanyakHasilAI, kunciAI, type PermintaanHasilAI } from '@/lib/ai/getBanyakHasilAI';
import { NAMA_BKK } from '@/lib/konfigurasi/instansi';

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Nomor bulan (1-12) dari label seperti "Jan", "Januari", atau "Jan 2026". null bila tidak dikenali. */
function bulanDariLabel(label: unknown): number | null {
  const awal = String(label ?? '').trim().slice(0, 3).toLowerCase();
  const idx = NAMA_BULAN.findIndex((b) => b.toLowerCase() === awal);
  return idx === -1 ? null : idx + 1;
}

export default async function LarvaPage({
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

  const mingguBerjalan = tahun < tahunBerjalan ? 52 : mingguSekarang;
  const bulanBerjalanNum = tahun < tahunBerjalan ? 12 : new Date().getMonth() + 1;

  // ---------- Rentang ----------
  const mgAwal = mgDari ? parseInt(mgDari, 10) : 1;
  const mgAkhir = mgSampai ? parseInt(mgSampai, 10) : mingguBerjalan;
  const mgLo = Math.min(mgAwal, mgAkhir);
  const mgHi = Math.max(mgAwal, mgAkhir);

  const blAwal = bulanDari ? parseInt(bulanDari.split('-')[1], 10) : 1;
  const blAkhir = bulanSampai ? parseInt(bulanSampai.split('-')[1], 10) : bulanBerjalanNum;
  const blLo = Math.min(blAwal, blAkhir);
  const blHi = Math.max(blAwal, blAkhir);

  const konteksAI = modeAktif === 'mingguan' ? 'anopheles-larva-mingguan' : 'anopheles-larva-bulanan';
  const periodeKey =
    modeAktif === 'mingguan' ? `${tahun}-W${mgAwal}_W${mgAkhir}` : `${tahun}-M${blAwal}_M${blAkhir}`;

  // ---------- Batch AI ----------
  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: konteksAI, periodeKey, wilayahKerja: wilker, tipe: 'analisis' },
    { konteks: konteksAI, periodeKey, wilayahKerja: wilker, tipe: 'prediksi' },
  ];
  const hasilAIPromise = getBanyakHasilAI(permintaanAI);

  // ---------- Data ----------
  const [role, daftarWilker, mingguanSemua, bulananSemua, macamTempat, keadaanTempat, wilayahSubLokasi] =
    await Promise.all([
      getUserRole(),
      getWilkerRef(),
      getTrenLarva(tahun, wilker, 'mingguan'),
      getTrenLarva(tahun, wilker, 'bulanan'),
      getMacamTempatPerindukan(tahun, wilker),
      getKeadaanTempatPerindukan(tahun, wilker),
      getWilayahSubLokasiVektor(),
    ]);

  // Potong sesuai rentang terpilih
  const dataMingguan = mingguanSemua.filter((r) => {
    const m = Number(r.minggu_epid);
    return Number.isFinite(m) && m >= mgLo && m <= mgHi;
  });
  const dataBulanan = bulananSemua.filter((r) => {
    const b = bulanDariLabel(r.bulanLabel);
    return b === null || (b >= blLo && b <= blHi); // label tak dikenali: jangan dibuang
  });

  const hasilAI = await hasilAIPromise;
  const hasilAnalisis = hasilAI[kunciAI({ konteks: konteksAI, periodeKey, wilayahKerja: wilker, tipe: 'analisis' })];
  const hasilPrediksi = hasilAI[kunciAI({ konteks: konteksAI, periodeKey, wilayahKerja: wilker, tipe: 'prediksi' })];

  // ---------- Kartu ringkas ----------
  const dataAktif = modeAktif === 'mingguan' ? dataMingguan : dataBulanan;
  const ringkas = hitungRingkasLarva(dataAktif, modeAktif);
  const labelRentang =
    modeAktif === 'mingguan'
      ? `Mg ${mgLo}–${mgHi} ${tahun}`
      : `${NAMA_BULAN[blLo - 1]}–${NAMA_BULAN[blHi - 1]} ${tahun}`;

  const roleAI = role === 'tamu' ? null : role;

  const seriesLarva = [
    { key: 'cidukan', label: 'Cidukan Positif', warna: '#558B2F' },
    { key: 'larva', label: 'Jumlah Larva', warna: '#2E7D32' },
    { key: 'suhu', label: 'Suhu (°C)', warna: '#E65100', axis: 'kanan' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🦟 Surveilans Vektor Anopheles — Larva</h1>
          <p className="text-sm text-gray-500">
            Kepadatan larva, cidukan positif, dan kondisi tempat perindukan.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <FilterTahun maju={0} />
          <FilterWilker daftarWilker={daftarWilker} />
          <FilterZonaSubLokasi wilayahSubLokasi={wilayahSubLokasi} />
        </div>
      </div>

      <KartuRingkasLarva ringkas={ringkas} mode={modeAktif} labelRentang={labelRentang} />

      <PanelTrenPeriode
        judulBulanan={`Distribusi Hasil Survei Larva Anopheles di Wilayah Kerja ${NAMA_BKK}`}
        judulMingguan={`Tren Mingguan Hasil Survei Larva Anopheles di Wilayah Kerja ${NAMA_BKK}`}
        dataMingguan={dataMingguan}
        dataBulanan={dataBulanan}
        mingguAkhirDefault={mingguBerjalan}
        bulanAkhirDefault={bulanBerjalanNum}
        seriesListMingguan={seriesLarva}
        seriesListBulanan={seriesLarva}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <BoxAnalisisAI
          konteks={konteksAI}
          periodeKey={periodeKey}
          wilayahKerja={wilker}
          sudahLogin={!!role}
          role={roleAI}
          hasilAwal={hasilAnalisis}
        />
        <BoxPrediksiAI
          konteks={konteksAI}
          periodeKey={periodeKey}
          wilayahKerja={wilker}
          sudahLogin={!!role}
          role={roleAI}
          hasilAwal={hasilPrediksi}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DonutChart judul="Macam Tempat Perindukan" data={macamTempat} />
        <DonutChart judul="Keadaan Tempat Perindukan" data={keadaanTempat} />
      </div>
    </div>
  );
}