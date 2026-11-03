'use client';

import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DaerahAsal {
  label: string; // "Samarinda, Kalimantan Timur"
  jumlah: number;
}

interface Props {
  data: DaerahAsal[];
}

const WARNA_BAR = '#0F4C5C'; // biru Kemenkes
const WARNA_LINE = '#2E9E5B'; // hijau — garis kumulatif

export default function TopDaerahChart({ data }: Props) {
  const [tampilkanKumulatif, setTampilkanKumulatif] = useState(true);
  const [tampilkanBar, setTampilkanBar] = useState(true);

  const chartData = useMemo(() => {
    let kumulatif = 0;
    return data.map((d) => {
      kumulatif += d.jumlah;
      return {
        daerah: d.label,
        jumlah: d.jumlah,
        kumulatif,
      };
    });
  }, [data]);

  const maxJumlah = useMemo(
    () => Math.max(1, ...chartData.map((d) => d.jumlah)),
    [chartData]
  );

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-[10px] border border-black/5 p-6 text-center text-sm text-[#0F2A38]/60">
        Belum ada data kunjungan dengan informasi daerah asal.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[10px] border border-black/5 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#0F2A38]">Top Daerah Asal Login</h2>
        <div className="flex items-center gap-4 text-xs text-[#0F2A38]/70">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={tampilkanBar}
              onChange={(e) => setTampilkanBar(e.target.checked)}
              className="accent-[#0F4C5C]"
            />
            Jumlah Login
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={tampilkanKumulatif}
              onChange={(e) => setTampilkanKumulatif(e.target.checked)}
              className="accent-[#2E9E5B]"
            />
            Kumulatif
          </label>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, Math.ceil(maxJumlah * 1.1)]}
            allowDecimals={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="daerah"
            width={150}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: any, name: any) => [
              value,
              name === 'jumlah' ? 'Jumlah Login' : 'Kumulatif',
            ]}
          />
          <Legend
            formatter={(value) =>
              value === 'jumlah' ? 'Jumlah Login' : 'Kumulatif'
            }
          />
          {tampilkanBar && (
            <Bar dataKey="jumlah" fill={WARNA_BAR} radius={[0, 4, 4, 0]} barSize={18} />
          )}
          {tampilkanKumulatif && (
            <Line
              dataKey="kumulatif"
              stroke={WARNA_LINE}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}