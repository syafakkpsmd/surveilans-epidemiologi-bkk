'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PALET_DEFAULT = ['#0F4C5C', '#B71C1C', '#EF6C00', '#2F9E44', '#7C3AED', '#0D9488', '#EA580C', '#6D28D9'];

export default function DonutChart({
  judul,
  data,
  warnaPalet = PALET_DEFAULT,
}: {
  judul: string;
  data: { kategori: string; jumlah: number }[];
  warnaPalet?: string[];
}) {
  const total = data.reduce((t, d) => t + d.jumlah, 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{judul}</h3>
        <div className="flex h-56 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
          Belum ada data untuk periode ini.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold text-gray-700">{judul}</h3>
      <p className="mb-2 text-xs text-gray-400">Total: {total} kegiatan</p>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="jumlah"
            nameKey="kategori"
            innerRadius={35}
            outerRadius={85}
            paddingAngle={2}
            label={(props: any) => {
              const kategori = props?.payload?.kategori ?? props?.name ?? '';
              const jumlah = props?.payload?.jumlah ?? props?.value ?? 0;
              const persen = props?.percent ?? 0;
              return `${kategori}: ${jumlah} (${(persen * 100).toFixed(0)}%)`;
            }}
            labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={warnaPalet[i % warnaPalet.length]} stroke="#ffffff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any, name: any) => [`${value} kegiatan`, name] as [string, string]} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string, entry: any) => `${value} (${entry?.payload?.jumlah ?? ''})`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}