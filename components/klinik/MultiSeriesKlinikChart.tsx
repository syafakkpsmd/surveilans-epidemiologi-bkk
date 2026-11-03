"use client";

import { useMemo, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";

const NAMA_BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const PALET = ["#0F4C5C","#DC2626","#2563EB","#EA580C","#7C3AED","#0891B2","#CA8A04","#DB2777","#65A30D","#9333EA"];

function slugKey(nama: string) {
  return "k_" + nama.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

type Props = {
  judul: string;
  daftarItem: string[];
  dataPeriode: any[];
  granularitas: "mingguan" | "bulanan";
  defaultDipilihSemua?: boolean;
};

export default function MultiSeriesKlinikChart({ judul, daftarItem, dataPeriode, granularitas, defaultDipilihSemua = false }: Props) {
  const [dipilih, setDipilih] = useState<Set<string>>(
    new Set(defaultDipilihSemua ? daftarItem : daftarItem.slice(0, 3))
  );

  const toggle = (nama: string) => {
    setDipilih((prev) => {
      const next = new Set(prev);
      if (next.has(nama)) next.delete(nama); else next.add(nama);
      return next;
    });
  };

  const fieldUrutan = granularitas === "bulanan" ? "bulan" : "minggu";
  const tipeChart = granularitas === "mingguan" ? "line" : "bar";

  const dataChart = useMemo(() => {
    const peta = new Map<number, any>();
    for (const item of dataPeriode) {
      if (!dipilih.has(item.wilayah_kerja)) continue;
      const urutan = Number(item[fieldUrutan]);
      if (isNaN(urutan) || urutan <= 0) continue;
      const label = granularitas === "bulanan" ? (NAMA_BULAN[urutan - 1] || `Bln-${urutan}`) : `Mg-${urutan}`;
      const existing = peta.get(urutan) ?? { name: label, label, urutan };
      const key = slugKey(item.wilayah_kerja);
      existing[key] = (existing[key] || 0) + Number(item.total_layanan || 0);
      peta.set(urutan, existing);
    }
    return Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan);
  }, [dataPeriode, dipilih, fieldUrutan, granularitas]);

  const seriesAktif = daftarItem
    .filter((nama) => dipilih.has(nama))
    .map((nama, i) => ({ key: slugKey(nama), label: nama, warna: PALET[i % PALET.length] }));

  return (
    <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
      <h3 className="mb-4 text-center text-sm font-bold text-gray-800">{judul} 
        <br /><span className="font-normal text-gray-500">(dalam {granularitas})</span>
      </h3>

      {/* CHART DULU */}
      {seriesAktif.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-xs text-gray-500">
          Pilih minimal satu klinik/wilayah kerja untuk ditampilkan.
        </div>
      ) : dataChart.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-xs text-gray-500">
          Data belum tersedia untuk pilihan ini.
        </div>
      ) : (
        <TrenChartLine data={dataChart} tipeChart={tipeChart} seriesList={seriesAktif} />
      )}

      {/* CHECKBOX DI BAWAH */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {daftarItem.map((nama, i) => (
          <label key={nama} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dipilih.has(nama)}
              onChange={() => toggle(nama)}
              className="rounded border-gray-300"
              style={{ accentColor: PALET[i % PALET.length] }}
            />
            <span style={{ color: PALET[i % PALET.length] }}>●</span> {nama}
          </label>
        ))}
      </div>
    </div>
  );
}