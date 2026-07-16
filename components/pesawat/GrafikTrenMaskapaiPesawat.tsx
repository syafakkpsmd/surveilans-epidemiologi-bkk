"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MaskapaiPesawatBulanan } from "@/lib/supabase/queries";
import DropdownMultiSelect from "@/components/ui/DropdownMultiSelect";

const NAMA_BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const WARNA = ["#7c3aed","#0f766e","#b45309","#dc2626","#0369a1","#65a30d","#db2777"];

export default function GrafikTrenMaskapaiPesawat({ data, judul }: { data: MaskapaiPesawatBulanan[]; judul: string }) {
  const semuaMaskapai = useMemo(
    () => Array.from(new Set(data.map((d) => d.maskapai).filter((m): m is string => !!m && m.trim() !== ''))).sort(),
    [data]
  );
  const [maskapaiTerpilih, setMaskapaiTerpilih] = useState<string[]>(semuaMaskapai.slice(0, 3));

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const row: Record<string, number | string> = { bulan: NAMA_BULAN[i] };
      maskapaiTerpilih.forEach((maskapai) => {
        const match = data.find((d) => d.bulan === i + 1 && d.maskapai === maskapai);
        row[maskapai] = match?.total_penumpang ?? 0;
      });
      return row;
    });
  }, [data, maskapaiTerpilih]);

  function toggleMaskapai(maskapai: string) {
    setMaskapaiTerpilih((prev) =>
      prev.includes(maskapai) ? prev.filter((m) => m !== maskapai) : [...prev, maskapai]
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{judul}</h3>
        <DropdownMultiSelect
          label="Pilih Maskapai"
          opsi={semuaMaskapai}
          terpilih={maskapaiTerpilih}
          onToggle={toggleMaskapai}
          onPilihSemua={() => setMaskapaiTerpilih(semuaMaskapai)}
          onKosongkan={() => setMaskapaiTerpilih([])}
        />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <XAxis dataKey="bulan" />
          <YAxis />
          <Tooltip />
          <Legend />
          {maskapaiTerpilih.map((maskapai, i) => (
            <Line key={maskapai} type="monotone" dataKey={maskapai} stroke={WARNA[i % WARNA.length]} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}