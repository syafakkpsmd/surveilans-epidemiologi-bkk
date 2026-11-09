import Link from 'next/link';
import { getDaftarWilker } from '@/lib/wilayah-kerja/server';
import { getValidRole } from '@/lib/auth/utils';
import {
  getTrenDiareMultiVariabel,
  getHasilPengamatanPerWilker,
  getTrenDiareBulanan,
  getHasilPengamatanBulanan,
  getLokasiTidakMemenuhiSyarat,
} from '@/lib/db/queries/queriesVektorDiareEnhanced';
import { getBreakdownKategori, getRentangMingguEpid } from '@/lib/db/queries/queriesVektorBreakdown';
import { getUserRole } from '@/lib/auth/get-user-role';
import { getMingguEpidSaatIni } from '@/lib/epi-week';
import FilterWilker from '@/components/vektor/FilterWilker';
import FilterTahun from '@/components/FilterTahun';
import FilterRentangMinggu from '@/components/vektor/FilterRentangMinggu';
import FilterRentangBulan from '@/components/vektor/FilterRentangBulan';
import { bacaTahun, bulanTampil, jumlahMingguEpid } from '@/lib/tahun';
import BreakdownList from '@/components/vektor/BreakdownList';
import { GrafikHasilPengamatanWilker } from '@/components/vektor/GrafikHasilPengamatanWilker';
import GrafikInsektisidaVsLuas from '@/components/vektor/GrafikInsektisidaVsLuas';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import PanelTrenDiareLingkungan from '@/components/vektor/PanelTrenDiareLingkungan';
import DaftarLokasiTidakMemenuhi from '@/components/vektor/DaftarLokasiTidakMemenuhi';
import { getBanyakHasilAI, kunciAI, type PermintaanHasilAI } from '@/lib/ai/getBanyakHasilAI';

// Nomor bulan (1-12) sebuah baris data bulanan; null bila tidak bisa dikenali (baris itu tidak disaring).
const BULAN_PENDEK = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
function nomorBulan(r: Record<string, any>): number | null {
  const v = r.bulan ?? r.periode ?? r.bulanLabel ?? r.bulan_label;
  if (typeof v === 'number') return v >= 1 && v <= 12 ? v : null;
  if (typeof v !== 'string') return null;
  const ym = v.match(/^\d{4}-(\d{1,2})$/);
  if (ym) return Number(ym[1]);
  if (/^\d{1,2}$/.test(v)) return Number(v);
  const i = BULAN_PENDEK.indexOf(v.trim().slice(0, 3).toLowerCase());
  return i >= 0 ? i + 1 : null;
}

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

const SERI_LINGKUNGAN = [
  { key: 'suhu_rerata', label: 'Suhu (°C)', warna: '#F59E0B', axis: 'kanan' as const },
  { key: 'kelembapan_rerata', label: 'Kelembaban (%)', warna: '#0EA5E9', axis: 'kanan' as const },
  { key: 'curah_hujan_rerata', label: 'Curah Hujan (mm)', warna: '#2563EB', axis: 'kanan' as const },
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

  const resolvedParams = await searchParams;
  const { wilker, tahun: tahunParam, mode, mgDari, mgSampai, bulanDari, bulanSampai } = resolvedParams;

  const { tahunEpid, mingguEpid: mingguEpidAsli } = getMingguEpidSaatIni();

  let tahunDefault = tahunEpid;
  let mingguBerjalan = mingguEpidAsli - 1;

  if (mingguBerjalan < 1) {
    tahunDefault = tahunEpid - 1;
    mingguBerjalan = 52;
  }

  const tahun = tahunParam ? bacaTahun(tahunParam) : tahunDefault;

  // Tahun yang dipilih bukan tahun berjalan: tampilkan seluruh minggu/bulan tahun itu (default rentang Mg-1 s.d. akhir tahun).
  if (tahun !== tahunDefault) mingguBerjalan = jumlahMingguEpid(tahun);
  const bulanBerjalan = bulanTampil(tahun); // 12 untuk tahun selain tahun ini

  const paramsAny = resolvedParams as Record<string, string | undefined>;
  const mgDariParam = mgDari || paramsAny.mgAwal;
  const mgSampaiParam = mgSampai || paramsAny.mgAkhir;

  // Rentang default jika URL belum ada filter: Mg-1 s.d mingguBerjalan
  const mgAwalDipilih = mgDariParam ? parseInt(mgDariParam, 10) : 1;
  const mgAkhirDipilih = mgSampaiParam ? parseInt(mgSampaiParam, 10) : mingguBerjalan;

  const bulanAwalDipilih = bulanDari ? parseInt(bulanDari.split('-')[1], 10) : 1;
  const bulanAkhirDipilih = bulanSampai ? parseInt(bulanSampai.split('-')[1], 10) : bulanBerjalan;
  const tahunBulanDipilih = bulanDari ? parseInt(bulanDari.split('-')[0], 10) : tahun;

  const isModeBulanan = mode === 'bulanan';

  const periodeKeyMingguan = `${tahun}-W${mgAwalDipilih}_W${mgAkhirDipilih}`;
  const periodeKeyBulanan = `${tahunBulanDipilih}-M${bulanAwalDipilih}_M${bulanAkhirDipilih}`;
  const konteksMingguan = `${cfg.konteks}`;
  const konteksBulanan = cfg.konteks.replace('-mingguan', '-bulanan');

  const konteksAktif = isModeBulanan ? konteksBulanan : konteksMingguan;
  const periodeKeyAktif = isModeBulanan ? periodeKeyBulanan : periodeKeyMingguan;

  const { mulai, selesai } = getRentangMingguEpid(tahun, mingguBerjalan);

  const permintaanAI: PermintaanHasilAI[] = [
    { konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, metrik: cfg.metrikUtama.key, tipe: 'analisis' },
    { konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, metrik: cfg.metrikUtama.key, tipe: 'prediksi' },
  ];

  const [
    role,
    daftarWilker,
    dataMingguan,
    dataBulanan,
    hasilPerWilker,
    lokasiTidakMemenuhi,
    breakdownLokasi,
    hasilAI,
  ] = await Promise.all([
    getUserRole(),
    getDaftarWilker(),
    getTrenDiareMultiVariabel(tahun, jenis, wilker, mgAwalDipilih, mgAkhirDipilih),
    getTrenDiareBulanan(tahun, jenis, wilker),
    isModeBulanan
      ? getHasilPengamatanBulanan(tahun, jenis, wilker)
      : getHasilPengamatanPerWilker(tahun, jenis, wilker, mgAwalDipilih, mgAkhirDipilih),
    getLokasiTidakMemenuhiSyarat(tahun, jenis, wilker),
    getBreakdownKategori({
      tabel: 'vektor_diare',
      kolomTanggal: 'tgl_kegiatan',
      kolomKategori: 'lokasi',
      tglMulai: mulai,
      tglSelesai: selesai,
      kodeWilker: wilker,
      filterTambahan: { jenis_kegiatan: jenis },
    }),
    getBanyakHasilAI(permintaanAI),
  ]);

  // Data bulanan diambil setahun penuh; saring ke rentang bulan terpilih (baris yang bulannya tak dikenali dibiarkan).
  const dataBulananTampil = dataBulanan.filter((r) => {
    const b = nomorBulan(r as Record<string, any>);
    return b === null || (b >= bulanAwalDipilih && b <= bulanAkhirDipilih);
  });

  const hasilAnalisisAktif = hasilAI[kunciAI({ konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, metrik: cfg.metrikUtama.key, tipe: 'analisis' })];
  const hasilPrediksiAktif = hasilAI[kunciAI({ konteks: konteksAktif, periodeKey: periodeKeyAktif, wilayahKerja: wilker, metrik: cfg.metrikUtama.key, tipe: 'prediksi' })];

  // Diperbaiki menggunakan properti standar tipe Wilayah (w.kode dan w.nama)
  const wilkerTerpilih = daftarWilker.find((w) => w.kode === wilker);
  const namaWilkerLengkap = wilkerTerpilih ? (wilkerTerpilih.nama || wilkerTerpilih.namaPendek) : wilker;

  // Casting Record<string, any> untuk mencegah error TypeScript 7053
  const barisTerakhir = dataMingguan.length > 0 ? (dataMingguan[dataMingguan.length - 1] as Record<string, any>) : null;
  const nilaiTerakhirMetrik = barisTerakhir ? (barisTerakhir[cfg.metrikUtama.key] || 0) : 0;

  return (
    <div className="space-y-6">
      {/* Header Utama & Tombol Navigasi Kelola Data */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-xs">
        <div>
          <h1 className="text-lg font-bold">
            {cfg.ikon} {cfg.judul}
          </h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <Link
            href={`/dashboard/data/vektor/${jenis}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C5C] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0b3844] transition-colors"
          >
            <span>+ Input &amp; Kelola Data {jenis === 'lalat' ? 'Lalat' : 'Kecoa'}</span>
          </Link>

          <FilterTahun />
          {isModeBulanan ? (
            <FilterRentangBulan key={`bln-${tahun}`} bulanAkhirDefault={bulanBerjalan} />
          ) : (
            <FilterRentangMinggu key={`mg-${tahun}`} mingguAkhirDefault={mingguBerjalan} jumlahMinggu={jumlahMingguEpid(tahun)} />
          )}
          <FilterWilker daftarWilker={daftarWilker} />
        </div>
      </div>

      {/* Kartu Ringkasan Metrik Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-500">Rata-rata {cfg.metrikUtama.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{nilaiTerakhirMetrik}</span>
            <span className="text-xs text-slate-600">{jenis === 'lalat' ? 'ekor/block grill' : 'ekor/m²'}</span>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-500">Ambang Batas (Threshold)</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">&le; {cfg.threshold}</span>
            <span className="text-xs text-slate-600">Batas Normal</span>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-500">Lokasi Tidak Memenuhi Syarat (TMS)</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{lokasiTidakMemenuhi.length}</span>
            <span className="text-xs text-slate-600">Titik / Lokasi</span>
          </div>
        </div>
      </div>

      {/* Grafik & Panel Lingkungan */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <PanelTrenDiareLingkungan
            key={tahun}
            judulMingguan={`Tren Mingguan ${cfg.labelMingguan} ${namaWilkerLengkap ? ` di ${namaWilkerLengkap}` : ''} Tahun ${tahun}`}
            judulBulanan={`Distribusi ${cfg.metrikUtama.label} ${namaWilkerLengkap ? ` di ${namaWilkerLengkap}` : ''} Tahun ${tahun}`}
            dataMingguan={dataMingguan}
            dataBulanan={dataBulananTampil}
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
            data={isModeBulanan ? dataBulananTampil : dataMingguan}
            warna={cfg.metrikUtama.warna}
            isBulanan={isModeBulanan}
          />
        </div>
      </div>

      {/* Analisis AI & Breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BoxAnalisisAI
          sudahLogin={role !== null}
          role={getValidRole(role)}
          konteks={konteksAktif}
          periodeKey={periodeKeyAktif}
          wilayahKerja={wilker}
          metrik={cfg.metrikUtama.key}
          hasilAwal={hasilAnalisisAktif}
        />
        <BoxPrediksiAI
          sudahLogin={role !== null}
          role={getValidRole(role)}
          konteks={konteksAktif}
          periodeKey={periodeKeyAktif}
          wilayahKerja={wilker}
          metrik={cfg.metrikUtama.key}
          hasilAwal={hasilPrediksiAktif}
        />
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