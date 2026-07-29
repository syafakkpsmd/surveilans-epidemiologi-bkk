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
// GANTI: TombolAnalisisAI/TombolPrediksiAI (popup) -> BoxAnalisisAI/BoxPrediksiAI (box di bawah grafik, auto-fetch GET, hasil bisa dibaca siapa saja)
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import GrafikTotalKotaPesawat from '@/components/pesawat/GrafikTotalKotaPesawat';
import GrafikTrenKotaPesawat from '@/components/pesawat/GrafikTrenKotaPesawat';
import GrafikTotalMaskapaiPesawat from '@/components/pesawat/GrafikTotalMaskapaiPesawat';
import GrafikTrenMaskapaiPesawat from '@/components/pesawat/GrafikTrenMaskapaiPesawat';
import GrafikSertifikatGenderBulanan from '@/components/pesawat/GrafikSertifikatGenderBulanan';
import { getBanyakHasilAI, kunciAI, type PermintaanHasilAI } from '@/lib/ai/getBanyakHasilAI';


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
  const { wilker: wilkerParam, tahun: tahunParam, mgDari, mgSampai, bulanDari, bulanSampai } = await searchParams;
  const wilker = wilkerParam ?? 'WK07'; // default: Bandara APT Pranoto
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  // Normalisasi filter rentang bulan agar selalu YYYY-MM
  const formatBulanDari = bulanDari ? (bulanDari.includes('-') ? bulanDari : `${tahun}-${bulanDari.padStart(2, '0')}`) : undefined;
  const formatBulanSampai = bulanSampai ? (bulanSampai.includes('-') ? bulanSampai : `${tahun}-${bulanSampai.padStart(2, '0')}`) : undefined;

  // periodeKey dihitung SEBELUM Promise.all data chart di bawah, karena
  // dibutuhkan juga untuk batch-fetch hasil AI (permintaanAI) yang
  // dijalankan paralel di Promise.all yang sama.
  const { mingguEpid: mingguEpidSekarangAwal } = getMingguEpidSaatIni();
  const mingguBerjalanAwal = mingguEpidSekarangAwal - 1;
  const bulanBerjalanAwal = new Date().getMonth() + 1;

  let mgDariNum = mgDari ? parseInt(mgDari, 10) : 1;
  let mgSampaiNum = mgSampai ? parseInt(mgSampai, 10) : mingguBerjalanAwal;
  if (mgDariNum > mgSampaiNum) [mgDariNum, mgSampaiNum] = [mgSampaiNum, mgDariNum];

  let bulanDariNum = formatBulanDari ? parseInt(formatBulanDari.split('-')[1], 10) : 1;
  let bulanSampaiNum = formatBulanSampai ? parseInt(formatBulanSampai.split('-')[1], 10) : bulanBerjalanAwal;
  if (bulanDariNum > bulanSampaiNum) [bulanDariNum, bulanSampaiNum] = [bulanSampaiNum, bulanDariNum];

  const periodeKeyMingguan = `${tahun}-W${mgDariNum}_W${mgSampaiNum}`;
  const periodeKeyBulanan = `${tahun}-${bulanDariNum}_${bulanSampaiNum}`;

  // ============================================================
  // BATCH-FETCH HASIL AI -- menggantikan pola lama di mana setiap
  // <BoxAnalisisAI>/<BoxPrediksiAI> di halaman ini fetch GET sendiri
  // saat mount (11 request client-side terpisah). Diambil sekaligus
  // lewat 1 Promise.all di server (getBanyakHasilAI), digabung ke
  // Promise.all utama di bawah supaya jalan paralel dengan query
  // data chart, tidak menambah waktu tunggu.
  // ============================================================
  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: 'pesawat-mingguan', periodeKey: periodeKeyMingguan, wilayahKerja: wilker, metrik: 'crew-penumpang', tipe: 'analisis' },
    { konteks: 'pesawat-mingguan', periodeKey: periodeKeyMingguan, wilayahKerja: wilker, metrik: 'crew-penumpang', tipe: 'prediksi' },
    { konteks: 'pesawat-mingguan', periodeKey: periodeKeyMingguan, wilayahKerja: wilker, metrik: 'sertifikat', tipe: 'analisis' },
    { konteks: 'pesawat-bulanan', periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'crew-penumpang', tipe: 'analisis' },
    { konteks: 'pesawat-bulanan', periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'crew-penumpang', tipe: 'prediksi' },
    { konteks: 'pesawat-bulanan', periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'sertifikat', tipe: 'analisis' },
    { konteks: 'pesawat-bulanan', periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'crew', tipe: 'analisis' },
    { konteks: 'pesawat-bulanan', periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'kota-asal', tipe: 'analisis' },
    { konteks: 'pesawat-bulanan', periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'kota-asal', tipe: 'prediksi' },
    { konteks: 'pesawat-bulanan', periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'maskapai-kedatangan', tipe: 'analisis' },
    { konteks: 'pesawat-bulanan', periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'maskapai-kedatangan', tipe: 'prediksi' },
  ];

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
    hasilAI,
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
    getBanyakHasilAI(permintaanAI),
  ]);

  const daftarWilker = daftarWilkerSemua ? daftarWilkerSemua.filter((w) => w.jenis === 'Bandara') : [];

  const [breakdownMaskapai, breakdownSertifikat] = await Promise.all([
    getBreakdownMaskapai({ tahun, kodeWilker: wilker }),
    getBreakdownSertifikat({ tahun, kodeWilker: wilker }),
  ]);

  const { mingguEpid: mingguEpidSekarang } = getMingguEpidSaatIni();
  const mingguBerjalan = mingguEpidSekarang - 1; // Mengurangi 1 minggu yang di tampilkan
  const bulanBerjalan = new Date().getMonth() + 1;

  const sudahLogin = !!role;
  // roleAI menentukan siapa yang boleh menekan "Generate" di dalam Box — GET (baca hasil) tidak butuh auth sama sekali
  const roleAI = role === 'admin' || role === 'petugas' ? role : null;
  const konteksMingguan = 'pesawat-mingguan';
  const konteksBulanan = 'pesawat-bulanan';

  const ringkasanBulananBerlabel = tambahLabelBulan(ringkasanBulanan);
  const dataGenderBulananBerlabel = tambahLabelBulan(dataGenderBulanan);
  const totalPenumpangTiba = ringkasanMingguan.reduce((a, r) => a + r.penumpang_datang, 0);
  const totalPenumpangBerangkat = ringkasanMingguan.reduce((a, r) => a + r.penumpang_berangkat, 0);
  const totalCrewTiba = ringkasanMingguan.reduce((a, r) => a + r.crew_datang, 0);
  const totalCrewBerangkat = ringkasanMingguan.reduce((a, r) => a + r.crew_berangkat, 0);
  const totalPesawatTiba = ringkasanMingguan.reduce((a, r) => a + r.pesawat_tiba, 0);
  const totalPesawatBerangkat = ringkasanMingguan.reduce((a, r) => a + r.pesawat_berangkat, 0);

  // ============================================================
  // LOOKUP HASIL AI -- 1 pasang variabel per kombinasi yang dipakai
  // di JSX di bawah. Kalau kombinasinya tidak ada di hasilAI,
  // nilainya undefined -- Box otomatis fallback ke fetch sendiri.
  // ============================================================
  const hasilAnalisisMingguanCrewPenumpang = hasilAI[kunciAI({ konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilker, metrik: 'crew-penumpang', tipe: 'analisis' })];
  const hasilPrediksiMingguanCrewPenumpang = hasilAI[kunciAI({ konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilker, metrik: 'crew-penumpang', tipe: 'prediksi' })];
  const hasilAnalisisMingguanSertifikat = hasilAI[kunciAI({ konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilker, metrik: 'sertifikat', tipe: 'analisis' })];

  const hasilAnalisisBulananCrewPenumpang = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'crew-penumpang', tipe: 'analisis' })];
  const hasilPrediksiBulananCrewPenumpang = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'crew-penumpang', tipe: 'prediksi' })];
  const hasilAnalisisBulananSertifikat = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'sertifikat', tipe: 'analisis' })];
  const hasilAnalisisBulananCrew = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'crew', tipe: 'analisis' })];
  const hasilAnalisisKotaAsal = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'kota-asal', tipe: 'analisis' })];
  const hasilPrediksiKotaAsal = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'kota-asal', tipe: 'prediksi' })];
  const hasilAnalisisMaskapaiKedatangan = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'maskapai-kedatangan', tipe: 'analisis' })];
  const hasilPrediksiMaskapaiKedatangan = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilker, metrik: 'maskapai-kedatangan', tipe: 'prediksi' })];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 1. Judul */}
      <div>
        <h1 className="text-xl font-bold text-[#0F2A38]">✈️ Pengawasan Alat Angkut Pesawat</h1>
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
          Distribusi Pengasawan Alat Angkut Pesawat dalam Mingguan Tahun {tahun}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} sembunyikanNonAktif={false} />
          <FilterRentangMinggu />
        </div>
      </div>

      {/* 3B. Kartu Ringkasan */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Penumpang Tiba</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2A38]">{totalPenumpangTiba.toLocaleString('id-ID')}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Penumpang Berangkat</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2A38]">{totalPenumpangBerangkat.toLocaleString('id-ID')}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Crew Tiba</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2A38]">{totalCrewTiba.toLocaleString('id-ID')}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Crew Berangkat</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2A38]">{totalCrewBerangkat.toLocaleString('id-ID')}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Pswt Tiba</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2A38]">{totalPesawatTiba.toLocaleString('id-ID')}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Pswt Berangkat</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2A38]">{totalPesawatBerangkat.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* 4. GRID UTAMA */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* ================= MINGGUAN ================= */}
        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Distribusi Crew &amp; Penumpang Pesawat
            <br />
            dalam Mingguan selama Tahun {tahun}</h2>
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
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <BoxAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksMingguan} periodeKey={periodeKeyMingguan} wilayahKerja={wilker ?? undefined} metrik="crew-penumpang" hasilAwal={hasilAnalisisMingguanCrewPenumpang} />
            <BoxPrediksiAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksMingguan} periodeKey={periodeKeyMingguan} wilayahKerja={wilker ?? undefined} metrik="crew-penumpang" hasilAwal={hasilPrediksiMingguanCrewPenumpang} />
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Distribusi Penerbitan Sertifikat Kesehatan dalam Mingguan selama Tahun {tahun}</h2>
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
          <div className="mt-3">
            <BoxAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksMingguan} periodeKey={periodeKeyMingguan} wilayahKerja={wilker ?? undefined} metrik="sertifikat" hasilAwal={hasilAnalisisMingguanSertifikat} />
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Distribusi Kedatangan dan Keberangkatan Pesawat dalam Mingguan selama Tahun {tahun}</h2>
          {ringkasanMingguan && ringkasanMingguan.length > 0 ? (
            <TrenChartMingguan
              data={ringkasanMingguan}
              seriesList={[
                { key: 'pesawat_tiba', label: 'Pesawat Tiba', warna: '#0F4C5C' },
                { key: 'pesawat_berangkat', label: 'Pesawat Berangkat', warna: '#EA580C', tipe: 'bar' },
              ]}
            />
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">Data pesawat mingguan kosong.</p>
          )}
        </div>

        {/* ================= BULANAN ================= */}
        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Distribusi Pengasawan Kegiatan Alat Angkut Pesawat dalam  Bulanan Tahun {tahun}</h2>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FilterRentangBulan />
          </div>
          <GrafikBarBulanan
            judul="Distribusi Kedatangan dan Keberangkatan Penumpang dalam Bulanan"
            data={ringkasanBulananBerlabel}
            seriesList={[
              { key: 'penumpang_berangkat', label: 'Penumpang Berangkat', warna: '#0F4C5C' },
              { key: 'penumpang_datang', label: 'Penumpang Datang', warna: '#2563EB' },
            ]}
          />
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <BoxAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="crew-penumpang" hasilAwal={hasilAnalisisBulananCrewPenumpang} />
            <BoxPrediksiAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="crew-penumpang" hasilAwal={hasilPrediksiBulananCrewPenumpang} />
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <GrafikBarBulanan
              judul="Distribusi Penerbitan Sertifikat dalam Bulanan"
              data={ringkasanBulananBerlabel}
              seriesList={[
                { key: 'sklt_total', label: 'SKLT', warna: '#B71C1C' },
                { key: 'td_laik_total', label: 'TD Laik', warna: '#EF6C00' },
                { key: 'iaos_total', label: 'IAOS', warna: '#2F9E44' },
                { key: 'kier_total', label: 'KIER', warna: '#0D9488' },
              ]}
            />
            <BoxAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="sertifikat" hasilAwal={hasilAnalisisBulananSertifikat} />
          </div>

          <div className="space-y-2">
            <GrafikBarBulanan
              judul="Distribusi Kedatangan dan Keberangkatan Crew Pesawat dalam Bulanan"
              data={ringkasanBulananBerlabel}
              seriesList={[
                { key: 'crew_berangkat', label: 'Crew Berangkat', warna: '#7C3AED' },
                { key: 'crew_datang', label: 'Crew Datang', warna: '#EA580C' },
              ]}
            />
            <BoxAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="crew" hasilAwal={hasilAnalisisBulananCrew} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <GrafikSertifikatGenderBulanan data={dataGenderBulananBerlabel as Record<string, any>[]} />
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <GrafikBarBulanan
            judul="Distribusi Kedatangan dan Keberangkatan Pesawat dalam Bulanan"
            data={ringkasanBulananBerlabel}
            seriesList={[
              { key: 'pesawat_tiba', label: 'Pesawat Tiba', warna: '#0F4C5C', tipe: 'line' },
              { key: 'pesawat_berangkat', label: 'Pesawat Berangkat', warna: '#EA580C', tipe: 'bar' },
            ]}
          />
        </div>

        {/* ================= BREAKDOWN ================= */}
        <BreakdownList judul={`Breakdown Total Penumpang berdasarkan Maskapai Tahun ${tahun}`} data={breakdownMaskapai} warna="#0F4C5C" />
        <DonutChart judul={`Proporsi Jenis Sertifikat selama Tahun ${tahun}`} data={breakdownSertifikat} />

        {/* ================= ASAL & TUJUAN KOTA ================= */}
        <GrafikTotalKotaPesawat data={tambahLabelBulan(dataKedatangan)} judul={`Total Kedatangan Penumpang pesawat per Kota Asal Tahun ${tahun}`} />
        <div className="space-y-2">
          <GrafikTrenKotaPesawat data={tambahLabelBulan(dataKedatangan)} judul={`Tren Bulanan Berdasarkan Kota Asal selama Tahun ${tahun}`} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <BoxAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="kota-asal" hasilAwal={hasilAnalisisKotaAsal} />
            <BoxPrediksiAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="kota-asal" hasilAwal={hasilPrediksiKotaAsal} />
          </div>
        </div>
        <GrafikTotalKotaPesawat data={tambahLabelBulan(dataKeberangkatan)} judul={`Total Keberangkatan Penumpang per Kota Tujuan selama Tahun ${tahun}`} />
        <GrafikTrenKotaPesawat data={tambahLabelBulan(dataKeberangkatan)} judul={`Tren Bulanan Berdasarkan Kota Tujuan Tahun ${tahun}`} />

        {/* ================= MASKAPAI ================= */}
        <GrafikTotalMaskapaiPesawat data={tambahLabelBulan(dataMaskapaiKedatangan)} judul={`Total Kedatangan Penumpang per Maskapai Tahun ${tahun}`} />
        <div className="space-y-2">
          <GrafikTrenMaskapaiPesawat data={tambahLabelBulan(dataMaskapaiKedatangan)} judul={`Tren Kedatangan Penumpang Bulanan per Maskapai Tahun ${tahun}`} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <BoxAnalisisAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="maskapai-kedatangan" hasilAwal={hasilAnalisisMaskapaiKedatangan} />
            <BoxPrediksiAI sudahLogin={sudahLogin} role={roleAI} konteks={konteksBulanan} periodeKey={periodeKeyBulanan} wilayahKerja={wilker ?? undefined} metrik="maskapai-kedatangan" hasilAwal={hasilPrediksiMaskapaiKedatangan} />
          </div>
        </div>
        <GrafikTotalMaskapaiPesawat data={tambahLabelBulan(dataMaskapaiKeberangkatan)} judul={`Total Keberangkatan Penumpang per Maskapai Tahun ${tahun}`} />
        <GrafikTrenMaskapaiPesawat data={tambahLabelBulan(dataMaskapaiKeberangkatan)} judul={`Tren Keberangkatan Penumpang Bulanan per Maskapai Tahun ${tahun}`} />

      </div>
    </div>
  );
}