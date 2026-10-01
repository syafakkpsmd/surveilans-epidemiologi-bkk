'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { BoxAnalisisAI } from '@/components/BoxAnalisisAI';
import { BoxPrediksiAI } from '@/components/BoxPrediksiAI';
import type {
  RingkasanCascadeTb,
  TitikTrenTb,
  BreakdownFaktorRisikoTb,
  BreakdownWilkerTb,
  RingkasanDelayTb,
  DistribusiWilayahTb,
  TerdugaBelumTindakLanjutTb,
} from '@/lib/turso/tb';

// Palet warna modern untuk chart & visualisasi
const WARNA_PIE = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const NAMA_BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const NAMA_BULAN_PENUH = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatPeriodeBulan(periode: string, penuh = false): string {
  const [tahun, bulanStr] = periode.split('-');
  const idx = parseInt(bulanStr, 10) - 1;
  if (idx < 0 || idx > 11) return periode;
  return penuh ? `${NAMA_BULAN_PENUH[idx]} ${tahun}` : NAMA_BULAN_PENDEK[idx];
}

// --- HELPER: FILLING DATA KOSONG UNTUK CHART ---
function isiRentangBulanLengkap(
  data: TitikTrenTb[],
  bulanMulaiStr: string,
  bulanAkhirStr: string,
  tahun: number
): TitikTrenTb[] {
  if (!bulanMulaiStr || !bulanAkhirStr) return data;

  const startIdx = parseInt(bulanMulaiStr.split('-')[1], 10);
  const endIdx = parseInt(bulanAkhirStr.split('-')[1], 10);

  const dataMap = new Map(data.map((d) => [d.periode, d]));
  const hasil: TitikTrenTb[] = [];

  for (let b = startIdx; b <= endIdx; b++) {
    const periodeKey = `${tahun}-${String(b).padStart(2, '0')}`;
    const adaData = dataMap.get(periodeKey);

    if (adaData) {
      hasil.push(adaData);
    } else {
      hasil.push({
        periode: periodeKey,
        totalSkrining: 0,
        totalTerduga: 0,
        totalTerkonfirmasi: 0,
      });
    }
  }
  return hasil;
}

function isiRentangMingguLengkap(
  data: TitikTrenTb[],
  mingguMulaiStr: string,
  mingguAkhirStr: string,
  tahun: number
): TitikTrenTb[] {
  if (!mingguMulaiStr || !mingguAkhirStr) return data;

  const startW = parseInt(mingguMulaiStr.replace(/.*-W/, ''), 10);
  const endW = parseInt(mingguAkhirStr.replace(/.*-W/, ''), 10);

  const dataMap = new Map(data.map((d) => [d.periode, d]));
  const hasil: TitikTrenTb[] = [];

  for (let w = startW; w <= endW; w++) {
    const periodeKey = `${tahun}-W${String(w).padStart(2, '0')}`;
    const adaData = dataMap.get(periodeKey);

    if (adaData) {
      hasil.push(adaData);
    } else {
      hasil.push({
        periode: periodeKey,
        totalSkrining: 0,
        totalTerduga: 0,
        totalTerkonfirmasi: 0,
      });
    }
  }
  return hasil;
}

type Granularitas = 'mingguan' | 'bulanan';

interface Props {
  sudahLogin: boolean;
  roleAI: 'admin' | 'petugas' | 'petugas_klinik' | null;
  tahunBerjalan: number;
  daftarWilker: readonly string[];
  wilayahTerpilih: string;
  granularitas: Granularitas;
  rentangMingguMulaiTerpasang: string;
  rentangMingguAkhirTerpasang: string;
  rentangBulanMulaiTerpasang: string;
  rentangBulanAkhirTerpasang: string;
  trenMingguanLengkap: TitikTrenTb[];
  trenBulananLengkap: TitikTrenTb[];
  trenMingguanTampil: TitikTrenTb[];
  trenBulananTampil: TitikTrenTb[];
  cascade: RingkasanCascadeTb;
  breakdownFaktorRisiko: BreakdownFaktorRisikoTb[];
  breakdownWilker: BreakdownWilkerTb[];
  delayDiagnosis: RingkasanDelayTb;
  distribusiKabKota: DistribusiWilayahTb[];
  donutJenisKelamin: { label: string; jumlah: number }[];
  bolehLihatDaftarSensitif: boolean;
  daftarBelumTindakLanjut: TerdugaBelumTindakLanjutTb[];
  jumlahBelumTindakLanjut: number;
}

export default function TbClient({
  sudahLogin,
  roleAI,
  tahunBerjalan,
  daftarWilker,
  wilayahTerpilih,
  granularitas,
  rentangMingguMulaiTerpasang,
  rentangMingguAkhirTerpasang,
  rentangBulanMulaiTerpasang,
  rentangBulanAkhirTerpasang,
  trenMingguanLengkap,
  trenBulananLengkap,
  trenMingguanTampil,
  trenBulananTampil,
  cascade,
  breakdownFaktorRisiko,
  breakdownWilker,
  delayDiagnosis,
  distribusiKabKota,
  donutJenisKelamin,
  bolehLihatDaftarSensitif,
  daftarBelumTindakLanjut,
  jumlahBelumTindakLanjut,
}: Props) {
  const router = useRouter();

  const [tempWilayah, setTempWilayah] = useState(wilayahTerpilih);
  const [tempMingguMulai, setTempMingguMulai] = useState(rentangMingguMulaiTerpasang);
  const [tempMingguAkhir, setTempMingguAkhir] = useState(rentangMingguAkhirTerpasang);
  const [tempBulanMulai, setTempBulanMulai] = useState(rentangBulanMulaiTerpasang);
  const [tempBulanAkhir, setTempBulanAkhir] = useState(rentangBulanAkhirTerpasang);

  useEffect(() => {
    setTempWilayah(wilayahTerpilih);
    setTempMingguMulai(rentangMingguMulaiTerpasang);
    setTempMingguAkhir(rentangMingguAkhirTerpasang);
    setTempBulanMulai(rentangBulanMulaiTerpasang);
    setTempBulanAkhir(rentangBulanAkhirTerpasang);
  }, [
    wilayahTerpilih,
    rentangMingguMulaiTerpasang,
    rentangMingguAkhirTerpasang,
    rentangBulanMulaiTerpasang,
    rentangBulanAkhirTerpasang,
  ]);

  function bangunUrl(opsi: {
    wilayah: string;
    granularitas: Granularitas;
    mingguMulai: string;
    mingguAkhir: string;
    bulanMulai: string;
    bulanAkhir: string;
  }) {
    const params = new URLSearchParams();
    params.set('tahun', String(tahunBerjalan));
    params.set('wilayah', opsi.wilayah);
    params.set('granularitas', opsi.granularitas);
    if (opsi.mingguMulai) params.set('minggu_mulai', opsi.mingguMulai);
    if (opsi.mingguAkhir) params.set('minggu_akhir', opsi.mingguAkhir);
    if (opsi.bulanMulai) params.set('bulan_mulai', opsi.bulanMulai);
    if (opsi.bulanAkhir) params.set('bulan_akhir', opsi.bulanAkhir);
    return `/dashboard/tb?${params.toString()}`;
  }

  function gantiGranularitas(g: Granularitas) {
    router.push(
      bangunUrl({
        wilayah: wilayahTerpilih,
        granularitas: g,
        mingguMulai: rentangMingguMulaiTerpasang,
        mingguAkhir: rentangMingguAkhirTerpasang,
        bulanMulai: rentangBulanMulaiTerpasang,
        bulanAkhir: rentangBulanAkhirTerpasang,
      })
    );
  }

  function terapkanFilter() {
    const [mMulai, mAkhir] =
      tempMingguMulai && tempMingguAkhir && tempMingguMulai > tempMingguAkhir
        ? [tempMingguAkhir, tempMingguMulai]
        : [tempMingguMulai, tempMingguAkhir];
    const [bMulai, bAkhir] =
      tempBulanMulai && tempBulanAkhir && tempBulanMulai > tempBulanAkhir
        ? [tempBulanAkhir, tempBulanMulai]
        : [tempBulanMulai, tempBulanAkhir];

    router.push(
      bangunUrl({
        wilayah: tempWilayah,
        granularitas,
        mingguMulai: mMulai,
        mingguAkhir: mAkhir,
        bulanMulai: bMulai,
        bulanAkhir: bAkhir,
      })
    );
  }

  const opsiWilayah = [
    { value: 'semua', label: 'Semua Wilayah Kerja' },
    ...daftarWilker.map((w) => ({ value: w, label: w })),
  ];

  const opsiMinggu = [
    { value: '', label: '(Semua minggu)' },
    ...Array.from({ length: 53 }, (_, i) => {
      const w = i + 1;
      return {
        value: `${tahunBerjalan}-W${String(w).padStart(2, '0')}`,
        label: `Minggu ${w} (${tahunBerjalan})`,
      };
    }),
  ];

  const opsiBulan = [
    { value: '', label: '(Semua bulan)' },
    ...Array.from({ length: 12 }, (_, i) => {
      const periode = `${tahunBerjalan}-${String(i + 1).padStart(2, '0')}`;
      return { value: periode, label: formatPeriodeBulan(periode, true) };
    }),
  ];

  const dataTrenLengkap = granularitas === 'mingguan' ? trenMingguanLengkap : trenBulananLengkap;
  const periodeKeyTerakhir =
    dataTrenLengkap.length > 0 ? dataTrenLengkap[dataTrenLengkap.length - 1].periode : `${tahunBerjalan}`;

  const dataTrenTampil = granularitas === 'mingguan' ? trenMingguanTampil : trenBulananTampil;

  // --- PEMROSESAN LENGKAP DATA DENGAN PADDING GAP KOSONG ---
  const dataTrenTampilUntukChart = useMemo(() => {
    const dataBerentang =
      granularitas === 'bulanan'
        ? isiRentangBulanLengkap(
            dataTrenTampil,
            rentangBulanMulaiTerpasang,
            rentangBulanAkhirTerpasang,
            tahunBerjalan
          )
        : isiRentangMingguLengkap(
            dataTrenTampil,
            rentangMingguMulaiTerpasang,
            rentangMingguAkhirTerpasang,
            tahunBerjalan
          );

    return granularitas === 'bulanan'
      ? dataBerentang.map((t) => ({ ...t, labelSumbu: formatPeriodeBulan(t.periode) }))
      : dataBerentang.map((t) => ({ ...t, labelSumbu: t.periode.replace(/.*-W/, 'Mg ') }));
  }, [
    dataTrenTampil,
    granularitas,
    rentangBulanMulaiTerpasang,
    rentangBulanAkhirTerpasang,
    rentangMingguMulaiTerpasang,
    rentangMingguAkhirTerpasang,
    tahunBerjalan,
  ]);

  const cascadeData = [
    { tahap: 'Diskrining', jumlah: cascade.totalSkrining },
    { tahap: 'Terduga TBC', jumlah: cascade.totalTerduga },
    { tahap: 'Diperiksa', jumlah: cascade.totalDiperiksa },
    { tahap: 'Terkonfirmasi', jumlah: cascade.totalTerkonfirmasi },
  ];

  const adaRentangAktif =
    granularitas === 'mingguan'
      ? Boolean(rentangMingguMulaiTerpasang && rentangMingguAkhirTerpasang)
      : Boolean(rentangBulanMulaiTerpasang && rentangBulanAkhirTerpasang);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* HEADER & FILTER NAVBAR */}
      <div className="flex flex-col gap-3">
        {/* Baris 1: Judul Utama */}
        <div>
          <h1 className="text-xl font-bold text-teal-950">
            Modul TB — Skrining &amp; Investigasi Kontak ({tahunBerjalan})
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {wilayahTerpilih === 'semua' ? 'Semua wilayah kerja' : `Wilayah kerja: ${wilayahTerpilih}`}
            {adaRentangAktif && ' — rentang tampilan aktif'}
          </p>
        </div>

        {/* Baris 2: Toolbar Filter (Rata Kanan) */}
        <div className="flex flex-wrap items-end justify-end gap-2.5">
          <FieldSelect
            label="Wilayah Kerja"
            value={tempWilayah}
            onChange={setTempWilayah}
            opsi={opsiWilayah}
          />

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Tampilan</span>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              <ToggleButton
                aktif={granularitas === 'mingguan'}
                onClick={() => gantiGranularitas('mingguan')}
              >
                Mingguan
              </ToggleButton>
              <ToggleButton
                aktif={granularitas === 'bulanan'}
                onClick={() => gantiGranularitas('bulanan')}
              >
                Bulanan
              </ToggleButton>
            </div>
          </div>

          {granularitas === 'mingguan' ? (
            <>
              <FieldSelect
                label="Dari minggu"
                value={tempMingguMulai}
                onChange={setTempMingguMulai}
                opsi={opsiMinggu}
              />
              <FieldSelect
                label="Sampai minggu"
                value={tempMingguAkhir}
                onChange={setTempMingguAkhir}
                opsi={opsiMinggu}
              />
            </>
          ) : (
            <>
              <FieldSelect
                label="Dari bulan"
                value={tempBulanMulai}
                onChange={setTempBulanMulai}
                opsi={opsiBulan}
              />
              <FieldSelect
                label="Sampai bulan"
                value={tempBulanAkhir}
                onChange={setTempBulanAkhir}
                opsi={opsiBulan}
              />
            </>
          )}

          <button
            onClick={terapkanFilter}
            className="rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0c3e4b] transition-colors"
          >
            Terapkan
          </button>
        </div>
      </div>

      {/* Kartu Ringkasan */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KartuRingkasan label="Total Diskrining" nilai={cascade.totalSkrining} warna="indigo" />
        <KartuRingkasan label="Terduga TBC" nilai={cascade.totalTerduga} warna="amber" />
        <KartuRingkasan label="Terkonfirmasi TBC" nilai={cascade.totalTerkonfirmasi} warna="red" />
        <KartuRingkasan
          label="Case Detection Rate"
          nilai={`${cascade.caseDetectionRate.toFixed(2)}%`}
          warna="teal"
        />
      </div>

      {/* Cascade Funnel */}
      <Panel judul="Alur Penemuan Kasus TBC di BKK Kelas I">
        <p className="mb-3 text-center text-xs text-gray-500">
          Menunjukkan penurunan jumlah dari total diskrining sampai terkonfirmasi TBC — titik penurunan tajam menandakan potensi <i>loss-to-follow-up</i>.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={cascadeData} margin={{ top: 24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="tahap" tick={{ fontSize: 12, fill: '#64748B' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
            <Tooltip cursor={{ fill: '#F8FAFC' }} />
            <Bar dataKey="jumlah" fill="#0F4C5C" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="jumlah" position="top" style={{ fill: '#0F4C5C', fontWeight: 600, fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-center text-xs font-medium text-gray-600">
          Yield dari terduga ke terkonfirmasi: <span className="font-bold text-[#0F4C5C]">{cascade.yieldRateTerduga.toFixed(2)}%</span>
        </p>
      </Panel>

      {/* Grafik Tren */}
      <Panel judul="Distribusi Kegiatan Pengawasan Tuberkulosis di BKK Kelas I Samarinda">
      {/* Subjudul / Keterangan Periode di Baris Bawah */}
      <p className="mb-3 text-center text-xs font-medium text-gray-500">
        Skope Periode: {granularitas === 'mingguan' ? 'Mingguan' : 'Bulanan'}
      </p>
        <ResponsiveContainer width="100%" height={300}>
          {granularitas === 'mingguan' ? (
            <LineChart data={dataTrenTampilUntukChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="labelSumbu" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="totalSkrining" name="Penapisan" stroke="#06B6D4" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="totalTerduga" name="Terduga" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="totalTerkonfirmasi" name="Terkonfirmasi" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <BarChart data={dataTrenTampilUntukChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="labelSumbu" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                labelFormatter={(_, payload) => {
                  const periode = payload?.[0]?.payload?.periode as string | undefined;
                  return periode ? formatPeriodeBulan(periode, true) : '';
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="totalSkrining" name="Penapisan" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalTerduga" name="Terduga" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalTerkonfirmasi" name="Terkonfirmasi" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Panel>

      {/* AI Intelligence Modules (Layout Kiri-Kanan) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BoxAnalisisAI
          sudahLogin={sudahLogin}
          role={roleAI}
          konteks={granularitas === 'mingguan' ? 'tb-mingguan' : 'tb-bulanan'}
          periodeKey={periodeKeyTerakhir}
          wilayahKerja={undefined}
        />
        <BoxPrediksiAI
          sudahLogin={sudahLogin}
          role={roleAI}
          konteks={granularitas === 'mingguan' ? 'tb-mingguan' : 'tb-bulanan'}
          periodeKey={periodeKeyTerakhir}
          wilayahKerja={undefined}
        />
      </div>

      {/* Breakdown Faktor Risiko */}
      <Panel judul="Yield per Faktor Risiko (Target Skrining Aktif)">
        <p className="mb-3 text-center text-xs text-gray-500">
          Distribusi Pemeriksaan TBC pada kelompok risiko (diurutkan dari jumlah terbanyak). Arahkan kursor untuk melihat yield.
        </p>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart
            data={[...breakdownFaktorRisiko].sort((a, b) => b.totalDiskrining - a.totalDiskrining)}
            layout="vertical"
            margin={{ left: 120, right: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis
              type="category"
              dataKey="faktor"
              width={130}
              tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 500 }}
            />
            <Tooltip
              cursor={{ fill: '#F1F5F9' }}
              formatter={(value, name, item) => {
                if (name === 'Terkonfirmasi') {
                  const yieldPersen = (item?.payload as BreakdownFaktorRisikoTb | undefined)?.yieldPersen ?? 0;
                  return [`${value} (yield ${yieldPersen.toFixed(2)}%)`, 'Terkonfirmasi'];
                }
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
            <Bar
              dataKey="totalDiskrining"
              name="Penapisan"
              fill="#0EA5E9"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
            <Bar
              dataKey="totalTerkonfirmasi"
              name="Terkonfirmasi"
              fill="#E11D48"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Donut Jenis Kelamin */}
        <Panel judul="Distribusi berdasarkan Jenis Kelamin">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={donutJenisKelamin}
                dataKey="jumlah"
                nameKey="label"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                label
              >
                {donutJenisKelamin.map((_, i) => (
                  <Cell key={i} fill={WARNA_PIE[i % WARNA_PIE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        {/* Delay Diagnosis */}
        <Panel judul="Kecepatan Diagnosis (Delay)">
          <p className="text-center text-xs text-gray-500">
            Selisih hari dari tanggal Penapisan hingga keluar hasil laboratorium.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-teal-50 p-3">
              <div className="text-2xl font-bold text-teal-800">{delayDiagnosis.rataRataHari}</div>
              <div className="text-xs font-medium text-teal-600">Rata-rata (hari)</div>
            </div>
            <div className="rounded-lg bg-teal-50 p-3">
              <div className="text-2xl font-bold text-teal-800">{delayDiagnosis.medianHari}</div>
              <div className="text-xs font-medium text-teal-600">Median (hari)</div>
            </div>
            <div className="rounded-lg bg-teal-50 p-3">
              <div className="text-2xl font-bold text-teal-800">{delayDiagnosis.maksimalHari}</div>
              <div className="text-xs font-medium text-teal-600">Maksimal (hari)</div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-gray-400">
            Dihitung dari {delayDiagnosis.jumlahKasusDihitung} kasus yang sudah terbit hasil laboratorium.
          </p>
        </Panel>
      </div>

      {/* Distribusi per Kab/Kota */}
      <Panel judul="Distribusi per Kabupaten/Kota (Top 15)">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={distribusiKabKota} margin={{ bottom: 65 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="kabupatenKota"
              tick={{ fontSize: 10, fill: '#64748B' }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={70}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
            <Tooltip cursor={{ fill: '#F8FAFC' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="totalSkrining" name="Penapisan" fill="#0F4C5C" radius={[4, 4, 0, 0]} />
            <Bar dataKey="totalTerkonfirmasi" name="Terkonfirmasi" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Sekrining per Wilker */}
      <Panel judul=" Distribusi Hasil Penapisan per Wilayah Kerja">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={breakdownWilker}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="wilayahKerja" tick={{ fontSize: 10, fill: '#64748B' }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
            <Tooltip cursor={{ fill: '#F8FAFC' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="totalSkrining" name="Penapisan" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="totalTerduga" name="Terduga" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            <Bar dataKey="totalTerkonfirmasi" name="Terkonfirmasi" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Tabel Belum Tindak Lanjut */}
      <Panel judul={`Terduga TBC Belum Ada Hasil Pemeriksaan (${jumlahBelumTindakLanjut})`}>
        {!bolehLihatDaftarSensitif ? (
          <p className="py-6 text-center text-xs text-gray-400">
            Data individu (nama, lokasi, dll) disembunyikan — hanya dapat diakses oleh Petugas Klinik yang berwenang.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-205 text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-medium">
                  <th className="pb-2 pr-3">Nama</th>
                  <th className="pb-2 pr-3">Wilayah Kerja</th>
                  <th className="pb-2 pr-3">Tanggal Skrining</th>
                  <th className="pb-2 pr-3">Kab/Kota Asal</th>
                  <th className="pb-2 pr-3">Tindak Lanjut</th>
                  <th className="pb-2 pr-3">Fasyankes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {daftarBelumTindakLanjut.map((d) => (
                  <tr key={`${d.wilayahKerja}-${d.noBaris}`} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{d.namaPeserta}</td>
                    <td className="py-2.5 pr-3">{d.wilayahKerja}</td>
                    <td className="py-2.5 pr-3">{d.tanggalPelaksanaan}</td>
                    <td className="py-2.5 pr-3">{d.kabupatenKota}</td>
                    <td className="py-2.5 pr-3">{d.tindakLanjutPemeriksaan || '-'}</td>
                    <td className="py-2.5 pr-3">{d.fasyankesPemeriksaan || '-'}</td>
                  </tr>
                ))}
                {daftarBelumTindakLanjut.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      Semua terduga TBC sudah memiliki hasil pemeriksaan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function KartuRingkasan({
  label,
  nilai,
  warna = 'slate',
}: {
  label: string;
  nilai: string | number;
  warna?: 'teal' | 'indigo' | 'amber' | 'red' | 'slate';
}) {
  const SKEMA_WARNA: Record<string, { bg: string; border: string; label: string; nilai: string }> = {
    slate: { bg: 'bg-white', border: 'border-gray-200', label: 'text-gray-500', nilai: 'text-gray-900' },
    teal: { bg: 'bg-teal-50/60', border: 'border-teal-200', label: 'text-teal-700', nilai: 'text-teal-900' },
    indigo: { bg: 'bg-indigo-50/60', border: 'border-indigo-200', label: 'text-indigo-700', nilai: 'text-indigo-900' },
    amber: { bg: 'bg-amber-50/60', border: 'border-amber-200', label: 'text-amber-700', nilai: 'text-amber-900' },
    red: { bg: 'bg-rose-50/60', border: 'border-rose-200', label: 'text-rose-700', nilai: 'text-rose-900' },
  };
  const s = SKEMA_WARNA[warna];

  return (
    <div className={`rounded-xl border p-4 shadow-2xs ${s.bg} ${s.border}`}>
      <div className={`text-xs font-semibold ${s.label}`}>{label}</div>
      <div className={`mt-1 text-2xl font-bold tracking-tight ${s.nilai}`}>{nilai}</div>
    </div>
  );
}

// Komponen Panel diperbarui dengan text-center pada judul
function Panel({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-2xs">
      <h2 className="mb-2 text-center text-sm font-bold text-gray-900">{judul}</h2>
      {children}
    </div>
  );
}

function ToggleButton({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
        aktif ? 'bg-white text-teal-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  opsi,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opsi: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-teal-600 focus:outline-hidden"
      >
        {opsi.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}