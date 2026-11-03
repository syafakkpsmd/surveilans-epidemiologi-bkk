'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DaerahAsal {
  label: string; // "Samarinda, Kalimantan Timur"
  jumlah: number;
}

interface Props {
  dataHarian: DaerahAsal[];
  dataMingguan: DaerahAsal[];
}

const WARNA_BAR = '#0F4C5C'; // biru Kemenkes, sama seperti chart horizontal

type Periode = 'harian' | 'mingguan';

export default function TopDaerahChartVertikal({ dataHarian, dataMingguan }: Props) {
  const [periode, setPeriode] = useState<Periode>('harian');

  const data = periode === 'harian' ? dataHarian : dataMingguan;

  const chartData = useMemo(
    () => data.map((d) => ({ daerah: d.label, jumlah: d.jumlah })),
    [data]
  );

  return (
    <div className="bg-white rounded-[10px] border border-black/5 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#0F2A38]">
          Top Daerah Asal Login — {periode === 'harian' ? 'Hari Ini' : '7 Hari Terakhir'}
        </h2>
        <div className="flex items-center gap-1 rounded-lg border border-black/10 p-0.5">
          <button
            type="button"
            onClick={() => setPeriode('harian')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              periode === 'harian'
                ? 'bg-[#0F4C5C] text-white'
                : 'text-[#0F2A38]/60 hover:text-[#0F2A38]'
            }`}
          >
            Harian
          </button>
          <button
            type="button"
            onClick={() => setPeriode('mingguan')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              periode === 'mingguan'
                ? 'bg-[#0F4C5C] text-white'
                : 'text-[#0F2A38]/60 hover:text-[#0F2A38]'
            }`}
          >
            Mingguan
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#0F2A38]/60">
          Belum ada data kunjungan dengan informasi daerah asal untuk periode ini.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, bottom: 48, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="daerah"
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={70}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => [value, 'Jumlah Login']} />
            <Bar dataKey="jumlah" fill={WARNA_BAR} radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}