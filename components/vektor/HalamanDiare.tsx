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
import FilterZonaSubLokasi from '@/components/vektor/FilterZonaSubLokasi';
import BreakdownList from '@/components/vektor/BreakdownList';
import { GrafikHasilPengamatanWilker } from '@/components/vektor/GrafikHasilPengamatanWilker';
import GrafikInsektisidaVsLuas from '@/components/vektor/GrafikInsektisidaVsLuas';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import PanelTrenDiareLingkungan from '@/components/vektor/PanelTrenDiareLingkungan';
import DaftarLokasiTidakMemenuhi from '@/components/vektor/DaftarLokasiTidakMemenuhi';

const KONFIG = {
  lalat: {
    ikon: '🪰',
    judul: 'Vektor Diare — Lalat',
    metrikUtama: { key: 'fly_index_rerata', label: 'Fly Index', warna: '#E65100' },
    threshold: 8,
    konteks: 'vektor-diare-lalat-mingguan',
  },
  kecoa: {
    ikon: '🪳',
    judul: 'Vektor Diare — Kecoa',
    metrikUtama: { key: 'kepadatan_kecoa_rerata', label: 'Kepadatan/m²', warna: '#5B21B6' },
    threshold: 2,
    konteks: 'vektor-diare-kecoa-mingguan',
  },
};

const SERI_LINGKUNGAN = [
  { key: 'suhu_rerata', label: 'Suhu (°C)', warna: '#F59E0B' },
  { key: 'kelembapan_rerata', label: 'Kelembaban (%)', warna: '#0EA5E9' },
  { key: 'curah_hujan_rerata', label: 'Curah Hujan (mm)', warna: '#2563EB' },
  { key: 'cuaca_dominan', label: 'Cuaca', warna: '#64748B' },
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
    mgAwal?: string;
    mgAkhir?: string;
  }>;
}) {
  const cfg = KONFIG[jenis];

  // 1. Unwrap searchParams & Parse Nilai
  const { wilker, tahun: tahunParam, mode, mgAwal, mgAkhir } = await searchParams;
  const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();
  const mingguAwal = mgAwal ? parseInt(mgAwal, 10) : undefined;
  const mingguAkhir = mgAkhir ? parseInt(mgAkhir, 10) : undefined;

  // 2. Tentukan Mode Tampilan (Bulanan vs Mingguan)
  const isModeBulanan = mode === 'bulanan';

  // 3. Fetch Data secara Parallel
  const [role, daftarWilker, dataMingguan, dataBulanan, hasilPerWilker, lokasiTidakMemenuhi] =
    await Promise.all([
      getUserRole(),
      getWilkerRef(),
      getTrenDiareMultiVariabel(tahun, jenis, wilker, mingguAwal, mingguAkhir),
      getTrenDiareBulanan(tahun, jenis, wilker),
      // Switch query data sesuai mode aktif: Bulanan atau Mingguan
      isModeBulanan
        ? getHasilPengamatanBulanan(tahun, jenis, wilker)
        : getHasilPengamatanPerWilker(tahun, jenis, wilker),
      getLokasiTidakMemenuhiSyarat(tahun, jenis, wilker),
    ]);

  const { tahunEpid, mingguEpid: mingguEpidAsli } = getMingguEpidSaatIni();
  const mingguEpid = mingguEpidAsli - 1;
  const { mulai, selesai } = getRentangMingguEpid(tahunEpid, mingguEpid);

  const breakdownLokasi = await getBreakdownKategori({
    tabel: 'vektor_diare',
    kolomTanggal: 'tgl_kegiatan',
    kolomKategori: 'lokasi',
    tglMulai: mulai,
    tglSelesai: selesai,
    kodeWilker: wilker,
    filterTambahan: { jenis_kegiatan: jenis },
  });

  const periodeKey = `${tahunEpid}-W${mingguEpid}`;

  // Cari nama wilayah berdasarkan kode wilker yang dipilih
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
          <FilterZonaSubLokasi />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Tren {cfg.metrikUtama.label} vs Faktor Lingkungan — Tahun {tahun}
          </h2>
          <PanelTrenDiareLingkungan
            judulBulanan={`${cfg.metrikUtama.label} per Bulan`}
            dataMingguan={dataMingguan}
            dataBulanan={dataBulanan}
            metrikUtama={cfg.metrikUtama}
            seriTambahan={SERI_LINGKUNGAN}
          />
        </div>

        {/* Kartu Grafik Hasil Pengamatan */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">
            {isModeBulanan
              ? `Hasil Pengamatan Bulanan ${namaWilkerLengkap ? `(${namaWilkerLengkap})` : ''}`
              : `Hasil Pengamatan Mingguan ${namaWilkerLengkap ? `(${namaWilkerLengkap})` : ''}`}
          </h2>

          <GrafikHasilPengamatanWilker
            data={hasilPerWilker}
            isBulanan={isModeBulanan}
          />
        </div>

        {/* Kartu Grafik Insektisida vs Luas Area */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">
            Jumlah Insektisida vs Luas Area
          </h2>
          <GrafikInsektisidaVsLuas
  data={isModeBulanan ? dataBulanan : dataMingguan}
  warna={cfg.metrikUtama.warna}
  isBulanan={isModeBulanan} // <-- Tambahkan prop ini
/>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BoxAnalisisAI
          sudahLogin={role !== null}
          role={getValidRole(role)}
          konteks={cfg.konteks}
          periodeKey={periodeKey}
          wilayahKerja={wilker}
          metrik={cfg.metrikUtama.key}
        />
        <BoxPrediksiAI
          sudahLogin={role !== null}
          role={getValidRole(role)}
          konteks={cfg.konteks}
          periodeKey={periodeKey}
          wilayahKerja={wilker}
          metrik={cfg.metrikUtama.key}
        />
        <BreakdownList
          judul={`Lokasi Pengamatan — Minggu Epid ke-${mingguEpid}`}
          data={breakdownLokasi}
          warna={cfg.metrikUtama.warna}
        />
      </div>

      <DaftarLokasiTidakMemenuhi data={lokasiTidakMemenuhi} daftarWilker={daftarWilker} />
    </div>
  );
}