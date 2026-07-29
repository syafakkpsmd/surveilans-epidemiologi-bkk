'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { TrendItem, PeriodeType } from '@/lib/analytics/get-stats';

interface Props {
  data: {
    harian: TrendItem[];
    mingguan: TrendItem[];
    bulanan: TrendItem[];
    tahunan: TrendItem[];
  };
}

export default function AktivitasTrendChart({ data }: Props) {
  const [periode, setPeriode] = useState<PeriodeType>('harian');

  const currentData = data[periode] || [];

  const filterButtons: { key: PeriodeType; label: string }[] = [
    { key: 'harian', label: 'Harian' },
    { key: 'mingguan', label: 'Mingguan' },
    { key: 'bulanan', label: 'Bulanan' },
    { key: 'tahunan', label: 'Tahunan' },
  ];

  return (
    <div className="bg-white rounded-[10px] border border-black/5 p-4 flex flex-col h-full">
      {/* Header & Filter Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-[#0F4C5C]" />
          <h2 className="text-sm font-semibold text-[#0F2A38]">Aktivitas Kunjungan</h2>
        </div>

        {/* Tombol Pilihan Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setPeriode(btn.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                periode === btn.key
                  ? 'bg-white text-[#0F4C5C] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grafik Recharts */}
      <div className="w-full h-[300px]">
        {currentData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            Belum ada data aktivitas untuk periode ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any) => [value, 'Jumlah Kunjungan']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="jumlah"
                fill="#8B93FF"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}