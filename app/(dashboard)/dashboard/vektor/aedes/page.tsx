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
import { getBanyakHasilAI, kunciAI, type PermintaanHasilAI } from '@/lib/ai/getBanyakHasilAI';

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

  // Dipindah ke sini (murni sinkron, tidak butuh await) supaya periodeKey
  // & permintaan batch AI di bawah bisa disiapkan SEDINI MUNGKIN -- sebelum
  // Promise.all data chart pertama pun mulai, bukan setelahnya.
  const epiSaatIni = getMingguEpidSaatIni();
  const tahunBerjalan = epiSaatIni.tahunEpid;
  const mingguBerjalan = Math.max(1, epiSaatIni.mingguEpid - 1); // minggu epid di kurangi 1
  const bulanBerjalan = new Date().getMonth() + 1;

  const konteksMingguan = 'vektor-dbd-mingguan';
  const konteksBulanan = 'vektor-dbd-bulanan';
  const wilayahKerjaAi = wilker ?? undefined;

  // Rentang minggu yang dipilih user (fallback: minggu berjalan saja kalau belum pilih apa-apa)
  const mgAwalDipilih = mgDari ? parseInt(mgDari, 10) : mingguBerjalan;
  const mgAkhirDipilih = mgSampai ? parseInt(mgSampai, 10) : mingguBerjalan;
  const periodeKeyMingguan = `${tahun}-W${mgAwalDipilih}_W${mgAkhirDipilih}`;

  // Rentang bulan yang dipilih user (fallback: bulan berjalan saja kalau belum pilih apa-apa)
  const bulanAwalDipilih = bulanDari ? parseInt(bulanDari, 10) : bulanBerjalan;
  const bulanAkhirDipilih = bulanSampai ? parseInt(bulanSampai, 10) : bulanBerjalan;
  const periodeKeyBulanan = `${tahun}-M${bulanAwalDipilih}_M${bulanAkhirDipilih}`;

  // ============================================================
  // BATCH-FETCH HASIL AI -- menggantikan pola lama di mana setiap
  // <BoxAnalisisAI>/<BoxPrediksiAI> di halaman ini fetch GET sendiri
  // saat mount (12 request client-side terpisah: 4 metrik mingguan +
  // 6 metrik bulanan, ditambah prediksi khusus metrik hi-ci-abj di
  // masing-masing granularitas). Sekarang diambil sekaligus lewat 1
  // Promise.all di server (getBanyakHasilAI), dikirim sebagai props
  // (hasilAwal) ke tiap box. Dipanggil sedini mungkin supaya jalan
  // PARALEL dengan Promise.all data chart di bawah, bukan menambah
  // waktu tunggu -- persis pola di PHQC.
  // ============================================================
  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'analisis' },
    { konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'prediksi' },
    { konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-diperiksa', tipe: 'analisis' },
    { konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'container-diperiksa', tipe: 'analisis' },
    { konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-container-positif', tipe: 'analisis' },
    { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'analisis' },
    { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'prediksi' },
    { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-diperiksa', tipe: 'analisis' },
    { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'container-diperiksa', tipe: 'analisis' },
    { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-container-positif', tipe: 'analisis' },
    { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'larvasida', tipe: 'analisis' },
    { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'luas-insektisida', tipe: 'analisis' },
  ];
  // Dijalankan di background sedini mungkin, di-await belakangan bareng
  // hasil query data chart (lihat `await hasilAIPromise` di bawah) --
  // supaya jalan PARALEL dengan query utama, bukan menambah waktu tunggu.
  const hasilAIPromise = getBanyakHasilAI(permintaanAI);

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

  // Ambil hasil batch AI yang sudah jalan di background sejak awal fungsi ini.
  const hasilAI = await hasilAIPromise;

  const hasilAnalisisMingguanHiCiAbj = hasilAI[kunciAI({ konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'analisis' })];
  const hasilPrediksiMingguanHiCiAbj = hasilAI[kunciAI({ konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'prediksi' })];
  const hasilAnalisisMingguanRumahDiperiksa = hasilAI[kunciAI({ konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-diperiksa', tipe: 'analisis' })];
  const hasilAnalisisMingguanContainerDiperiksa = hasilAI[kunciAI({ konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'container-diperiksa', tipe: 'analisis' })];
  const hasilAnalisisMingguanRumahContainerPositif = hasilAI[kunciAI({ konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-container-positif', tipe: 'analisis' })];

  const hasilAnalisisBulananHiCiAbj = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'analisis' })];
  const hasilPrediksiBulananHiCiAbj = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'prediksi' })];
  const hasilAnalisisBulananRumahDiperiksa = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-diperiksa', tipe: 'analisis' })];
  const hasilAnalisisBulananContainerDiperiksa = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'container-diperiksa', tipe: 'analisis' })];
  const hasilAnalisisBulananRumahContainerPositif = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-container-positif', tipe: 'analisis' })];
  const hasilAnalisisBulananLarvasida = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'larvasida', tipe: 'analisis' })];
  const hasilAnalisisBulananLuasInsektisida = hasilAI[kunciAI({ konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'luas-insektisida', tipe: 'analisis' })];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">🦟 Surveilans Vektor Aedes Aegypti (DBD)</h1>
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
            <h2 className="mb-2 text-sm text-center font-semibold text-gray-700">Distribusi Hasil Pengawasan Larva Aedes Tahun {tahun} <br />
              (HI - CI - BI - ABJ - Curah Hujan)</h2>
            <TrenChartMingguan
              data={dataChart}
              seriesList={[
                { key: 'hi', label: 'HI (%)', warna: '#B71C1C' },
                { key: 'ci', label: 'CI (%)', warna: '#EF6C00' },
                { key: 'bi', label: 'BI', warna: '#7C3AED' },
                { key: 'abj', label: 'ABJ (%)', warna: '#2F9E44', axis: 'kanan' },
                { key: 'curah_hujan_mm', label: 'Curah Hujan (mm)', warna: '#0F4C5C', axis: 'kanan', tipe: 'bar' },
              ]}
              ambangBatas={{ nilai: 1, label: '⚠ Threshold (>1)' }}
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksMingguan}
                periodeKey={periodeKeyMingguan}
                wilayahKerja={wilker ?? undefined}
                metrik="hi-ci-abj"
                hasilAwal={hasilAnalisisMingguanHiCiAbj}
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksMingguan}
                periodeKey={periodeKeyMingguan}
                wilayahKerja={wilker ?? undefined}
                metrik="hi-ci-abj"
                hasilAwal={hasilPrediksiMingguanHiCiAbj}
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Distribusi Rumah Diperiksa dalam Mingguan, Tahun {tahun}</h2>
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
                hasilAwal={hasilAnalisisMingguanRumahDiperiksa}
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Distribusi Container Diperiksa dalam Mingguan, Tahun {tahun}</h2>
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
                hasilAwal={hasilAnalisisMingguanContainerDiperiksa}
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">
              Distribusi Rumah Positif dan Container Positif dalam Mingguan, Tahun {tahun}
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
                hasilAwal={hasilAnalisisMingguanRumahContainerPositif}
              />
            </div>
          </div>

          {/* ================= BULANAN ================= */}

          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <FilterWilker daftarWilker={daftarWilker} />
              <FilterZonaSubLokasi />
              <FilterRentangBulan />
            </div>

            <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">
              Distribusi Hasil Pengawasan Larva Aedes Tahun {tahun} <br />
              (HI - CI - BI - ABJ - Curah Hujan)
            </h2>

            <TrenChartBulanan data={dataBulanan} />

            {/* checkbox legend — pindah ke sini, di bawah grafik */}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksBulanan}
                periodeKey={periodeKeyBulanan}
                wilayahKerja={wilker ?? undefined}
                metrik="hi-ci-abj"
                hasilAwal={hasilAnalisisBulananHiCiAbj}
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={roleAI}
                konteks={konteksBulanan}
                periodeKey={periodeKeyBulanan}
                wilayahKerja={wilker ?? undefined}
                metrik="hi-ci-abj"
                hasilAwal={hasilPrediksiBulananHiCiAbj}
              />
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <GrafikBarBulanan
                judul="Distribusi Rumah Diperiksa"
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
                hasilAwal={hasilAnalisisBulananRumahDiperiksa}
              />
            </div>

            <div className="space-y-2">
              <GrafikBarBulanan
                judul="Distribusi Container Diperiksa"
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
                hasilAwal={hasilAnalisisBulananContainerDiperiksa}
              />
            </div>

            <div className="space-y-2">
              <GrafikBarBulanan
                judul="Distribusi Rumah Positif & Container Positif "
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
                hasilAwal={hasilAnalisisBulananRumahContainerPositif}
              />
            </div>

            <div className="space-y-2">
              <GrafikBarBulanan
                judul="Distribusi Larvasida — Bulanan"
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
                hasilAwal={hasilAnalisisBulananLarvasida}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <GrafikBarBulanan
                judul="Distribusi Luas Wilayah Fogging & Jumlah Insektisida — Bulanan"
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
                hasilAwal={hasilAnalisisBulananLuasInsektisida}
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
              judul={`Tindakan Pengendalian — Minggu Epid ke-${periodeMinggu1Lalu.minggu} (data berjalan)`}
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