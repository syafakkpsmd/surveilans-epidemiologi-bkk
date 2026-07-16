"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { KotaPesawatBulanan } from "@/lib/data/queries";
import DropdownMultiSelect from "@/components/ui/DropdownMultiSelect";

const NAMA_BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const WARNA = ["#0f766e","#b45309","#7c3aed","#dc2626","#0369a1","#65a30d","#db2777"];

export default function GrafikTrenKotaPesawat({ data, judul }: { data: KotaPesawatBulanan[]; judul: string }) {
  const semuaKota = useMemo(
    () => Array.from(new Set(data.map((d) => d.kota).filter((k): k is string => !!k && k.trim() !== ''))).sort(),
    [data]
  );
  const [kotaTerpilih, setKotaTerpilih] = useState<string[]>(semuaKota.slice(0, 3));

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const row: Record<string, number | string> = { bulan: NAMA_BULAN[i] };
      kotaTerpilih.forEach((kota) => {
        const match = data.find((d) => d.bulan === i + 1 && d.kota === kota);
        row[kota] = match?.total_penumpang ?? 0;
      });
      return row;
    });
  }, [data, kotaTerpilih]);

  function toggleKota(kota: string) {
    setKotaTerpilih((prev) =>
      prev.includes(kota) ? prev.filter((k) => k !== kota) : [...prev, kota]
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{judul}</h3>
        <DropdownMultiSelect
          label="Pilih Kota"
          opsi={semuaKota}
          terpilih={kotaTerpilih}
          onToggle={toggleKota}
          onPilihSemua={() => setKotaTerpilih(semuaKota)}
          onKosongkan={() => setKotaTerpilih([])}
          warnaAktif="bg-teal-600 text-white border-teal-600"
        />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <XAxis dataKey="bulan" />
          <YAxis />
          <Tooltip />
          <Legend />
          {kotaTerpilih.map((kota, i) => (
            <Line key={kota} type="monotone" dataKey={kota} stroke={WARNA[i % WARNA.length]} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}