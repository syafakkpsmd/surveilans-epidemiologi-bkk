"use client";

import { useEffect, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const KOLOM_ANGKA = [
  "jumlah_tpp_diperiksa", "total_sampel", "jumlah_ms", "jumlah_tms",
  "ikl_ms", "ikl_tms", "tms_formaldehyde", "tms_borax", "tms_metyl_yellow",
  "tms_rodamin_b", "tms_bakteriologis", "tms_hy_rise",
] as const;

type TppClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  dataMingguan: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  wilayahParam?: string;
};

export default function TppClient({
  daftarWilayah,
  dataBulanan,
  dataMingguan,
  role,
  tahunBerjalan,
  bulanBerjalan,
  wilayahParam,
}: TppClientProps) {
  const [selectedWilayah, setSelectedWilayah] = useState<string>(wilayahParam || "semua");
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("bulanan");
  const [bulanAnalisis, setBulanAnalisis] = useState<number>(bulanBerjalan);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const sumberData = granularitas === "bulanan" ? dataBulanan : dataMingguan;
    const kolomPeriode = granularitas === "bulanan" ? "bulan" : "minggu";

    const filtered = sumberData.filter(
      (d) => selectedWilayah === "semua" || d.wilayah_kerja === selectedWilayah
    );

    const peta = new Map<number, any>();
    filtered.forEach((item) => {
      const urutan = item[kolomPeriode];
      const label = granularitas === "bulanan" ? NAMA_BULAN[urutan - 1] || `Bln-${urutan}` : `Mg-${urutan}`;
      const existing =
        peta.get(urutan) ?? Object.fromEntries([["name", label], ["urutan", urutan], ...KOLOM_ANGKA.map((k) => [k, 0])]);
      KOLOM_ANGKA.forEach((k) => {
        existing[k] += Number(item[k] || 0);
      });
      peta.set(urutan, existing);
    });

    setChartData(Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan));
  }, [selectedWilayah, granularitas, dataBulanan, dataMingguan]);

  const seriesTms: SeriesChecklist[] = [
    { key: "ikl_tms", label: "IKL - TMS", warna: "#B71C1C" },
    { key: "tms_formaldehyde", label: "Formaldehyde - TMS", warna: "#E65100" },
    { key: "tms_borax", label: "Borax - TMS", warna: "#7C3AED" },
    { key: "tms_metyl_yellow", label: "Metyl Yellow - TMS", warna: "#1B5E20" },
    { key: "tms_rodamin_b", label: "Rodamin B - TMS", warna: "#C2185B" },
    { key: "tms_bakteriologis", label: "Bakteriologis - TMS", warna: "#006064" },
    { key: "tms_hy_rise", label: "Hy-Rise - TMS", warna: "#5D4037" },
  ];

  const periodeKey = `${tahunBerjalan}-${bulanAnalisis}`;
  const adaTms = chartData.some((d) => seriesTms.some((s) => Number(d[s.key] || 0) > 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans TPP</h1>
          <p className="text-sm text-gray-500">
            Pengawasan sanitasi Tempat Pengelolaan Pangan — {tahunBerjalan}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 bg-white p-0.5 text-sm">
            <button
              onClick={() => setGranularitas("mingguan")}
              className={`rounded-md px-3 py-1 ${granularitas === "mingguan" ? "bg-[#0F4C5C] text-white" : "text-gray-600"}`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setGranularitas("bulanan")}
              className={`rounded-md px-3 py-1 ${granularitas === "bulanan" ? "bg-[#0F4C5C] text-white" : "text-gray-600"}`}
            >
              Bulanan
            </button>
          </div>

          <select
            value={selectedWilayah}
            onChange={(e) => setSelectedWilayah(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-hidden"
          >
            <option value="semua">Semua Wilayah Kerja</option>
            {daftarWilayah.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>

          <select
            value={bulanAnalisis}
            onChange={(e) => setBulanAnalisis(parseInt(e.target.value, 10))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-hidden"
            title="Bulan untuk Analisis/Prediksi AI"
          >
            {NAMA_BULAN.map((nama, idx) => (
              <option key={nama} value={idx + 1}>
                {nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
          Belum ada data TPP {granularitas} untuk tahun {tahunBerjalan}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Kepatuhan TPP — Memenuhi Syarat vs Tidak Memenuhi Syarat ({granularitas})
            </h3>
            <TrenChartLine
              data={chartData}
              tipeChart="bar"
              seriesList={[
                { key: "jumlah_ms", label: "Memenuhi Syarat", warna: "#1B5E20" },
                { key: "jumlah_tms", label: "Tidak Memenuhi Syarat", warna: "#B71C1C" },
              ]}
            />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Jumlah TPP Diperiksa & Total Sampel ({granularitas})
            </h3>
            <TrenChartLine
              data={chartData}
              tipeChart="bar"
              seriesList={[
                { key: "jumlah_tpp_diperiksa", label: "TPP Diperiksa", warna: "#0F4C5C" },
                { key: "total_sampel", label: "Total Sampel Diuji", warna: "#00838F" },
              ]}
            />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Breakdown Komponen Tidak Memenuhi Syarat (TMS) — {granularitas}
            </h3>
            {adaTms ? (
              <TrenChecklistMingguan data={chartData} seriesList={seriesTms} maxAktifDefault={3} variant="bar" />
            ) : (
              <div className="rounded-lg bg-green-50 p-6 text-center text-sm text-green-700">
                ✅ Tidak ada temuan Tidak Memenuhi Syarat pada periode ini — seluruh komponen TPP terkendali.
              </div>
            )}
          </div>

          <BoxAnalisisAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks="tpp-bulanan"
            periodeKey={periodeKey}
            wilayahKerja={selectedWilayah !== "semua" ? selectedWilayah : undefined}
          />
          <BoxPrediksiAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks="tpp-bulanan"
            periodeKey={periodeKey}
            wilayahKerja={selectedWilayah !== "semua" ? selectedWilayah : undefined}
          />
        </div>
      )}
    </div>
  );
}