'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export interface HasilPengamatanItem {
  label?: string;
  bulanLabel?: string;
  memenuhi: number;
  tidakMemenuhi: number;
}

interface GrafikHasilPengamatanProps {
  data: HasilPengamatanItem[];
  isMingguan?: boolean;
  isBulanan?: boolean;
}

export function GrafikHasilPengamatanWilker({
  data = [],
  isBulanan = false,
}: GrafikHasilPengamatanProps) {
  // Jika data kosong, tampilkan pesan fallback
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[220px] w-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">
        Data pengamatan tidak tersedia
      </div>
    );
  }

  // Tampilan Mode Bulanan (Bar Chart)
  if (isBulanan) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey={(item) => item.label || item.bulanLabel || ''}
            tick={{ fontSize: 11, fill: '#4B5563' }}
          />
          <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Bar
            dataKey="memenuhi"
            name="Memenuhi Syarat"
            fill="#10B981"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="tidakMemenuhi"
            name="Tidak Memenuhi Syarat"
            fill="#EF4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Tampilan Default Mode Mingguan (Line Chart)
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis
          dataKey={(item) => item.label || ''}
          tick={{ fontSize: 11, fill: '#4B5563' }}
        />
        <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        />
        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        <Line
          type="monotone"
          dataKey="memenuhi"
          name="Memenuhi Syarat"
          stroke="#10B981"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="tidakMemenuhi"
          name="Tidak Memenuhi Syarat"
          stroke="#EF4444"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}