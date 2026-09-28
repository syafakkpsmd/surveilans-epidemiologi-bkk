"use client";

// app/(dashboard)/dashboard/klinik/tabel/TabelKlinikTabs.tsx

import { useState } from "react";
import TabelHivDownloadClient from "./TabelHivDownloadClient";
import TabelTbDownloadClient from "./TabelTbDownloadClient";
import TabelModulKlinikClient from "./TabelModulKlinikClient";
import { MODUL_KLINIK, type ModulKey } from "@/lib/klinik/modulTabelConfig";

type TabKey = "hiv" | "tb" | ModulKey;

const DAFTAR_TAB: { key: TabKey; label: string }[] = [
  { key: "hiv", label: "HIV" },
  { key: "tb", label: "TBC" },
  { key: "poliklinik", label: MODUL_KLINIK.poliklinik.labelTab },
  { key: "kier", label: MODUL_KLINIK.kier.labelTab },
  { key: "siaos", label: MODUL_KLINIK.siaos.labelTab },
];

type Props = {
  daftarWilkerHiv: string[];
  daftarWilkerTb: string[];
  daftarWilkerModul: Record<ModulKey, string[]>;
  tahunSekarang: number;
};

export default function TabelKlinikTabs({
  daftarWilkerHiv,
  daftarWilkerTb,
  daftarWilkerModul,
  tahunSekarang,
}: Props) {
  const [tabAktif, setTabAktif] = useState<TabKey>("hiv");

  // Untuk tab generik (poliklinik/kier/siaos); null kalau tab aktif HIV atau TBC
  const modulAktif = tabAktif !== "hiv" && tabAktif !== "tb" ? MODUL_KLINIK[tabAktif] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {DAFTAR_TAB.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTabAktif(tab.key)}
            className={`rounded-t-md px-4 py-2 text-sm font-semibold transition-colors ${
              tabAktif === tab.key ? "bg-[#0F4C5C] text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
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

      {modulAktif && (
        <section>
          <h2 className="text-lg font-bold text-[#0F2A38] mb-3">{modulAktif.judulHalaman}</h2>
          <TabelModulKlinikClient
            key={modulAktif.key}
            modul={modulAktif.key}
            daftarWilker={daftarWilkerModul[modulAktif.key]}
            tahunSekarang={tahunSekarang}
          />
        </section>
      )}
    </div>
  );
}