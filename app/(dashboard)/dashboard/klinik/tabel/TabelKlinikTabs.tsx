"use client";

// app/(dashboard)/dashboard/klinik/tabel/TabelKlinikTabs.tsx

import { useState } from "react";
import TabelHivDownloadClient from "./TabelHivDownloadClient";
import TabelTbDownloadClient from "./TabelTbDownloadClient";

type TabKey = "hiv" | "tb" | "poliklinik";

const DAFTAR_TAB: { key: TabKey; label: string; aktif: boolean }[] = [
  { key: "hiv", label: "HIV", aktif: true },
  { key: "tb", label: "TBC", aktif: true },
  { key: "poliklinik", label: "Poliklinik", aktif: false }, // ganti true kalau modulnya sudah siap
];

type Props = {
  daftarWilkerHiv: string[];
  daftarWilkerTb: string[];
  tahunSekarang: number;
};

export default function TabelKlinikTabs({ daftarWilkerHiv, daftarWilkerTb, tahunSekarang }: Props) {
  const [tabAktif, setTabAktif] = useState<TabKey>("hiv");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {DAFTAR_TAB.map((tab) => (
          <button
            key={tab.key}
            type="button"
            disabled={!tab.aktif}
            onClick={() => setTabAktif(tab.key)}
            className={`rounded-t-md px-4 py-2 text-sm font-semibold transition-colors ${
              !tab.aktif
                ? "text-gray-300 cursor-not-allowed"
                : tabAktif === tab.key
                ? "bg-[#0F4C5C] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            title={!tab.aktif ? "Segera hadir" : undefined}
          >
            {tab.label}
            {!tab.aktif && <span className="ml-1 text-[10px] align-top">(segera)</span>}
          </button>
        ))}
      </div>

      {tabAktif === "hiv" && (
        <section>
          <h2 className="text-lg font-bold text-[#0F2A38] mb-3">Data Individu Mobile VCT PP HIV</h2>
          <TabelHivDownloadClient daftarWilker={daftarWilkerHiv} tahunSekarang={tahunSekarang} />
        </section>
      )}

      {tabAktif === "tb" && (
        <section>
          <h2 className="text-lg font-bold text-[#0F2A38] mb-3">Laporan Individu Hasil Skrining TBC</h2>
          <TabelTbDownloadClient daftarWilker={daftarWilkerTb} tahunSekarang={tahunSekarang} />
        </section>
      )}
    </div>
  );
}