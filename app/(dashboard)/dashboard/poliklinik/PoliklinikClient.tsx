// app/(dashboard)/dashboard/poliklinik/PoliklinikClient.tsx
'use client';

import { useState } from 'react';
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
  ResponsiveContainer,
} from 'recharts';

const WARNA_HARI = ['#0d9488', '#0f766e', '#0d9488', '#0f766e', '#0d9488', '#f59e0b', '#dc2626'];
// Senin..Jumat teal, Sabtu oranye, Minggu merah -- menonjolkan akhir pekan

const WARNA_DONUT = ['#0d9488', '#f59e0b', '#134e4a', '#dc2626', '#94a3b8'];

interface Props {
  tahunBerjalan: number;
  wilayahTerpilih: string;
  daftarWilker: readonly string[];
  ringkasan: {
    totalKunjungan: number;
    jumlahDiagnosaUnik: number;
    wilkerTerbanyak: string | null;
    rataRataPerHari: number;
  };
  trenMingguan: { periode: string; totalKunjungan: number }[];
  trenBulanan: { periode: string; totalKunjungan: number }[];
  topDiagnosa: { diagnosa: string; jumlah: number }[];
  donutJenisKelamin: { label: string; jumlah: number }[];
  donutKelompokUsia: { label: string; jumlah: number }[];
  breakdownWilker: { wilayahKerja: string; jumlah: number }[];
  polaHari: { hari: string; jumlah: number }[];
}

export default function PoliklinikClient({
  tahunBerjalan,
  wilayahTerpilih,
  daftarWilker,
  ringkasan,
  trenMingguan,
  trenBulanan,
  topDiagnosa,
  donutJenisKelamin,
  donutKelompokUsia,
  breakdownWilker,
  polaHari,
}: Props) {
  const router = useRouter();
  const [granularitas, setGranularitas] = useState<'mingguan' | 'bulanan'>('mingguan');
  const dataTren = granularitas === 'mingguan' ? trenMingguan : trenBulanan;

  function gantiFilter(tahun: number, wilayah: string) {
    router.push(`/dashboard/poliklinik?tahun=${tahun}&wilayah=${encodeURIComponent(wilayah)}`);
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header + filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-teal-900">Kunjungan Poliklinik</h1>
          <p className="text-sm text-gray-500">Rekap kunjungan pasien di 5 wilayah kerja BKK Samarinda</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={tahunBerjalan}
            onChange={(e) => gantiFilter(parseInt(e.target.value, 10), wilayahTerpilih)}
            className="rounded border px-3 py-1.5 text-sm"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const th = new Date().getFullYear() - i;
              return (
                <option key={th} value={th}>
                  {th}
                </option>
              );
            })}
          </select>
          <select
            value={wilayahTerpilih}
            onChange={(e) => gantiFilter(tahunBerjalan, e.target.value)}
            className="rounded border px-3 py-1.5 text-sm"
          >
            <option value="semua">Semua Wilayah Kerja</option>
            {daftarWilker.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KartuKpi label="Total Kunjungan" nilai={ringkasan.totalKunjungan.toLocaleString('id-ID')} warna="teal" />
        <KartuKpi label="Diagnosa Unik Tercatat" nilai={ringkasan.jumlahDiagnosaUnik.toLocaleString('id-ID')} />
        <KartuKpi label="Wilker Terbanyak" nilai={ringkasan.wilkerTerbanyak ?? '-'} />
        <KartuKpi label="Rata-rata / Hari Aktif" nilai={ringkasan.rataRataPerHari} />
      </div>

      {/* Tren */}
      <Panel judul={`Tren Kunjungan ${granularitas === 'mingguan' ? 'Mingguan' : 'Bulanan'}`}>
        <div className="mb-2 flex gap-2">
          <ToggleButton aktif={granularitas === 'mingguan'} onClick={() => setGranularitas('mingguan')}>
            Mingguan
          </ToggleButton>
          <ToggleButton aktif={granularitas === 'bulanan'} onClick={() => setGranularitas('bulanan')}>
            Bulanan
          </ToggleButton>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dataTren}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="totalKunjungan" name="Kunjungan" stroke="#0d9488" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top diagnosa */}
        <Panel judul="10 Diagnosa Terbanyak">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={topDiagnosa} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="diagnosa" width={160} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="jumlah" fill="#134e4a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Pola hari kunjungan */}
        <Panel judul="Pola Hari Kunjungan">
          <p className="mb-2 text-sm text-gray-600">
            Membantu perencanaan jadwal piket poliklinik — hari mana yang paling ramai.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={polaHari}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hari" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                {polaHari.map((_, i) => (
                  <Cell key={i} fill={WARNA_HARI[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Donut jenis kelamin */}
        <Panel judul="Jenis Kelamin">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={donutJenisKelamin} dataKey="jumlah" nameKey="label" innerRadius={45} outerRadius={75} label>
                {donutJenisKelamin.map((_, i) => (
                  <Cell key={i} fill={WARNA_DONUT[i % WARNA_DONUT.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        {/* Donut kelompok usia */}
        <Panel judul="Kelompok Usia">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={donutKelompokUsia} dataKey="jumlah" nameKey="label" innerRadius={45} outerRadius={75} label>
                {donutKelompokUsia.map((_, i) => (
                  <Cell key={i} fill={WARNA_DONUT[i % WARNA_DONUT.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        {/* Breakdown per wilker */}
        <Panel judul="Kunjungan per Wilayah Kerja">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={breakdownWilker}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="wilayahKerja" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="jumlah" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

function KartuKpi({ label, nilai, warna }: { label: string; nilai: string | number; warna?: 'teal' }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${warna === 'teal' ? 'text-teal-700' : 'text-gray-900'}`}>
        {nilai}
      </div>
    </div>
  );
}

function Panel({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-medium text-teal-900">{judul}</h2>
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
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm ${aktif ? 'bg-teal-700 text-white' : 'bg-gray-100'}`}
    >
      {children}
    </button>
  );
}