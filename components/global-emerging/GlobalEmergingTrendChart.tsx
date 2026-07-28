'use client';

// components/global-emerging/GlobalEmergingTrendChart.tsx
// Client Component: grafik tren total kasus & total kematian per periode.
// Pakai recharts (sudah dipakai di modul COP/PHQC, konsisten).

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RingkasanPenyakitEmerging, JenisPeriode } from '@/types/global-emerging.types';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];


interface GlobalEmergingTrendChartProps {
  data: RingkasanPenyakitEmerging[];
  jenis: JenisPeriode;
}

export default function GlobalEmergingTrendChart({ data, jenis }: GlobalEmergingTrendChartProps) {
  // Gabungkan (sum) semua baris per periode, karena data mentah dari
  // view sudah dipecah per penyakit+negara — untuk grafik tren total,
  // kita agregasi lagi di sisi client per periode.
  const labelPeriode = (row: RingkasanPenyakitEmerging) =>
    jenis === 'mingguan'
      ? `M${row.minggu_epid}`
      : NAMA_BULAN[(row.bulan ?? 1) - 1] ?? `Bln ${row.bulan}`;

  const perPeriode = new Map<string, { periode: string; total_kasus: number; total_kematian: number }>();

  for (const row of data) {
    const key = labelPeriode(row);
    const existing = perPeriode.get(key);
    if (existing) {
      existing.total_kasus += row.total_kasus;
      existing.total_kematian += row.total_kematian;
    } else {
      perPeriode.set(key, {
        periode: key,
        total_kasus: row.total_kasus,
        total_kematian: row.total_kematian,
      });
    }
  }

  const dataGrafik = Array.from(perPeriode.values());

  if (dataGrafik.length === 0) {
    return (
      <div className="rounded-[10px] bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Belum ada data untuk filter yang dipilih.
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-center text-sm font-semibold text-[#0F2A38]">
        Distribusi Kasus & Kematian {jenis === 'mingguan' ? 'per Minggu Epidemiologi' : 'per Bulan'}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        {jenis === 'bulanan' ? (
          <BarChart data={dataGrafik}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" />
            <XAxis dataKey="periode" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_kasus" name="Total Kasus" fill="#0F4C5C" radius={[4, 4, 0, 0]} />
            <Bar dataKey="total_kematian" name="Total Kematian" fill="#D62839" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={dataGrafik}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" />
            <XAxis dataKey="periode" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="total_kasus"
              name="Total Kasus"
              stroke="#0F4C5C"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="total_kematian"
              name="Total Kematian"
              stroke="#D62839"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
