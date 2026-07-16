"use client";

import { useState } from "react";
import GrafikBarBulanan, { SeriesBar } from "@/components/vektor/GrafikBarBulanan";

const OPSI: { key: string; label: string; warna: string }[] = [
  { key: "sklt_male", label: "SKLT Laki-laki", warna: "#B71C1C" },
  { key: "sklt_female", label: "SKLT Perempuan", warna: "#F87171" },
  { key: "td_laik_male", label: "TD Laik Laki-laki", warna: "#EF6C00" },
  { key: "td_laik_female", label: "TD Laik Perempuan", warna: "#FDBA74" },
  { key: "iaos_male", label: "IAOS Laki-laki", warna: "#2F9E44" },
  { key: "iaos_female", label: "IAOS Perempuan", warna: "#86EFAC" },
  { key: "kier_male", label: "KIER Laki-laki", warna: "#0D9488" },
  { key: "kier_female", label: "KIER Perempuan", warna: "#5EEAD4" },
  { key: "jenazah_male", label: "Jenazah Laki-laki", warna: "#6B7280" },
  { key: "jenazah_female", label: "Jenazah Perempuan", warna: "#D1D5DB" },
];

export default function GrafikSertifikatGenderBulanan({
  data,
}: {
  data: Array<Record<string, unknown>>;
}) {
  const [dipilih, setDipilih] = useState<string[]>(["sklt_male", "sklt_female"]);

  function toggle(key: string) {
    setDipilih((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const seriesList: SeriesBar[] = OPSI.filter((o) => dipilih.includes(o.key)).map((o) => ({
    key: o.key,
    label: o.label,
    warna: o.warna,
  }));

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Sertifikat per Jenis Kelamin — Bulanan</h3>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2">
        {OPSI.map((o) => (
          <label key={o.key} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={dipilih.includes(o.key)}
              onChange={() => toggle(o.key)}
              className="accent-teal-600"
            />
            {o.label}
          </label>
        ))}
      </div>
      {seriesList.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
          Pilih minimal 1 kategori untuk ditampilkan.
        </div>
      ) : (
        <GrafikBarBulanan judul="" data={data} seriesList={seriesList} />
      )}
    </div>
  );
}