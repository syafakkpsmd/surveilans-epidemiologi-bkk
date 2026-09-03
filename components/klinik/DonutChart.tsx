// components/klinik/DonutChart.tsx
'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WARNA = ['#0F4C5C', '#f97316', '#2E7D32', '#B71C1C', '#7C3AED', '#00838F'];

export function DonutChart({
  judul, data,
}: { judul: string; data: { kategori: string; jumlah: number }[] }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
      <h3 className="mb-3 text-sm font-bold text-gray-800 text-center">{judul}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="jumlah" nameKey="kategori" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={WARNA[i % WARNA.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => (typeof value === 'number' ? value.toLocaleString('id-ID') : value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}