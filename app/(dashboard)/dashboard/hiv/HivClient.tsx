'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import type { RingkasanHiv } from '@/lib/turso/hiv';
import { KATEGORI_HASIL, KATEGORI_HUBUNGAN_BERISIKO, formatPeriodeBulanan } from '@/lib/turso/hiv';

const WARNA_DONUT = ['#0d9488', '#f59e0b', '#3b82f6', '#dc2626', '#6366f1', '#64748b', '#be185d'];
const PALET_WILAYAH = ['#0d9488', '#dc2626', '#f59e0b', '#6366f1', '#0f766e', '#64748b', '#be185d'];

interface Distribusi { label: string; jumlah: number }
type BarisWilayah = Record<string, number | string>;

interface Props {
  role: string;
  daftarWilayah: string[];
  tahunBerjalan: number;
  wilayahParam?: string;
  ringkasan: RingkasanHiv;
  trenMingguan: { periode: string; jumlah: number }[];
  trenBulanan: { periode: string; jumlah: number }[];
  donutJenisKelamin: Distribusi[];
  donutUsia: Distribusi[];
  donutStatusPerkawinan: Distribusi[];
  donutKunjungan: Distribusi[];
  donutHasil: Distribusi[];
  donutHubunganBerisiko: Distribusi[];
  barJenisReagen: Distribusi[];
  trenMingguanHasilPerWilayah: BarisWilayah[];
  trenMingguanHubunganBerisikoPerWilayah: BarisWilayah[];
  trenBulananHasilPerWilayah: BarisWilayah[];
  trenBulananHubunganBerisikoPerWilayah: BarisWilayah[];
  diperiksaReaktifMingguan: { periode: string; Diperiksa: number; Reaktif: number }[];
  diperiksaReaktifBulanan: { periode: string; Diperiksa: number; Reaktif: number }[];
}

function KartuRingkasan({ ringkasan }: { ringkasan: RingkasanHiv }) {
  const kartu = [
    { label: 'Total Pemeriksaan', nilai: ringkasan.totalPemeriksaan, warna: 'bg-teal-600' },
    { label: 'Reaktif', nilai: ringkasan.jumlahReaktif, warna: 'bg-red-600' },
    { label: 'Non Reaktif', nilai: ringkasan.jumlahNonReaktif, warna: 'bg-emerald-600' },
    { label: '% Reaktif', nilai: `${ringkasan.persenReaktif}%`, warna: 'bg-orange-500' },
    { label: 'Kunjungan Baru', nilai: ringkasan.kunjunganBaru, warna: 'bg-indigo-600' },
    { label: 'Hubungan Berisiko (Ya)', nilai: ringkasan.hubunganBerisikoYa, warna: 'bg-pink-600' }
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
            <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => formatPeriode(String(v))} />
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
            <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => formatPeriode(String(v))} />
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
            <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => formatPeriode(String(v))} />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={(label) => formatPeriode(String(label))} />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            <Line type="monotone" dataKey="Diperiksa" name="Diperiksa" stroke="#0f4c5c" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="Reaktif" name="Reaktif" stroke="#be185d" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => formatPeriode(String(v))} />
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
  const { daftarWilayah, wilayahParam, trenMingguan, trenBulanan } = props;

  // Rentang Bersama untuk Grafik Mingguan
  const [rentangMingguan, setRentangMingguan] = useState<[number, number]>([0, Math.max(trenMingguan.length - 1, 0)]);
  const dataMingguanTerpotong = useMemo(() => trenMingguan.slice(rentangMingguan[0], rentangMingguan[1] + 1), [trenMingguan, rentangMingguan]);
  const trenMingguanHasilPerWilayahTerpotong = useMemo(() => props.trenMingguanHasilPerWilayah.slice(rentangMingguan[0], rentangMingguan[1] + 1), [props.trenMingguanHasilPerWilayah, rentangMingguan]);
  const trenMingguanHubunganBerisikoPerWilayahTerpotong = useMemo(() => props.trenMingguanHubunganBerisikoPerWilayah.slice(rentangMingguan[0], rentangMingguan[1] + 1), [props.trenMingguanHubunganBerisikoPerWilayah, rentangMingguan]);
  const diperiksaReaktifMingguanTerpotong = useMemo(() => props.diperiksaReaktifMingguan.slice(rentangMingguan[0], rentangMingguan[1] + 1), [props.diperiksaReaktifMingguan, rentangMingguan]);

  // Rentang Bersama untuk Grafik Bulanan
  const [rentangBulanan, setRentangBulanan] = useState<[number, number]>([0, Math.max(trenBulanan.length - 1, 0)]);
  const dataBulananTerpotong = useMemo(() => trenBulanan.slice(rentangBulanan[0], rentangBulanan[1] + 1), [trenBulanan, rentangBulanan]);
  const trenBulananHasilPerWilayahTerpotong = useMemo(() => props.trenBulananHasilPerWilayah.slice(rentangBulanan[0], rentangBulanan[1] + 1), [props.trenBulananHasilPerWilayah, rentangBulanan]);
  const trenBulananHubunganBerisikoPerWilayahTerpotong = useMemo(() => props.trenBulananHubunganBerisikoPerWilayah.slice(rentangBulanan[0], rentangBulanan[1] + 1), [props.trenBulananHubunganBerisikoPerWilayah, rentangBulanan]);
  const diperiksaReaktifBulananTerpotong = useMemo(() => props.diperiksaReaktifBulanan.slice(rentangBulanan[0], rentangBulanan[1] + 1), [props.diperiksaReaktifBulanan, rentangBulanan]);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-8">
      <div className="flex flex-wrap gap-3 items-center">
        <h1 className="text-xl font-bold text-teal-900">Surveilans HIV</h1>
        <select
          value={wilayahParam || ''}
          onChange={e => {
            const url = new URL(window.location.href);
            e.target.value ? url.searchParams.set('wilayah', e.target.value) : url.searchParams.delete('wilayah');
            window.location.href = url.toString();
          }}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Semua Wilayah Kerja</option>
          {daftarWilayah.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
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

      {/* --- BAGIAN GRAFIK MINGGUAN --- */}
      <div className="space-y-4 border-t pt-6">
        {/* Judul di kiri (text-left), rentang periode di kanan (justify-between) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-teal-50 p-4 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-teal-900 text-left">Analisis Tren Mingguan</h2>
          {trenMingguan.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600 font-medium">Rentang Periode:</span>
              <select
                value={rentangMingguan[0]}
                onChange={e => setRentangMingguan([Number(e.target.value), rentangMingguan[1]])}
                className="border rounded px-2 py-1 bg-white"
              >
                {trenMingguan.map((d, i) => <option key={i} value={i}>{d.periode}</option>)}
              </select>
              <span className="text-slate-500">s.d.</span>
              <select
                value={rentangMingguan[1]}
                onChange={e => setRentangMingguan([rentangMingguan[0], Number(e.target.value)])}
                className="border rounded px-2 py-1 bg-white"
              >
                {trenMingguan.map((d, i) => <option key={i} value={i}>{d.periode}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold text-teal-800 mb-2 text-center">Tren Mingguan Seluruh Hasil Pemeriksaan</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dataMingguanTerpotong}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Line type="monotone" dataKey="jumlah" name="Jumlah Pemeriksaan" stroke="#0d9488" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <TrenPerWilayahChart
            judul="Tren Mingguan Hasil Pemeriksaan per Wilayah Kerja"
            data={trenMingguanHasilPerWilayahTerpotong}
            daftarWilayah={daftarWilayah}
            kategoriList={KATEGORI_HASIL}
            tipeChart="line"
          />

          <TrenPerWilayahChart
            judul="Tren Mingguan Hubungan Berisiko per Wilayah Kerja"
            data={trenMingguanHubunganBerisikoPerWilayahTerpotong}
            daftarWilayah={daftarWilayah}
            kategoriList={KATEGORI_HUBUNGAN_BERISIKO}
            tipeChart="line"
          />

          <TrenDuaSeriChart
            judul="Diperiksa vs Reaktif — Mingguan"
            data={diperiksaReaktifMingguanTerpotong}
            tipeChart="line"
          />
        </div>
      </div>

      {/* --- BAGIAN GRAFIK BULANAN --- */}
      <div className="space-y-4 border-t pt-6">
        {/* Judul di kiri (text-left), rentang periode di kanan (justify-between) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-teal-50 p-4 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-teal-900 text-left">Analisis Tren Bulanan</h2>
          {trenBulanan.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600 font-medium">Rentang Periode:</span>
              <select
                value={rentangBulanan[0]}
                onChange={e => setRentangBulanan([Number(e.target.value), rentangBulanan[1]])}
                className="border rounded px-2 py-1 bg-white"
              >
                {trenBulanan.map((d, i) => <option key={i} value={i}>{formatPeriodeBulanan(d.periode)}</option>)}
              </select>
              <span className="text-slate-500">s.d.</span>
              <select
                value={rentangBulanan[1]}
                onChange={e => setRentangBulanan([rentangBulanan[0], Number(e.target.value)])}
                className="border rounded px-2 py-1 bg-white"
              >
                {trenBulanan.map((d, i) => <option key={i} value={i}>{formatPeriodeBulanan(d.periode)}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold text-teal-800 mb-2 text-center">Distribusi Seluruh Hasil Pemeriksaan</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataBulananTerpotong}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periode" tick={{ fontSize: 11 }} tickFormatter={(v) => formatPeriodeBulanan(String(v))} />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(label) => formatPeriodeBulanan(String(label))} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="jumlah" name="Jumlah Pemeriksaan" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <TrenPerWilayahChart
            judul="Hasil Pemeriksaan per Wilayah Kerja"
            data={trenBulananHasilPerWilayahTerpotong}
            daftarWilayah={daftarWilayah}
            kategoriList={KATEGORI_HASIL}
            tipeChart="bar"
            formatPeriode={formatPeriodeBulanan}
          />

          <TrenPerWilayahChart
            judul="Hubungan Berisiko per Wilayah Kerja"
            data={trenBulananHubunganBerisikoPerWilayahTerpotong}
            daftarWilayah={daftarWilayah}
            kategoriList={KATEGORI_HUBUNGAN_BERISIKO}
            tipeChart="bar"
            formatPeriode={formatPeriodeBulanan}
          />

          <TrenDuaSeriChart
            judul="Diperiksa vs Reaktif — Bulanan"
            data={diperiksaReaktifBulananTerpotong}
            tipeChart="bar"
            formatPeriode={formatPeriodeBulanan}
          />
        </div>
      </div>
    </div>
  );
}