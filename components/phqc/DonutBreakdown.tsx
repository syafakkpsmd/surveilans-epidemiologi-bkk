"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DonutBreakdownProps {
  data: { nilai: string; jumlah: number }[];
  warnaFn?: (nilai: string) => string;
  palet?: string[];
}

const PALET_DEFAULT = [
  "#0F4C5C", "#2F9E44", "#F0A202", "#D62839",
  "#7C3AED", "#EA580C", "#5B7083", "#0891B2",
];

export function DonutBreakdown({ data, warnaFn, palet = PALET_DEFAULT }: DonutBreakdownProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted">Belum ada data untuk ditampilkan.</p>;
  }

  const total = data.reduce((a, d) => a + d.jumlah, 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="jumlah" nameKey="nilai" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {data.map((entry, i) => (
            <Cell key={entry.nilai} fill={warnaFn?.(entry.nilai) ?? palet[i % palet.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value} (${((value / total) * 100).toFixed(1)}%)`,
            name,
          ]}
        />
        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}