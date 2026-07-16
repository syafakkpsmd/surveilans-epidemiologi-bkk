"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/**
 * Data RBA di lapangan bisa memakai 2 konvensi berbeda tergantung sumbernya:
 * kode warna ("Hijau"/"Kuning"/"Merah") atau label deskriptif
 * ("Risiko Rendah"/"Risiko Sedang"/"Risiko Tinggi"/"Tidak Diisi").
 * Fungsi ini mengenali KEDUANYA supaya donut selalu terisi warna yang benar
 * apa pun konvensi yang dipakai datanya.
 */
function resolveRba(nilai: string): { warna: string; label: string; urutan: number } {
  const n = nilai.toLowerCase();
  if (n.includes("tinggi") || n === "merah") {
    return { warna: "#D62839", label: "Risiko Tinggi", urutan: 0 };
  }
  if (n.includes("sedang") || n === "kuning") {
    return { warna: "#F0A202", label: "Risiko Sedang", urutan: 1 };
  }
  if (n.includes("rendah") || n === "hijau") {
    return { warna: "#2F9E44", label: "Risiko Rendah", urutan: 2 };
  }
  return { warna: "#94A3B8", label: nilai, urutan: 3 };
}

interface DonutRbaProps {
  data: { nilai: string; jumlah: number }[];
}

export function DonutRba({ data }: DonutRbaProps) {
  const total = data.reduce((s, d) => s + d.jumlah, 0);
  const terurut = [...data].sort(
    (a, b) => resolveRba(a.nilai).urutan - resolveRba(b.nilai).urutan
  );

  if (data.length === 0) {
    return <p className="text-sm text-muted">Tidak ada data untuk periode ini.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-around">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={terurut}
              dataKey="jumlah"
              nameKey="nilai"
              innerRadius={55}
              outerRadius={82}
              paddingAngle={terurut.length > 1 ? 3 : 0}
              stroke="none"
            >
              {terurut.map((d) => (
                <Cell key={d.nilai} fill={resolveRba(d.nilai).warna} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value ?? 0} kapal`, resolveRba(String(name)).label]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-ink">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted">Total Kapal</span>
        </div>
      </div>

      <div className="w-full space-y-2 sm:max-w-[240px]">
        {terurut.map((d) => {
          const r = resolveRba(d.nilai);
          return (
            <div
              key={d.nilai}
              className="flex items-center justify-between rounded-control bg-bg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.warna }} />
                <span className="text-sm text-ink">{r.label}</span>
              </div>
              <div className="text-right">
                <span className="block text-sm font-bold text-ink">{d.jumlah}</span>
                <span className="block text-xs text-muted">
                  {total > 0 ? `${((d.jumlah / total) * 100).toFixed(1)}%` : "0%"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}