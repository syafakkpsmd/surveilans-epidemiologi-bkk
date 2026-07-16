import Link from 'next/link';
import {
  getKotaPesawatBulanan,
  getMaskapaiPesawatBulanan,
  getWilkerRef,
} from '@/lib/supabase/queries';
import {
  getRingkasanPesawatMingguan,
  getRingkasanPesawatBulanan,
  getRingkasanGenderBulanan,
  getBreakdownMaskapai,
  getBreakdownSertifikat,
} from '@/lib/supabase/queriesPesawat';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getMingguEpidSaatIni } from '@/lib/epi-week';
import FilterWilker from '@/components/vektor/FilterWilker';
import FilterRentangMinggu from '@/components/vektor/FilterRentangMinggu';
import FilterRentangBulan from '@/components/vektor/FilterRentangBulan';
import TrenChartMingguan from '@/components/vektor/TrenChartMingguan';
import GrafikBarBulanan from '@/components/vektor/GrafikBarBulanan';
import DonutChart from '@/components/vektor/DonutChart';
import BreakdownList from '@/components/vektor/BreakdownList';
import { TombolAnalisisAI } from '@/components/TombolAnalisisAI';
import { TombolPrediksiAI } from '@/components/TombolPrediksiAI';
import GrafikTotalKotaPesawat from '@/components/pesawat/GrafikTotalKotaPesawat';
import GrafikTrenKotaPesawat from '@/components/pesawat/GrafikTrenKotaPesawat';
import GrafikTotalMaskapaiPesawat from '@/components/pesawat/GrafikTotalMaskapaiPesawat';
import GrafikTrenMaskapaiPesawat from '@/components/pesawat/GrafikTrenMaskapaiPesawat';
import GrafikSertifikatGenderBulanan from '@/components/pesawat/GrafikSertifikatGenderBulanan';


export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NAMA_BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function tambahLabelBulan<T extends { bulan: string | number }>(data: T[]): (T & { bulanLabel: string })[] {
  if (!data || !Array.isArray(data)) return [];
  return data.map((row) => {
    let bulanNum = 1;
    const bulanStr = String(row.bulan).trim();

    if (bulanStr.includes('-')) {
      bulanNum = parseInt(bulanStr.split('-')[1], 10);
    } else {
      bulanNum = parseInt(bulanStr, 10);
    }

    const label = isNaN(bulanNum) ? bulanStr : (NAMA_BULAN_SINGKAT[bulanNum - 1] ?? bulanStr);
    return { ...row, bulanLabel: label };
  });
}

export default async function AlatAngkutPesawatPage({
  searchParams,
}: {
  searchParams: Promise<{
    wilker?: string;
    tahun?: string;
    mgDari?: string;
    mgSampai?: string;
    bulanDari?: string;
    bulanSampai?: string;
  }>;
}) {
  const { wilker, tahun: tahunParam, mgDari, mgSampai, bulanDari, bulanSampai } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  // Normalisasi filter rentang bulan agar selalu YYYY-MM
  const formatBulanDari = bulanDari ? (bulanDari.includes('-') ? bulanDari : `${tahun}-${bulanDari.padStart(2, '0')}`) : undefined;
  const formatBulanSampai = bulanSampai ? (bulanSampai.includes('-') ? bulanSampai : `${tahun}-${bulanSampai.padStart(2, '0')}`) : undefined;

  const [
  role,
    daftarWilkerSemua,
    ringkasanMingguan,
    ringkasanBulanan,
    dataKedatangan,
    dataKeberangkatan,
    dataMaskapaiKedatangan,
    dataMaskapaiKeberangkatan,
    dataGenderBulanan,
  ] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getRingkasanPesawatMingguan({
      tahun,
      kodeWilker: wilker,
      mgDari: mgDari ? parseInt(mgDari, 10) : undefined,
      mgSampai: mgSampai ? parseInt(mgSampai, 10) : undefined,
    }),
    getRingkasanPesawatBulanan({ 
      tahun, 
      kodeWilker: wilker,
      bulanDari: formatBulanDari,
      bulanSampai: formatBulanSampai,
    }),
    getKotaPesawatBulanan(tahun, 'kedatangan'),
    getKotaPesawatBulanan(tahun, 'keberangkatan'),
    getMaskapaiPesawatBulanan(tahun, 'kedatangan'),
    getMaskapaiPesawatBulanan(tahun, 'keberangkatan'),
    getRingkasanGenderBulanan({ 
      tahun, 
      kodeWilker: wilker,
      bulanDari: formatBulanDari,
      bulanSampai: formatBulanSampai,
    }),
  ]);

  const daftarWilker = daftarWilkerSemua ? daftarWilkerSemua.filter((w) => w.jenis === 'Bandara') : [];

  const [breakdownMaskapai, breakdownSertifikat] = await Promise.all([
    getBreakdownMaskapai({ tahun, kodeWilker: wilker }),
    getBreakdownSertifikat({ tahun, kodeWilker: wilker }),
  ]);

  const { mingguEpid: mingguBerjalan } = getMingguEpidSaatIni();
  const bulanBerjalan = new Date().getMonth() + 1;

  const sudahLogin = !!role;
  const roleAI = role === 'admin' || role === 'petugas' ? role : null;
  const konteksMingguan = 'pesawat-mingguan';
  const konteksBulanan = 'pesawat-bulanan';
  const periodeKeyMingguan = `${tahun}-W${mingguBerjalan}`;
  const periodeKeyBulanan = `${tahun}-${bulanBerjalan}`;

  const ringkasanBulananBerlabel = tambahLabelBulan(ringkasanBulanan);
  const dataGenderBulananBerlabel = tambahLabelBulan(dataGenderBulanan);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 1. Judul */}
      <div>
        <h1 className="text-xl font-bold text-[#0F2A38]">✈️ Alat Angkut Pesawat</h1>
        <p className="text-sm text-gray-500">
          Crew, penumpang, dan sertifikat kesehatan (SKLT / TD Laik / IAOS / KIER / Jenazah) — Bandara APT Pranoto.
        </p>
      </div>

      {/* 2. Link ke Jadwal Live */}
      <Link
        href="/dashboard/alat-angkut/pesawat/live"
        className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-700">🗓️ Jadwal Penerbangan Live</h2>
          <p className="text-xs text-gray-500">Kedatangan &amp; keberangkatan real-time — bisa pilih bandara</p>
        </div>
        <span className="text-sm font-medium text-[#0F4C5C]">Lihat selengkapnya →</span>
      </Link>

      {/* 3. Baris Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div className="text-sm font-medium text-gray-500">
          Filter Analisis Data Karantina:
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} />
          <FilterRentangMinggu />
        </div>
      </div>

      {/* 4. TAMPILKAN GRID UTAMA SECARA LANGSUNG (Tanpa Penyumbat Kondisi .length) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        
        {/* ================= MINGGUAN ================= */}
        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Crew &amp; Penumpang — Mingguan (Tahun {tahun})</h2>
            <div className="flex items-center gap-2">
              <TombolAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksMingguan} periodeKey={periodeKeyMingguan} wilayahKerja={wilker ?? undefined} metrik="crew-penumpang" />
              <TombolPrediksiAI sudahLogin={sudahLogin} konteks={konteksMingguan} periodeKey={periodeKeyMingguan} wilayahKerja={wilker ?? undefined} />
            </div>
          </div>
          {ringkasanMingguan && ringkasanMingguan.length > 0 ? (
            <TrenChartMingguan
              data={ringkasanMingguan}
              seriesList={[
                { key: 'penumpang_berangkat', label: 'Penumpang Berangkat', warna: '#0F4C5C' },
                { key: 'penumpang_datang', label: 'Penumpang Datang', warna: '#2563EB' },
                { key: 'crew_berangkat', label: 'Crew Berangkat', warna: '#7C3AED', tipe: 'bar' },
                { key: 'crew_datang', label: 'Crew Datang', warna: '#EA580C', tipe: 'bar' },
              ]}
            />
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">Data tren mingguan kosong.</p>
          )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Sertifikat Kesehatan — Mingguan (Tahun {tahun})</h2>
            <TombolAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksMingguan} periodeKey={periodeKeyMingguan} wilayahKerja={wilker ?? undefined} metrik="sertifikat" />
          </div>
          {ringkasanMingguan && ringkasanMingguan.length > 0 ? (
            <TrenChartMingguan
              data={ringkasanMingguan}
              seriesList={[
                { key: 'sklt_total', label: 'SKLT', warna: '#B71C1C' },
                { key: 'td_laik_total', label: 'TD Laik', warna: '#EF6C00' },
                { key: 'iaos_total', label: 'IAOS', warna: '#2F9E44' },
                { key: 'kier_total', label: 'KIER', warna: '#0D9488' },
                { key: 'jenazah_total', label: 'Jenazah', warna: '#6B7280' },
              ]}
            />
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">Data sertifikat mingguan kosong.</p>
          )}
        </div>

        {/* ================= BULANAN ================= */}
        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Penumpang — Bulanan (Tahun {tahun})</h2>
            <div className="flex items-center gap-2">
              <TombolAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="crew-penumpang" />
              <TombolPrediksiAI sudahLogin={sudahLogin} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} />
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FilterRentangBulan />
          </div>
          <GrafikBarBulanan
            judul="Penumpang Berangkat + Datang — Bulanan"
            data={ringkasanBulananBerlabel}
            seriesList={[
              { key: 'penumpang_berangkat', label: 'Penumpang Berangkat', warna: '#0F4C5C' },
              { key: 'penumpang_datang', label: 'Penumpang Datang', warna: '#2563EB' },
            ]}
          />
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex justify-end">
              <TombolAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="sertifikat" />
            </div>
            <GrafikBarBulanan
              judul="Total Sertifikat — Bulanan"
              data={ringkasanBulananBerlabel}
              seriesList={[
                { key: 'sklt_total', label: 'SKLT', warna: '#B71C1C' },
                { key: 'td_laik_total', label: 'TD Laik', warna: '#EF6C00' },
                { key: 'iaos_total', label: 'IAOS', warna: '#2F9E44' },
                { key: 'kier_total', label: 'KIER', warna: '#0D9488' },
              ]}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-end">
              <TombolAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="crew" />
            </div>
            <GrafikBarBulanan
              judul="Crew Berangkat + Datang — Bulanan"
              data={ringkasanBulananBerlabel}
              seriesList={[
                { key: 'crew_berangkat', label: 'Crew Berangkat', warna: '#7C3AED' },
                { key: 'crew_datang', label: 'Crew Datang', warna: '#EA580C' },
              ]}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <GrafikSertifikatGenderBulanan data={dataGenderBulananBerlabel} />
        </div>

        {/* ================= BREAKDOWN ================= */}
        <BreakdownList judul={`Breakdown Maskapai (Total Penumpang) — Tahun ${tahun}`} data={breakdownMaskapai} warna="#0F4C5C" />
        <DonutChart judul={`Proporsi Jenis Sertifikat — Tahun ${tahun}`} data={breakdownSertifikat} />

        {/* ================= ASAL & TUJUAN KOTA ================= */}
        <GrafikTotalKotaPesawat data={tambahLabelBulan(dataKedatangan)} judul={`Total Penumpang per Kota Asal (Kedatangan) — Tahun ${tahun}`} />
        <div className="space-y-2">
        <GrafikTrenKotaPesawat data={tambahLabelBulan(dataKedatangan)} judul={`Tren Bulanan per Kota Asal — Tahun ${tahun}`} />
        <div className="flex items-center justify-end gap-2">
          <TombolAnalisisAI
            sudahLogin={sudahLogin}
            role={roleAI}
            konteks={konteksBulanan}
            periodeKey={periodeKeyBulanan}
            wilayahKerja={wilker ?? undefined}
            metrik="kota-asal"
          />
          <TombolPrediksiAI
            sudahLogin={sudahLogin}
            konteks={konteksBulanan}
            periodeKey={periodeKeyBulanan}
            wilayahKerja={wilker ?? undefined}
          />
        </div>
      </div>
        <GrafikTotalKotaPesawat data={tambahLabelBulan(dataKeberangkatan)} judul={`Total Penumpang per Kota Tujuan (Keberangkatan) — Tahun ${tahun}`} />
        <GrafikTrenKotaPesawat data={tambahLabelBulan(dataKeberangkatan)} judul={`Tren Bulanan per Kota Tujuan — Tahun ${tahun}`} />

        {/* ================= MASKAPAI ================= */}
        <GrafikTotalMaskapaiPesawat data={tambahLabelBulan(dataMaskapaiKedatangan)} judul={`Total Penumpang per Maskapai (Kedatangan) — Tahun ${tahun}`} />
        <div className="space-y-2">
          <GrafikTrenMaskapaiPesawat data={tambahLabelBulan(dataMaskapaiKedatangan)} judul={`Tren Bulanan per Maskapai (Kedatangan) — Tahun ${tahun}`} />
          <div className="flex items-center justify-end gap-2">
            <TombolAnalisisAI
              sudahLogin={sudahLogin}
              role={roleAI}
              konteks={konteksBulanan}
              periodeKey={periodeKeyBulanan}
              wilayahKerja={wilker ?? undefined}
              metrik="maskapai-kedatangan"
            />
            <TombolPrediksiAI
              sudahLogin={sudahLogin}
              konteks={konteksBulanan}
              periodeKey={periodeKeyBulanan}
              wilayahKerja={wilker ?? undefined}
            />
          </div>
        </div>
        <GrafikTotalMaskapaiPesawat data={tambahLabelBulan(dataMaskapaiKeberangkatan)} judul={`Total Penumpang per Maskapai (Keberangkatan) — Tahun ${tahun}`} />
        <GrafikTrenMaskapaiPesawat data={tambahLabelBulan(dataMaskapaiKeberangkatan)} judul={`Tren Bulanan per Maskapai (Keberangkatan) — Tahun ${tahun}`} />

      </div>
    </div>
  );
}