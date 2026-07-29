import { getWilkerRef } from '@/lib/supabase/queries';
import { getValidRole } from '@/lib/auth/utils';
import {
  getTrenDiareMultiVariabel,
  getHasilPengamatanPerWilker,
  getTrenDiareBulanan,
  getHasilPengamatanBulanan,
  getLokasiTidakMemenuhiSyarat,
} from '@/lib/supabase/queriesVektorDiareEnhanced';
import { getBreakdownKategori, getRentangMingguEpid } from '@/lib/supabase/queriesVektorBreakdown';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getMingguEpidSaatIni } from '@/lib/epi-week';
import FilterWilker from '@/components/vektor/FilterWilker';
import BreakdownList from '@/components/vektor/BreakdownList';
import { GrafikHasilPengamatanWilker } from '@/components/vektor/GrafikHasilPengamatanWilker';
import GrafikInsektisidaVsLuas from '@/components/vektor/GrafikInsektisidaVsLuas';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import PanelTrenDiareLingkungan from '@/components/vektor/PanelTrenDiareLingkungan';
import DaftarLokasiTidakMemenuhi from '@/components/vektor/DaftarLokasiTidakMemenuhi';
import { getBanyakHasilAI, kunciAI, type PermintaanHasilAI } from '@/lib/ai/getBanyakHasilAI';

const KONFIG = {
  lalat: {
    ikon: '🪰',
    judul: 'Surveilans Vektor Diare — Lalat',
    labelMingguan: 'Angka Kepadatan Lalat',
    metrikUtama: { key: 'fly_index_rerata', label: 'Fly Index', warna: '#E65100' },
    threshold: 8,
    konteks: 'vektor-diare-lalat-mingguan',
  },
  kecoa: {
    ikon: '🪳',
    judul: 'Surveilans Vektor Diare — Kecoa',
    labelMingguan: 'Angka Kepadatan Kecoa',
    metrikUtama: { key: 'kepadatan_kecoa_rerata', label: 'Kepadatan/m²', warna: '#5B21B6' },
    threshold: 2,
    konteks: 'vektor-diare-kecoa-mingguan',
  },
};

// axis: 'kanan' di sini WAJIB diisi -- ini yang bikin tiap variabel
// lingkungan dapat sumbu Y kanan sendiri (bukan numpuk di sumbu kiri
// bareng metrik utama). Tanpa ini, semua series jatuh ke default
// 'kiri' dan skala metrik utama akan "tenggelam" saat variabel dengan
// rentang nilai jauh lebih besar (mis. suhu, curah hujan) diaktifkan.
const SERI_LINGKUNGAN = [
  { key: 'suhu_rerata', label: 'Suhu (°C)', warna: '#F59E0B', axis: 'kanan' as const },
  { key: 'kelembapan_rerata', label: 'Kelembaban (%)', warna: '#0EA5E9', axis: 'kanan' as const },
  { key: 'curah_hujan_rerata', label: 'Curah Hujan (mm)', warna: '#2563EB', axis: 'kanan' as const },
  // Catatan: cuaca_dominan kemungkinan bernilai string kategorikal
  // (mis. "Cerah"/"Hujan"), bukan angka -- kalau begitu ia tidak akan
  // tergambar wajar sebagai Line/Bar di sumbu numerik manapun, axis
  // di sini hanya berjaga-jaga kalau datanya ternyata numerik.
  { key: 'cuaca_dominan', label: 'Cuaca', warna: '#64748B', axis: 'kanan' as const },
];

export default async function HalamanDiare({
  jenis,
  searchParams,
}: {
  jenis: 'lalat' | 'kecoa';
  searchParams: Promise<{
    wilker?: string;
    tahun?: string;
    mode?: string;
    mgDari?: string;
    mgSampai?: string;
    bulanDari?: string;
    bulanSampai?: string;
  }>;
}) {
  const cfg = KONFIG[jenis];

  // 1. Unwrap searchParams
  const resolvedParams = await searchParams;
  const { wilker, tahun: tahunParam, mode, mgDari, mgSampai, bulanDari, bulanSampai } = resolvedParams;

  const { tahunEpid, mingguEpid: mingguEpidAsli } = getMingguEpidSaatIni();
  const bulanBerjalan = new Date().getMonth() + 1;

  // 2. Hitung minggu berjalan aman (minus 1 minggu)
  let tahunDefault = tahunEpid;
  let mingguBerjalan = mingguEpidAsli - 1;

  if (mingguBerjalan < 1) {
    tahunDefault = tahunEpid - 1;
    mingguBerjalan = 52;
  }

  // 3. Tahun yang dipakai query
  const tahun = tahunParam ? parseInt(tahunParam, 10) : tahunDefault;

  // 4. Rentang Mingguan (tangkap mgDari / mgAwal & mgSampai / mgAkhir)
  const paramsAny = resolvedParams as Record<string, string | undefined>;
  const mgDariParam = mgDari || paramsAny.mgAwal;
  const mgSampaiParam = mgSampai || paramsAny.mgAkhir;

  const mgAwalDipilih = mgDariParam ? parseInt(mgDariParam, 10) : mingguBerjalan;
  const mgAkhirDipilih = mgSampaiParam ? parseInt(mgSampaiParam, 10) : mingguBerjalan;

  // 5. Rentang Bulanan
  const bulanAwalDipilih = bulanDari ? parseInt(bulanDari.split('-')[1], 10) : bulanBerjalan;
  const bulanAkhirDipilih = bulanSampai ? parseInt(bulanSampai.split('-')[1], 10) : bulanBerjalan;
  const tahunBulanDipilih = bulanDari ? parseInt(bulanDari.split('-')[0], 10) : tahun;

  // 6. Tentukan Mode Tampilan (Bulanan vs Mingguan)
  const isModeBulanan = mode === 'bulanan';

  // Periode Key & konteks -- dipindah ke sini (murni sinkron, sebelum
  // Promise.all) supaya permintaan batch AI di bawah bisa disiapkan
  // sedini mungkin, sama seperti pola di modul Anopheles Dewasa.
  const periodeKeyMingguan = `${tahunEpid}-W${mgAwalDipilih}_W${mgAkhirDipilih}`;
  const periodeKeyBulanan = `${tahunBulanDipilih}-M${bulanAwalDipilih}_M${bulanAkhirDipilih}`;
  const konteksMingguan = `${cfg.konteks}`;
  const konteksBulanan = cfg.konteks.replace('-mingguan', '-bulanan');

  // ============================================================
  // BATCH-FETCH HASIL AI -- Box AI di halaman ini mengikuti mode
  // (Mingguan/Bulanan) yang sedang aktif, jadi cuma SATU pasang
  // (analisis + prediksi) yang benar-benar dirender & dibutuhkan
  // per render server -- pola sama dengan modul Anopheles Dewasa.
  // konteks/periodeKey/metrik dipilih sesuai isModeBulanan, lalu
  // getBanyakHasilAI dipanggil sedini mungkin & di-await belakangan
  // bareng query chart, supaya jalan PARALEL.
  // ============================================================
  const konteksAktif = isModeBulanan ? konteksBulanan : konteksMingguan;
  const periodeKeyAktif = isModeBulanan ? periodeKeyBulanan : periodeKeyMingguan;
  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, metrik: cfg.metrikUtama.key, tipe: 'analisis' },
    { konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, metrik: cfg.metrikUtama.key, tipe: 'prediksi' },
  ];
  const hasilAIPromise = getBanyakHasilAI(permintaanAI);

  // 7. Fetch Data secara Parallel
  const [role, daftarWilker, dataMingguan, dataBulanan, hasilPerWilker, lokasiTidakMemenuhi] =
    await Promise.all([
      getUserRole(),
      getWilkerRef(),
      getTrenDiareMultiVariabel(tahun, jenis, wilker, mgAwalDipilih, mgAkhirDipilih),
      getTrenDiareBulanan(tahun, jenis, wilker),
      isModeBulanan
        ? getHasilPengamatanBulanan(tahun, jenis, wilker)
        : getHasilPengamatanPerWilker(tahun, jenis, wilker),
      getLokasiTidakMemenuhiSyarat(tahun, jenis, wilker),
    ]);

  const { mulai, selesai } = getRentangMingguEpid(tahunEpid, mingguBerjalan);

  const breakdownLokasi = await getBreakdownKategori({
    tabel: 'vektor_diare',
    kolomTanggal: 'tgl_kegiatan',
    kolomKategori: 'lokasi',
    tglMulai: mulai,
    tglSelesai: selesai,
    kodeWilker: wilker,
    filterTambahan: { jenis_kegiatan: jenis },
  });

  // Ambil hasil batch AI yang sudah jalan di background sejak awal fungsi ini.
  const hasilAI = await hasilAIPromise;
  const hasilAnalisisAktif = hasilAI[kunciAI({ konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, metrik: cfg.metrikUtama.key, tipe: 'analisis' })];
  const hasilPrediksiAktif = hasilAI[kunciAI({ konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, metrik: cfg.metrikUtama.key, tipe: 'prediksi' })];

  // Cari nama wilayah
  const wilkerTerpilih = daftarWilker.find(
    (w: any) => (w.kode_wilker || w.kode || w.id) === wilker
  );
  const namaWilkerLengkap = wilkerTerpilih
    ? (wilkerTerpilih.nama_wilker || wilkerTerpilih.nama_wilayah || wilkerTerpilih.nama)
    : wilker;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            {cfg.ikon} {cfg.judul}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterWilker daftarWilker={daftarWilker} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <PanelTrenDiareLingkungan
            judulMingguan={`Tren Mingguan ${cfg.labelMingguan} ${namaWilkerLengkap ? ` di ${namaWilkerLengkap}` : ''} Tahun ${tahun}`}
            judulBulanan={`Distribusi ${cfg.metrikUtama.label} ${namaWilkerLengkap ? ` di ${namaWilkerLengkap}` : ''} Tahun ${tahun}`}
            dataMingguan={dataMingguan}
            dataBulanan={dataBulanan}
            metrikUtama={cfg.metrikUtama}
            seriTambahan={SERI_LINGKUNGAN}
          />
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">
            {isModeBulanan
              ? `Hasil Pengamatan Bulanan ${namaWilkerLengkap ? `${namaWilkerLengkap}` : ''}`
              : `Tren Pengamatan Mingguan ${namaWilkerLengkap ? `${namaWilkerLengkap}` : ''}`}
          </h2>
          <GrafikHasilPengamatanWilker data={hasilPerWilker} isBulanan={isModeBulanan} />
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">
            Jumlah Insektisida & Luas Area
          </h2>
          <GrafikInsektisidaVsLuas
            data={isModeBulanan ? dataBulanan : dataMingguan}
            warna={cfg.metrikUtama.warna}
            isBulanan={isModeBulanan}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isModeBulanan ? (
          <>
            <BoxAnalisisAI
              sudahLogin={role !== null}
              role={getValidRole(role)}
              konteks={konteksBulanan}
              periodeKey={periodeKeyBulanan}
              wilayahKerja={wilker}
              metrik={cfg.metrikUtama.key}
              hasilAwal={hasilAnalisisAktif}
            />
            <BoxPrediksiAI
              sudahLogin={role !== null}
              role={getValidRole(role)}
              konteks={konteksBulanan}
              periodeKey={periodeKeyBulanan}
              wilayahKerja={wilker}
              metrik={cfg.metrikUtama.key}
              hasilAwal={hasilPrediksiAktif}
            />
          </>
        ) : (
          <>
            <BoxAnalisisAI
              sudahLogin={role !== null}
              role={getValidRole(role)}
              konteks={konteksMingguan}
              periodeKey={periodeKeyMingguan}
              wilayahKerja={wilker}
              metrik={cfg.metrikUtama.key}
              hasilAwal={hasilAnalisisAktif}
            />
            <BoxPrediksiAI
              sudahLogin={role !== null}
              role={getValidRole(role)}
              konteks={konteksMingguan}
              periodeKey={periodeKeyMingguan}
              wilayahKerja={wilker}
              metrik={cfg.metrikUtama.key}
              hasilAwal={hasilPrediksiAktif}
            />
          </>
        )}
        <BreakdownList
          judul={`Lokasi Pengamatan — Minggu Epid ke-${mingguBerjalan}`}
          data={breakdownLokasi}
          warna={cfg.metrikUtama.warna}
        />
      </div>

      <DaftarLokasiTidakMemenuhi data={lokasiTidakMemenuhi} daftarWilker={daftarWilker} />
    </div>
  );
}