"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Deklarasi tipe data lokal untuk menghindari error modul eksternal yang hilang
export interface KotaPesawatBulanan {
  kota: string;
  jumlah_penerbangan: number;
  total_penumpang: number;
  [key: string]: any;
}

export default function GrafikTotalKotaPesawat({
  data,
  judul,
}: {
  data: KotaPesawatBulanan[];
  judul: string;
}) {
  const totalPerKota = Object.values(
    data.reduce<Record<string, { kota: string; jumlah_penerbangan: number; total_penumpang: number }>>(
      (acc, row) => {
        if (!acc[row.kota]) {
          acc[row.kota] = { kota: row.kota, jumlah_penerbangan: 0, total_penumpang: 0 };
        }
        acc[row.kota].jumlah_penerbangan += row.jumlah_penerbangan || 0;
        acc[row.kota].total_penumpang += row.total_penumpang || 0;
        return acc;
      },
      {}
    )
  ).sort((a, b) => b.total_penumpang - a.total_penumpang);

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold mb-3">{judul}</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, totalPerKota.length * 36)}>
        <BarChart data={totalPerKota} layout="vertical" margin={{ left: 100 }}>
          <XAxis type="number" />
          <YAxis type="category" dataKey="kota" width={100} />
          <Tooltip 
            formatter={(value: any, name: any) => [
              value,
              name === "total_penumpang" ? "Total Penumpang" : String(name)
            ]}
          />
          <Bar dataKey="total_penumpang" name="Total Penumpang" fill="#0f766e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}