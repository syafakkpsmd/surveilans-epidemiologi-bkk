import { getWilkerRef } from '@/lib/supabase/queries';
import {
  getBreakdownKategori,
  getRentangMingguEpid,
  getRingkasanVektorDbdBulanan,
  getRingkasanVektorDbdRentang,
  getRingkasanVektorAktivitasMingguan,
  getRingkasanVektorAktivitasBulanan,
} from '@/lib/supabase/queriesVektorBreakdown';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getMingguEpidSaatIni } from '@/lib/epi-week';
import { periodeMingguanSebelumnya } from '@/lib/ai/periode';
import FilterWilker from '@/components/vektor/FilterWilker';
import FilterZonaSubLokasi from '@/components/vektor/FilterZonaSubLokasi';
import FilterRentangMinggu from '@/components/vektor/FilterRentangMinggu';
import FilterRentangBulan from '@/components/vektor/FilterRentangBulan';
import TrenChartMingguan from '@/components/vektor/TrenChartMingguan';
import TrenChartBulanan from '@/components/vektor/TrenChartBulanan';
import GrafikBarBulanan from '@/components/vektor/GrafikBarBulanan';
import BreakdownList from '@/components/vektor/BreakdownList';
import DonutChart from '@/components/vektor/DonutChart';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';

export default async function VektorAedesPage({
  searchParams,
}: {
  searchParams: Promise<{
    wilker?: string;
    tahun?: string;
    zona?: string;
    subLokasi?: string;
    mgDari?: string;
    mgSampai?: string;
    bulanDari?: string;
    bulanSampai?: string;
  }>;
}) {
  const { wilker, tahun: tahunParam, zona, subLokasi, mgDari, mgSampai, bulanDari, bulanSampai } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  const [role, daftarWilker, ringkasanMingguan] = await Promise.all([
    getUserRole(),
    getWilkerRef(),
    getRingkasanVektorDbdRentang({
      tahun,
      mgDari: mgDari ? parseInt(mgDari, 10) : undefined,
      mgSampai: mgSampai ? parseInt(mgSampai, 10) : undefined,
      kodeWilker: wilker,
      zona,
      subLokasi,
    }),
  ]);

  const epiSaatIni = getMingguEpidSaatIni();
  const tahunBerjalan = epiSaatIni.tahunEpid;
  const mingguBerjalan = Math.max(1, epiSaatIni.mingguEpid - 1); // minggu epid di kurangi 1
  const bulanBerjalan = new Date().getMonth() + 1;
  const { mulai, selesai } = getRentangMingguEpid(tahunBerjalan, mingguBerjalan);

  const periodeMinggu1Lalu = periodeMingguanSebelumnya({
    jenis: 'mingguan',
    tahun: tahunBerjalan,
    minggu: mingguBerjalan,
  });
  const periodeMinggu2Lalu = periodeMingguanSebelumnya(periodeMinggu1Lalu);
  const rentangMinggu2Lalu = getRentangMingguEpid(periodeMinggu2Lalu.tahun, periodeMinggu2Lalu.minggu);

  const filterTambahanBreakdown: Record<string, string> = {};
  if (zona) filterTambahanBreakdown.zona = zona;
  if (subLokasi) filterTambahanBreakdown.sub_lokasi = subLokasi;

  const [
    breakdownZona,
    breakdownTindakanMinggu2Lalu,
    breakdownTindakanTotal,
    dataBulanan,
    dataAktivitasMingguan,
    dataAktivitasBulanan,
  ] = await Promise.all([
    getBreakdownKategori({
      tabel: 'vektor_dbd',
      kolomTanggal: 'tgl_survei',
      kolomKategori: 'zona',
      tglMulai: mulai,
      tglSelesai: selesai,
      kodeWilker: wilker,
    }),
    getBreakdownKategori({
      tabel: 'vektor_dbd',
      kolomTanggal: 'tgl_survei',
      kolomKategori: 'tindakan_pengendalian',
      tglMulai: rentangMinggu2Lalu.mulai,
      tglSelesai: rentangMinggu2Lalu.selesai,
      kodeWilker: wilker,
      filterTambahan: filterTambahanBreakdown,
    }),
    getBreakdownKategori({
      tabel: 'vektor_dbd',
      kolomTanggal: 'tgl_survei',
      kolomKategori: 'tindakan_pengendalian',
      tglMulai: '2000-01-01',
      tglSelesai: '2100-12-31',
      kodeWilker: wilker,
      filterTambahan: filterTambahanBreakdown,
    }),
    getRingkasanVektorDbdBulanan({ tahun, kodeWilker: wilker, zona, subLokasi, bulanDari, bulanSampai }),
    getRingkasanVektorAktivitasMingguan({
      tahun,
      mgDari: mgDari ? parseInt(mgDari, 10) : undefined,
      mgSampai: mgSampai ? parseInt(mgSampai, 10) : undefined,
      kodeWilker: wilker,
      zona,
      subLokasi,
    }),
    getRingkasanVektorAktivitasBulanan({ tahun, kodeWilker: wilker, zona, subLokasi, bulanDari, bulanSampai }),
  ]);

  const dataChart = ringkasanMingguan.map((r) => ({
    minggu_epid: r.minggu_epid,
    hi: r.hi_rerata ?? 0,
    ci: r.ci_rerata ?? 0,
    abj: r.abj_rerata ?? 0,
    bi: r.bi_rerata ?? 0,
    curah_hujan_mm: r.curah_hujan_rerata ?? null,
  }));

  const sudahLogin = !!role;
  const roleAI = role === 'admin' || role === 'petugas' ? role : null;
  const konteksMingguan = 'vektor-dbd-mingguan';
  const konteksBulanan = 'vektor-dbd-bulanan';
  // Rentang minggu yang dipilih user (fallback: minggu berjalan saja kalau belum pilih apa-apa)
  const mgAwalDipilih = mgDari ? parseInt(mgDari, 10) : mingguBerjalan;
  const mgAkhirDipilih = mgSampai ? parseInt(mgSampai, 10) : mingguBerjalan;
  const periodeKeyMingguan = `${tahun}-W${mgAwalDipilih}_W${mgAkhirDipilih}`;

  // Rentang bulan yang dipilih user (fallback: bulan berjalan saja kalau belum pilih apa-apa)
  const bulanAwalDipilih = bulanDari ? parseInt(bulanDari, 10) : bulanBerjalan;
  const bulanAkhirDipilih = bulanSampai ? parseInt(bulanSampai, 10) : bulanBerjalan;
  const periodeKeyBulanan = `${tahun}-M${bulanAwalDipilih}_M${bulanAkhirDipilih}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🦟 Vektor Aedes (DBD)</h1>
          <p className="text-sm text-gray-500">
            HI, CI, ABJ per zona (Perimeter/Buffer)
            {wilker === 'WK01' ? ' & sub-lokasi (Pelabuhan Umum/TPK Palaran)' : ''}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} />
          <FilterZonaSubLokasi />
          <FilterRentangMinggu />
        </div>
      </div>

      {ringkasanMingguan.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Belum ada kegiatan tercatat untuk tahun {tahun}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ================= MINGGUAN ================= */}

          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Tren HI / CI / ABJ — Tahun {tahun}</h2>
            <TrenChartMingguan
              data={dataChart}
              seriesList={[
                { key: 'hi', label: 'HI (%)', warna: '#B71C1C' },
                { key: 'ci', label: 'CI (%)', warna: '#EF6C00' },
                { key: 'bi', label: 'BI', warna: '#7C3AED' },
                { key: 'abj', label: 'ABJ (%)', warna: '#2F9E44' },
                { key: 'curah_hujan_mm', label: 'Curah Hujan (mm)', warna: '#0F4C5C', axis: 'kanan', tipe: 'bar' },
              ]}
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksMingguan}
                periodeKey={periodeKeyMingguan}
                wilayahKerja={wilker ?? undefined}
                metrik="hi-ci-abj"
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksMingguan}
                periodeKey={periodeKeyMingguan}
                wilayahKerja={wilker ?? undefined}
                metrik="hi-ci-abj"
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Rumah Diperiksa — Mingguan</h2>
            <TrenChartMingguan
              data={dataAktivitasMingguan}
              seriesList={[{ key: 'rumah_diperiksa', label: 'Rumah Diperiksa', warna: '#0F4C5C' }]}
            />
            <div className="mt-4">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksMingguan}
                periodeKey={periodeKeyMingguan}
                wilayahKerja={wilker ?? undefined}
                metrik="rumah-diperiksa"
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Container Diperiksa — Mingguan</h2>
            <TrenChartMingguan
              data={dataAktivitasMingguan}
              seriesList={[{ key: 'container_diperiksa', label: 'Container Diperiksa', warna: '#2563EB' }]}
            />
            <div className="mt-4">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksMingguan}
                periodeKey={periodeKeyMingguan}
                wilayahKerja={wilker ?? undefined}
                metrik="container-diperiksa"
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Rumah Positif + Container Positif — Mingguan
            </h2>
            <TrenChartMingguan
              data={dataAktivitasMingguan}
              seriesList={[
                { key: 'rumah_positif', label: 'Rumah Positif', warna: '#B71C1C' },
                { key: 'container_positif', label: 'Container Positif', warna: '#EF6C00' },
              ]}
            />
            <div className="mt-4">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksMingguan}
                periodeKey={periodeKeyMingguan}
                wilayahKerja={wilker ?? undefined}
                metrik="rumah-container-positif"
              />
            </div>
          </div>

          {/* ================= BULANAN ================= */}

          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Tren Bulanan HI / CI / ABJ — Tahun {tahun}</h2>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <FilterWilker daftarWilker={daftarWilker} />
              <FilterZonaSubLokasi />
              <FilterRentangBulan />
            </div>
            <TrenChartBulanan data={dataBulanan} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksBulanan}
                periodeKey={periodeKeyBulanan}
                wilayahKerja={wilker ?? undefined}
                metrik="hi-ci-abj"
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksBulanan}
                periodeKey={periodeKeyBulanan}
                wilayahKerja={wilker ?? undefined}
                metrik="hi-ci-abj"
              />
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <GrafikBarBulanan
                judul="Rumah Diperiksa — Bulanan"
                data={dataAktivitasBulanan}
                seriesList={[{ key: 'rumah_diperiksa', label: 'Rumah Diperiksa', warna: '#0F4C5C' }]}
              />
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksBulanan}
                periodeKey={periodeKeyBulanan}
                wilayahKerja={wilker ?? undefined}
                metrik="rumah-diperiksa"
              />
            </div>

            <div className="space-y-2">
              <GrafikBarBulanan
                judul="Container Diperiksa — Bulanan"
                data={dataAktivitasBulanan}
                seriesList={[{ key: 'container_diperiksa', label: 'Container Diperiksa', warna: '#2563EB' }]}
              />
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksBulanan}
                periodeKey={periodeKeyBulanan}
                wilayahKerja={wilker ?? undefined}
                metrik="container-diperiksa"
              />
            </div>

            <div className="space-y-2">
              <GrafikBarBulanan
                judul="Rumah Positif + Container Positif — Bulanan"
                data={dataAktivitasBulanan}
                seriesList={[
                  { key: 'rumah_positif', label: 'Rumah Positif', warna: '#B71C1C' },
                  { key: 'container_positif', label: 'Container Positif', warna: '#EF6C00' },
                ]}
              />
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksBulanan}
                periodeKey={periodeKeyBulanan}
                wilayahKerja={wilker ?? undefined}
                metrik="rumah-container-positif"
              />
            </div>

            <div className="space-y-2">
              <GrafikBarBulanan
                judul="Larvasida — Bulanan"
                data={dataAktivitasBulanan}
                seriesList={[{ key: 'larvasida_gram', label: 'Larvasida (gram)', warna: '#7C3AED' }]}
              />
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksBulanan}
                periodeKey={periodeKeyBulanan}
                wilayahKerja={wilker ?? undefined}
                metrik="larvasida"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <GrafikBarBulanan
                judul="Luas Wilayah Fogging + Insektisida Fogging — Bulanan"
                data={dataAktivitasBulanan}
                seriesList={[
                  { key: 'luas_wilayah_fogging_ha', label: 'Luas Wilayah (Ha)', warna: '#0D9488', desimal: 2 },
                  { key: 'jml_insektisida_fogging_ml', label: 'Insektisida (ml)', warna: '#EA580C', axis: 'kanan' },
                ]}
              />
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksBulanan}
                periodeKey={periodeKeyBulanan}
                wilayahKerja={wilker ?? undefined}
                metrik="luas-insektisida"
              />
            </div>
          </div>

          {/* ================= BREAKDOWN & DONUT ================= */}

          <BreakdownList
            judul={`Breakdown Zona — Minggu Epid ke-${mingguBerjalan}`}
            data={breakdownZona}
            warna="#B71C1C"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DonutChart
              judul={`Tindakan Pengendalian — Minggu Epid ke-${periodeMinggu2Lalu.minggu} (data berjalan)`}
              data={breakdownTindakanMinggu2Lalu}
            />
            <DonutChart
              judul="Tindakan Pengendalian — Total Keseluruhan Data"
              data={breakdownTindakanTotal}
            />
          </div>
        </div>
      )}
    </div>
  );
}