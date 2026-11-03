"use client";

import { useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { DAFTAR_KOMORBID } from "@/lib/klinik/komorbid";

type Props = {
  judul: string;
  data: any[];
  tipeChart: "line" | "bar";
};

export default function KomorbidChart({ judul, data, tipeChart }: Props) {
  const [dipilih, setDipilih] = useState<Set<string>>(new Set(DAFTAR_KOMORBID.map((k) => k.key)));

  const toggle = (key: string) => {
    setDipilih((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const seriesAktif = DAFTAR_KOMORBID.filter((k) => dipilih.has(k.key))
    .map((k) => ({ key: k.key, label: k.label, warna: k.warna }));

  return (
    <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
      <h3 className="mb-4 text-center text-sm font-bold text-gray-800">{judul}</h3>

      {/* CHART DULU */}
      {seriesAktif.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-xs text-gray-500">
          Pilih minimal satu jenis komorbid untuk ditampilkan.
        </div>
      ) : (
        <TrenChartLine data={data} tipeChart={tipeChart} seriesList={seriesAktif} />
      )}

      {/* CHECKBOX DI BAWAH */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {DAFTAR_KOMORBID.map((k) => (
          <label key={k.key} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dipilih.has(k.key)}
              onChange={() => toggle(k.key)}
              className="rounded border-gray-300"
              style={{ accentColor: k.warna }}
            />
            <span style={{ color: k.warna }}>●</span> {k.label}
          </label>
        ))}
      </div>
    </div>
  );
}