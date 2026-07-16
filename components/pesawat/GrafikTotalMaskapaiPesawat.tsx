"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MaskapaiPesawatBulanan } from "@/lib/supabase/queries";

export default function GrafikTotalMaskapaiPesawat({
  data,
  judul,
}: {
  data: MaskapaiPesawatBulanan[];
  judul: string;
}) {
  const totalPerMaskapai = Object.values(
    data.reduce<Record<string, { maskapai: string; jumlah_penerbangan: number; total_penumpang: number }>>(
      (acc, row) => {
        if (!acc[row.maskapai]) acc[row.maskapai] = { maskapai: row.maskapai, jumlah_penerbangan: 0, total_penumpang: 0 };
        acc[row.maskapai].jumlah_penerbangan += row.jumlah_penerbangan;
        acc[row.maskapai].total_penumpang += row.total_penumpang;
        return acc;
      },
      {}
    )
  ).sort((a, b) => b.total_penumpang - a.total_penumpang);

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold mb-3">{judul}</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, totalPerMaskapai.length * 36)}>
        <BarChart data={totalPerMaskapai} layout="vertical" margin={{ left: 100 }}>
          <XAxis type="number" />
          <YAxis type="category" dataKey="maskapai" width={100} />
          <Tooltip />
          <Bar dataKey="total_penumpang" name="Total Penumpang" fill="#7c3aed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}