"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const PALET_WARNA = [
  "#0F4C5C", "#2F9E44", "#F0A202", "#D62839", "#7C3AED", "#0EA5E9", "#DB2777", "#B45309",
];

export type SkemaWarnaPie = "risiko" | "terjangkit" | "vektor" | "kelengkapan" | "faktor-risiko" | "default";

function warnaUntukSkema(skema: SkemaWarnaPie, nilai: string, index: number): string {
  const n = nilai.toLowerCase();
  switch (skema) {
    case "risiko":
      if (n.includes("tinggi") || n === "merah") return "#D62839";
      if (n.includes("sedang") || n === "kuning") return "#F0A202";
      if (n.includes("rendah") || n === "hijau") return "#2F9E44";
      return "#94A3B8";
    case "terjangkit":
      return n === "ya" ? "#D62839" : n === "tidak" ? "#2F9E44" : "#94A3B8";
    case "vektor":
      return n === "ada" ? "#D62839" : n === "tidak ada" ? "#2F9E44" : "#94A3B8";
    case "kelengkapan":
      if (n === "lengkap") return "#2F9E44";
      if (n.includes("tidak lengkap")) return "#D62839";
      return "#F0A202";
    case "faktor-risiko":
      if (n === "tidak ditemukan") return "#2F9E44";
      if (n === "tidak diisi") return "#94A3B8";
      return "#D62839";
    default:
      return PALET_WARNA[index % PALET_WARNA.length];
  }
}

interface EntriLabel {
  name?: string;
  percent?: number;
}

interface PieBreakdownProps {
  data: { nilai: string; jumlah: number }[];
  skema?: SkemaWarnaPie;
  tinggi?: number;
}

export function PieBreakdown({ data, skema = "default", tinggi = 220 }: PieBreakdownProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">Tidak ada data untuk periode ini.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={tinggi}>
      <PieChart>
        <Pie
          data={data}
          dataKey="jumlah"
          nameKey="nilai"
          outerRadius={78}
          label={(entri: EntriLabel) => `${entri.name ?? ""} (${((entri.percent ?? 0) * 100).toFixed(0)}%)`}
          labelLine={{ strokeWidth: 1 }}
        >
          {data.map((d, i) => (
            <Cell key={d.nilai} fill={warnaUntukSkema(skema, d.nilai, i)} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value ?? 0} kapal`, ""]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}