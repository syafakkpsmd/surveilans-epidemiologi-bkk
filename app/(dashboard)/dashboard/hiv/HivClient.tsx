'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import type { RingkasanHiv } from '@/lib/db/modul/hiv';
import { KATEGORI_HASIL, KATEGORI_HUBUNGAN_BERISIKO, formatPeriodeBulanan } from '@/lib/db/modul/hivKonstanta';
import FilterTahun from '@/components/FilterTahun';

const NAMA_BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const labelMinggu = (p: string) => p.replace(/.*-W/, 'Mg ');
const labelBulanPendek = (p: string) => NAMA_BULAN_PENDEK[Number(p.split('-')[1]) - 1] ?? p;

const WARNA_DONUT = ['#0d9488', '#f59e0b', '#3b82f6', '#dc2626', '#6366f1', '#64748b', '#be185d'];
const PALET_WILAYAH = ['#0d9488', '#dc2626', '#f59e0b', '#6366f1', '#0f766e', '#64748b', '#be185d'];

interface Distribusi { label: string; jumlah: number }
type BarisWilayah = Record<string, number | string>;

type Granularitas = 'mingguan' | 'bulanan';

interface Props {
  role: string;
  daftarWilayah: string[];
  wilayahGrafik: string[];
  tahunBerjalan: number;
  wilayahTerpilih: string;
  granularitas: Granularitas;
  mingguMulaiTerpasang: string;
  mingguAkhirTerpasang: string;
  bulanMulaiTerpasang: string;
  bulanAkhirTerpasang: string;
  ringkasan: RingkasanHiv;
  donutJenisKelamin: Distribusi[];
  donutUsia: Distribusi[];
  donutStatusPerkawinan: Distribusi[];
  donutKunjungan: Distribusi[];
  donutHasil: Distribusi[];
  donutHubunganBerisiko: Distribusi[];
  barJenisReagen: Distribusi[];
  trenTotal: { periode: string; jumlah: number }[];
  trenHasilPerWilayah: BarisWilayah[];
  trenHubunganPerWilayah: BarisWilayah[];
  diperiksaReaktif: { periode: string; Diperiksa: number; Reaktif: number }[];
}

function ToggleButton({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
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

function FieldSelect({ label, value, onChange, opsi }: {
  label: string; value: string; onChange: (v: string) => void; opsi: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 shadow-2xs focus:border-teal-600 focus:outline-hidden"
      >
        {opsi.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function KartuRingkasan({ ringkasan }: { ringkasan: RingkasanHiv }) {
  const kartu = [
    { label: 'Total Pemeriksaan', nilai: ringkasan.totalPemeriksaan, warna: 'bg-teal-600' },
    { label: 'Reaktif', nilai: ringkasan.jumlahReaktif, warna: 'bg-red-600' },
    { label: 'Non Reaktif', nilai: ringkasan.jumlahNonReaktif, warna: 'bg-emerald-600' },
    { label: '% Reaktif', nilai: `${ringkasan.persenReaktif}%`, warna: 'bg-orange-500' },
    { label: 'Kunjungan Baru', nilai: ringkasan.kunjunganBaru, warna: 'bg-indigo-600' },
    { label: 'Hubungan Berisiko', nilai: ringkasan.hubunganBerisikoYa, warna: 'bg-pink-600' }
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kartu.map(k => (
        <div key={k.label} className={`${k.warna} text-white rounded-xl p-4 shadow`}>
          <div className="text-xs opacity-90">{k.label}</div>
          <div className="text-2xl font-bold mt-1">{k.nilai}</div>
        </div>
      ))}
    </div>
  );
}

function Donut({ data, judul }: { data: Distribusi[]; judul: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-teal-800 mb-2 text-center">{judul}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="jumlah" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={WARNA_DONUT[i % WARNA_DONUT.length]} />)}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarHorizontalReagen({ data }: { data: Distribusi[] }) {
  // Salin data lalu urutkan dari jumlah terbanyak ke terkecil
  const dataUrut = [...data].sort((a, b) => b.jumlah - a.jumlah);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-teal-800 mb-2 text-center">Jenis Reagen</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, dataUrut.length * 55)}>
        <BarChart data={dataUrut} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="jumlah" fill="#0d9488" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrenPerWilayahChart({
  judul, data, daftarWilayah, kategoriList, tipeChart, formatPeriode = (p: string) => p
}: {
  judul: string;
  data: BarisWilayah[];
  daftarWilayah: string[];
  kategoriList: readonly string[];
  tipeChart: 'line' | 'bar';
  formatPeriode?: (periode: string) => string;
}) {
  const [wilayahAktif, setWilayahAktif] = useState<string[]>(daftarWilayah);

  const toggleWilayah = (w: string) =>
    setWilayahAktif(prev => (prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]));

  const seriesAktif = daftarWilayah
    .filter(w => wilayahAktif.includes(w))
    .flatMap((w, i) =>
      kategoriList.map((kategori, k) => ({
        key: `${w}__${kategori}`,
        nama: w,
        warna: PALET_WILAYAH[i % PALET_WILAYAH.length],
        dash: k === 0 ? undefined : '6 4',
        opacity: k === 0 ? 1 : 0.45,
        legendType: (k === 0 ? undefined : 'none') as 'none' | undefined
      }))
    );

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-teal-800 mb-1 text-center">{judul}</h3>
      <p className="text-xs text-slate-500 mb-3 text-center">
        {tipeChart === 'line'
          ? `Garis solid = ${kategoriList[0]}, garis putus-putus = ${kategoriList[1]}`
          : `Warna pekat = ${kategoriList[0]}, warna pudar = ${kategoriList[1]}`}
      </p>

      <ResponsiveContainer width="100%" height={320}>
        {tipeChart === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => (formatPeriode === formatPeriodeBulanan ? labelBulanPendek(String(v)) : formatPeriode(String(v)))} />
            <YAxis allowDecimals={false} />
            <Tooltip
              labelFormatter={(label) => formatPeriode(String(label))}
              formatter={(value, _name, entry) => [value ?? 0, String(entry.dataKey).replace('__', ' - ')]}
            />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            {seriesAktif.map(s => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.nama}
                legendType={s.legendType}
                stroke={s.warna}
                strokeWidth={2}
                strokeDasharray={s.dash}
                connectNulls
                dot={{ r: 2 }}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => (formatPeriode === formatPeriodeBulanan ? labelBulanPendek(String(v)) : formatPeriode(String(v)))} />
            <YAxis allowDecimals={false} />
            <Tooltip
              labelFormatter={(label) => formatPeriode(String(label))}
              formatter={(value, _name, entry) => [value ?? 0, String(entry.dataKey).replace('__', ' - ')]}
            />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            {seriesAktif.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.nama} legendType={s.legendType} fill={s.warna} fillOpacity={s.opacity} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>

      {/* Filter Checkbox Wilayah di Bawah Grafik */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-3 border-t text-sm">
        <span className="text-slate-500 font-medium">Filter Wilayah:</span>
        <div className="flex flex-wrap justify-center gap-3">
          {daftarWilayah.map(w => (
            <label key={w} className="flex items-center gap-1 cursor-pointer text-sm">
              <input type="checkbox" checked={wilayahAktif.includes(w)} onChange={() => toggleWilayah(w)} />
              <span>{w}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrenDuaSeriChart({
  judul, data, tipeChart, formatPeriode = (p: string) => p
}: {
  judul: string;
  data: { periode: string; Diperiksa: number; Reaktif: number }[];
  tipeChart: 'line' | 'bar';
  formatPeriode?: (periode: string) => string;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-teal-800 mb-3 text-center">{judul}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {tipeChart === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => (formatPeriode === formatPeriodeBulanan ? labelBulanPendek(String(v)) : formatPeriode(String(v)))} />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={(label) => formatPeriode(String(label))} />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            <Line type="monotone" dataKey="Diperiksa" name="Diperiksa" stroke="#0f4c5c" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="Reaktif" name="Reaktif" stroke="#be185d" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => (formatPeriode === formatPeriodeBulanan ? labelBulanPendek(String(v)) : formatPeriode(String(v)))} />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={(label) => formatPeriode(String(label))} />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            <Bar dataKey="Diperiksa" name="Diperiksa" fill="#0f4c5c" />
            <Bar dataKey="Reaktif" name="Reaktif" fill="#be185d" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function HivClient(props: Props) {
  const {
    daftarWilayah, wilayahGrafik, tahunBerjalan, wilayahTerpilih, granularitas,
    mingguMulaiTerpasang, mingguAkhirTerpasang, bulanMulaiTerpasang, bulanAkhirTerpasang,
  } = props;
  const router = useRouter();

  const [tempWilayah, setTempWilayah] = useState(wilayahTerpilih);
  const [tempMingguMulai, setTempMingguMulai] = useState(mingguMulaiTerpasang);
  const [tempMingguAkhir, setTempMingguAkhir] = useState(mingguAkhirTerpasang);
  const [tempBulanMulai, setTempBulanMulai] = useState(bulanMulaiTerpasang);
  const [tempBulanAkhir, setTempBulanAkhir] = useState(bulanAkhirTerpasang);

  useEffect(() => {
    setTempWilayah(wilayahTerpilih);
    setTempMingguMulai(mingguMulaiTerpasang);
    setTempMingguAkhir(mingguAkhirTerpasang);
    setTempBulanMulai(bulanMulaiTerpasang);
    setTempBulanAkhir(bulanAkhirTerpasang);
  }, [wilayahTerpilih, mingguMulaiTerpasang, mingguAkhirTerpasang, bulanMulaiTerpasang, bulanAkhirTerpasang]);

  function bangunUrl(o: { wilayah: string; gran: Granularitas; mm: string; ma: string; bm: string; ba: string }) {
    const p = new URLSearchParams();
    p.set('tahun', String(tahunBerjalan));
    p.set('wilayah', o.wilayah);
    p.set('granularitas', o.gran);
    if (o.mm) p.set('minggu_mulai', o.mm);
    if (o.ma) p.set('minggu_akhir', o.ma);
    if (o.bm) p.set('bulan_mulai', o.bm);
    if (o.ba) p.set('bulan_akhir', o.ba);
    return `/dashboard/hiv?${p.toString()}`;
  }

  function gantiGranularitas(g: Granularitas) {
    router.push(bangunUrl({
      wilayah: wilayahTerpilih, gran: g,
      mm: mingguMulaiTerpasang, ma: mingguAkhirTerpasang, bm: bulanMulaiTerpasang, ba: bulanAkhirTerpasang,
    }));
  }

  function terapkanFilter() {
    const [mm, ma] = tempMingguMulai && tempMingguAkhir && tempMingguMulai > tempMingguAkhir
      ? [tempMingguAkhir, tempMingguMulai] : [tempMingguMulai, tempMingguAkhir];
    const [bm, ba] = tempBulanMulai && tempBulanAkhir && tempBulanMulai > tempBulanAkhir
      ? [tempBulanAkhir, tempBulanMulai] : [tempBulanMulai, tempBulanAkhir];
    router.push(bangunUrl({ wilayah: tempWilayah, gran: granularitas, mm, ma, bm, ba }));
  }

  const opsiWilayah = [{ value: 'semua', label: 'Semua Wilayah Kerja' }, ...daftarWilayah.map(w => ({ value: w, label: w }))];
  const opsiMinggu = [
    { value: '', label: '(Semua minggu)' },
    ...Array.from({ length: 53 }, (_, i) => ({
      value: `${tahunBerjalan}-W${String(i + 1).padStart(2, '0')}`,
      label: `Minggu ${i + 1} (${tahunBerjalan})`,
    })),
  ];
  const opsiBulan = [
    { value: '', label: '(Semua bulan)' },
    ...Array.from({ length: 12 }, (_, i) => {
      const periode = `${tahunBerjalan}-${String(i + 1).padStart(2, '0')}`;
      return { value: periode, label: formatPeriodeBulanan(periode) };
    }),
  ];

  const mingguan = granularitas === 'mingguan';
  const adaRentangAktif = mingguan
    ? Boolean(mingguMulaiTerpasang || mingguAkhirTerpasang)
    : Boolean(bulanMulaiTerpasang || bulanAkhirTerpasang);
  const formatPeriode = mingguan ? labelMinggu : formatPeriodeBulanan;
  const tipeChart: 'line' | 'bar' = mingguan ? 'line' : 'bar';
  const sumbuX = mingguan ? labelMinggu : labelBulanPendek;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-8">
      {/* HEADER & FILTER */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold text-teal-900">Surveilans HIV ({tahunBerjalan})</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {wilayahTerpilih === 'semua' ? 'Semua wilayah kerja' : `Wilayah kerja: ${wilayahTerpilih}`}
            {adaRentangAktif && ' — rentang tampilan aktif (berlaku untuk seluruh isi halaman)'}
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-end gap-2.5">
          <div className="pb-1.5"><FilterTahun maju={0} /></div>

          <FieldSelect label="Wilayah Kerja" value={tempWilayah} onChange={setTempWilayah} opsi={opsiWilayah} />

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Tampilan</span>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              <ToggleButton aktif={mingguan} onClick={() => gantiGranularitas('mingguan')}>Mingguan</ToggleButton>
              <ToggleButton aktif={!mingguan} onClick={() => gantiGranularitas('bulanan')}>Bulanan</ToggleButton>
            </div>
          </div>

          {mingguan ? (
            <>
              <FieldSelect label="Dari minggu" value={tempMingguMulai} onChange={setTempMingguMulai} opsi={opsiMinggu} />
              <FieldSelect label="Sampai minggu" value={tempMingguAkhir} onChange={setTempMingguAkhir} opsi={opsiMinggu} />
            </>
          ) : (
            <>
              <FieldSelect label="Dari bulan" value={tempBulanMulai} onChange={setTempBulanMulai} opsi={opsiBulan} />
              <FieldSelect label="Sampai bulan" value={tempBulanAkhir} onChange={setTempBulanAkhir} opsi={opsiBulan} />
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

      <KartuRingkasan ringkasan={props.ringkasan} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Donut data={props.donutJenisKelamin} judul="Jenis Kelamin" />
        <Donut data={props.donutUsia} judul="Usia" />
        <Donut data={props.donutStatusPerkawinan} judul="Status Perkawinan" />
        <Donut data={props.donutKunjungan} judul="Kunjungan" />
        <Donut data={props.donutHasil} judul="Hasil Pemeriksaan" />
        <Donut data={props.donutHubunganBerisiko} judul="Hubungan Berisiko" />
      </div>

      <BarHorizontalReagen data={props.barJenisReagen} />

      {/* GRAFIK: hanya mode yang dipilih (mingguan = garis, bulanan = batang) */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-teal-50 p-4 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-teal-900 text-left">
            {mingguan ? 'Distribusi Tren Mingguan' : 'Distribusi Bulanan'}
          </h2>
          <span className="text-sm text-slate-600">
            {mingguan
              ? (mingguMulaiTerpasang || mingguAkhirTerpasang
                  ? `Minggu ${Number(mingguMulaiTerpasang.slice(-2) || 1)} s.d. ${Number(mingguAkhirTerpasang.slice(-2) || 53)}`
                  : 'Seluruh minggu')
              : (bulanMulaiTerpasang || bulanAkhirTerpasang
                  ? `${formatPeriodeBulanan(bulanMulaiTerpasang || `${tahunBerjalan}-01`)} s.d. ${formatPeriodeBulanan(bulanAkhirTerpasang || `${tahunBerjalan}-12`)}`
                  : 'Seluruh bulan')}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold text-teal-800 mb-2 text-center">
              {mingguan ? 'Tren Mingguan Seluruh Hasil Pemeriksaan' : 'Distribusi Seluruh Hasil Pemeriksaan'}
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              {mingguan ? (
                <LineChart data={props.trenTotal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => sumbuX(String(v))} />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(l) => formatPeriode(String(l))} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Line type="monotone" dataKey="jumlah" name="Jumlah Pemeriksaan" stroke="#0d9488" strokeWidth={2} />
                </LineChart>
              ) : (
                <BarChart data={props.trenTotal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => sumbuX(String(v))} />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(l) => formatPeriode(String(l))} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="jumlah" name="Jumlah Pemeriksaan" fill="#0f766e" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <TrenPerWilayahChart
            key={`hasil-${granularitas}-${wilayahGrafik.join('|')}`}
            judul={mingguan ? 'Tren Mingguan Hasil Pemeriksaan per Wilayah Kerja' : 'Hasil Pemeriksaan per Wilayah Kerja'}
            data={props.trenHasilPerWilayah}
            daftarWilayah={wilayahGrafik}
            kategoriList={KATEGORI_HASIL}
            tipeChart={tipeChart}
            formatPeriode={formatPeriode}
          />

          <TrenPerWilayahChart
            key={`hub-${granularitas}-${wilayahGrafik.join('|')}`}
            judul={mingguan ? 'Tren Mingguan Hubungan Berisiko per Wilayah Kerja' : 'Hubungan Berisiko per Wilayah Kerja'}
            data={props.trenHubunganPerWilayah}
            daftarWilayah={wilayahGrafik}
            kategoriList={KATEGORI_HUBUNGAN_BERISIKO}
            tipeChart={tipeChart}
            formatPeriode={formatPeriode}
          />

          <TrenDuaSeriChart
            judul={mingguan ? 'Diperiksa vs Reaktif — Mingguan' : 'Diperiksa vs Reaktif — Bulanan'}
            data={props.diperiksaReaktif}
            tipeChart={tipeChart}
            formatPeriode={formatPeriode}
          />
        </div>
      </div>
    </div>
  );
}
