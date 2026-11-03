'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type BarHorizontalChartProps = {
  data: { kategori: string; jumlah: number }[];
  warna?: string;
  tinggiPerBaris?: number;
};

export default function BarHorizontalChart({
  data,
  warna = '#0F4C5C',
  tinggiPerBaris = 34,
}: BarHorizontalChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Belum ada data pada rentang ini.</p>;
  }

  const tinggi = Math.max(140, data.length * tinggiPerBaris);

  return (
    <ResponsiveContainer width="100%" height={tinggi}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="kategori" width={160} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="jumlah" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={warna} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}