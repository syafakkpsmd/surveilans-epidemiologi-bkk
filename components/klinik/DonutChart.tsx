// components/klinik/DonutChart.tsx
'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WARNA = ['#0F4C5C', '#f97316', '#2E7D32', '#B71C1C', '#7C3AED', '#00838F', '#CA8A04', '#DB2777', '#65A30D'];

export function DonutChart({
  judul, data,
}: { judul: string; data: { kategori: string; jumlah: number }[] }) {
  // Perkiraan baris legend: ~3 item per baris pada lebar kartu ini
  const baris = Math.ceil(data.length / 3);
  const tinggiLegend = baris * 24 + 24; // ~24px per baris teks legend
  const tinggiChart = 170 + tinggiLegend; // 170 = ruang untuk donut

  return (
    <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
      <h3 className="mb-3 text-sm font-bold text-gray-800 text-center">{judul}</h3>
      <ResponsiveContainer width="100%" height={tinggiChart}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            dataKey="jumlah"
            nameKey="kategori"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            cy={85} // fiksasi posisi donut di area atas, tidak ikut turun karena legend
          >
            {data.map((_, i) => <Cell key={i} fill={WARNA[i % WARNA.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => (typeof value === 'number' ? value.toLocaleString('id-ID') : value)} />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ marginTop: 20, fontSize: 12, lineHeight: '20px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}