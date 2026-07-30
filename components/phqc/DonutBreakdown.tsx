"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DonutBreakdownProps {
  data: { nilai: string; jumlah: number }[];
  warnaFn?: (nilai: string) => string;
  skema?: "rba"; // <-- BARU: string aman dikirim dari Server Component
  palet?: string[];
}

const PALET_DEFAULT = [
  "#0F4C5C", "#2F9E44", "#F0A202", "#D62839",
  "#7C3AED", "#EA580C", "#5B7083", "#0891B2",
];

// Logika RBA didefinisikan DI SINI (di dalam Client Component),
// bukan dikirim sebagai prop function dari Server Component.
function labelRba(nilai: string): string {
  const n = nilai.toLowerCase();
  if (n.includes("tinggi") || n === "merah") return "Risiko Tinggi";
  if (n.includes("sedang") || n === "kuning") return "Risiko Sedang";
  if (n.includes("rendah") || n === "hijau") return "Risiko Rendah";
  return "Tidak Diisi";
}

function warnaRba(nilai: string): string {
  const n = nilai.toLowerCase();
  if (n.includes("tinggi") || n === "merah") return "var(--color-risiko-merah)";
  if (n.includes("sedang") || n === "kuning") return "var(--color-risiko-kuning)";
  if (n.includes("rendah") || n === "hijau") return "var(--color-risiko-hijau)";
  return "var(--color-muted)";
}

export function DonutBreakdown({ data, warnaFn, skema, palet = PALET_DEFAULT }: DonutBreakdownProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted">Belum ada data untuk ditampilkan.</p>;
  }

  const total = data.reduce((a, d) => a + d.jumlah, 0);

  const dataTampil = data.map((d) => ({
    ...d,
    namaTampil: skema === "rba" ? labelRba(d.nilai) : d.nilai,
  }));

  const resolveWarna = (nilai: string, i: number) => {
    if (skema === "rba") return warnaRba(nilai);
    return warnaFn?.(nilai) ?? palet[i % palet.length];
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={dataTampil} dataKey="jumlah" nameKey="namaTampil" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {dataTampil.map((entry, i) => (
            <Cell key={entry.nilai} fill={resolveWarna(entry.nilai, i)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const num = typeof value === "number" ? value : Number(value ?? 0);
            return [
              `${num} (${((num / total) * 100).toFixed(1)}%)`,
              String(name),
            ];
          }}
        />
        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}