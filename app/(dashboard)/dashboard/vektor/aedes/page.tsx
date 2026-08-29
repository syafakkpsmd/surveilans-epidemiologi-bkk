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
import ToggleGranularitas from '@/components/vektor/ToggleGranularitas';
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
    granularitas?: string;
  }>;
}) {
  const { wilker, tahun: tahunParam, zona, subLokasi, mgDari, mgSampai, bulanDari, bulanSampai, granularitas: granularitasParam } =
    await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();

  // BARU: toggle granularitas -- default "mingguan". Cuma section yang
  // aktif yang dirender DAN di-query datanya, jadi request Supabase +
  // AI yang tidak perlu tidak dijalankan sama sekali (hemat kuota).
  const granularitas: 'mingguan' | 'bulanan' = granularitasParam === 'bulanan' ? 'bulanan' : 'mingguan';
  const butuhMingguan = granularitas === 'mingguan';
  const butuhBulanan = granularitas === 'bulanan';

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
  // BATCH-FETCH HASIL AI -- SEKARANG KONDISIONAL per granularitas aktif.
  // Dulu semua 12 kombinasi (4 mingguan + 6 bulanan + 2 prediksi)
  // di-prefetch tiap kali halaman dibuka meski cuma satu granularitas
  // yang tampil. Sekarang cuma kombinasi granularitas AKTIF yang masuk
  // permintaanAI -- separuh query AI langsung tidak pernah dijalankan.
  // ============================================================
  const permintaanAI: PermintaanHasilAI[] = [];
  if (butuhMingguan) {
    permintaanAI.push(
      { konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'analisis' },
      { konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'prediksi' },
      { konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-diperiksa', tipe: 'analisis' },
      { konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'container-diperiksa', tipe: 'analisis' },
      { konteks: konteksMingguan, periodeKey: periodeKeyMingguan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-container-positif', tipe: 'analisis' },
    );
  }
  if (butuhBulanan) {
    permintaanAI.push(
      { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'analisis' },
      { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'hi-ci-abj', tipe: 'prediksi' },
      { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-diperiksa', tipe: 'analisis' },
      { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'container-diperiksa', tipe: 'analisis' },
      { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'rumah-container-positif', tipe: 'analisis' },
      { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'larvasida', tipe: 'analisis' },
      { konteks: konteksBulanan, periodeKey: periodeKeyBulanan, wilayahKerja: wilayahKerjaAi, metrik: 'luas-insektisida', tipe: 'analisis' },
    );
  }
  const hasilAIPromise = getBanyakHasilAI(permintaanAI);

  // ============================================================
  // DATA CHART -- juga kondisional. Query mingguan (ringkasanMingguan,
  // dataAktivitasMingguan) cuma dijalankan kalau granularitas="mingguan",
  // query bulanan (dataBulanan, dataAktivitasBulanan) cuma kalau
  // granularitas="bulanan". Breakdown Zona & Donut Tindakan Pengendalian
  // TETAP selalu dijalankan (independen dari toggle, selalu berbasis
  // minggu berjalan -- sama seperti sebelumnya).
  // ============================================================
  const [role, daftarWilker] = await Promise.all([getUserRole(), getWilkerRef()]);

  let ringkasanMingguan: Awaited<ReturnType<typeof getRingkasanVektorDbdRentang>> = [];
  let dataAktivitasMingguan: any[] = [];
  if (butuhMingguan) {
    [ringkasanMingguan, dataAktivitasMingguan] = await Promise.all([
      getRingkasanVektorDbdRentang({
        tahun,
        mgDari: mgDari ? parseInt(mgDari, 10) : undefined,
        mgSampai: mgSampai ? parseInt(mgSampai, 10) : undefined,
        kodeWilker: wilker,
        zona,
        subLokasi,
      }),
      getRingkasanVektorAktivitasMingguan({
        tahun,
        mgDari: mgDari ? parseInt(mgDari, 10) : undefined,
        mgSampai: mgSampai ? parseInt(mgSampai, 10) : undefined,
        kodeWilker: wilker,
        zona,
        subLokasi,
      }),
    ]);
  }

  let dataBulanan: any[] = [];
  let dataAktivitasBulanan: any[] = [];
  if (butuhBulanan) {
    [dataBulanan, dataAktivitasBulanan] = await Promise.all([
      getRingkasanVektorDbdBulanan({ tahun, kodeWilker: wilker, zona, subLokasi, bulanDari, bulanSampai }),
      getRingkasanVektorAktivitasBulanan({ tahun, kodeWilker: wilker, zona, subLokasi, bulanDari, bulanSampai }),
    ]);
  }

// Rentang tanggal minggu berjalan
  const { mulai, selesai } = getRentangMingguEpid(tahunBerjalan, mingguBerjalan);

  const filterTambahanBreakdown: Record<string, string> = {};
  if (zona) filterTambahanBreakdown.zona = zona;
  if (subLokasi) filterTambahanBreakdown.sub_lokasi = subLokasi;

  const [breakdownZona, breakdownTindakanMingguIni, breakdownTindakanTotal] = await Promise.all([
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
      tglMulai: mulai, // <-- Menggunakan 'mulai' minggu berjalan
      tglSelesai: selesai, // <-- Menggunakan 'selesai' minggu berjalan
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

  // Cek "kosong" berdasarkan granularitas aktif -- dulu selalu pakai
  // ringkasanMingguan.length, sekarang tergantung data mana yang
  // sebenarnya di-query untuk granularitas aktif.
  const dataKosong = butuhMingguan ? ringkasanMingguan.length === 0 : dataBulanan.length === 0;

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
          <ToggleGranularitas granularitasAktif={granularitas} />
          <FilterWilker daftarWilker={daftarWilker} />
          <FilterZonaSubLokasi />
          {butuhMingguan ? <FilterRentangMinggu /> : <FilterRentangBulan />}
        </div>
      </div>

      {dataKosong ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Belum ada kegiatan tercatat untuk tahun {tahun}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ================= MINGGUAN ================= */}
          {butuhMingguan && (
            <>
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
                    { key: 'rumah_positif', label: 'Rumah Positif', warna: '#1E3A8A' },
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
            </>
          )}

          {/* ================= BULANAN ================= */}
          {butuhBulanan && (
            <>
              <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
                <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">
                  Distribusi Hasil Pengawasan Larva Aedes Tahun {tahun} <br />
                  (HI - CI - BI - ABJ - Curah Hujan)
                </h2>

                <TrenChartBulanan data={dataBulanan} />

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
            </>
          )}

          {/* ================= BREAKDOWN & DONUT (selalu tampil, independen dari toggle) ================= */}

          <BreakdownList
            judul={`Breakdown Zona — Minggu Epid ke-${mingguBerjalan}`}
            data={breakdownZona}
            warna="#B71C1C"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DonutChart
              judul={`Tindakan Pengendalian (Minggu Epid ke-${mingguBerjalan})`}
              data={breakdownTindakanMingguIni}
            />
            <DonutChart
              judul="Tindakan Pengendalian (Keseluruhan Data)"
              data={breakdownTindakanTotal}
            />
          </div>
        </div>
      )}
    </div>
  );
}