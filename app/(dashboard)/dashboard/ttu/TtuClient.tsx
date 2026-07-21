"use client";

import { useEffect, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const KOLOM_TMS_TTU = [
  { key: "tms_lingkungan_luar_halaman", label: "Lingkungan Luar/Halaman", warna: "#B71C1C" },
  { key: "tms_ruang_bangunan", label: "Ruang Bangunan", warna: "#E65100" },
  { key: "tms_penyehatan_air", label: "Penyehatan Air", warna: "#00838F" },
  { key: "tms_penyehatan_udara_ruang", label: "Penyehatan Udara Ruang", warna: "#0F4C5C" },
  { key: "tms_pengelolaan_limbah", label: "Pengelolaan Limbah", warna: "#7C3AED" },
  { key: "tms_pencahayaan", label: "Pencahayaan", warna: "#C2185B" },
  { key: "tms_kebisingan", label: "Kebisingan", warna: "#1B5E20" },
  { key: "tms_getaran_diruang_kerja", label: "Getaran di Ruang Kerja", warna: "#5D4037" },
  { key: "tms_pengendalian_vektor_penyakit", label: "Pengendalian Vektor Penyakit", warna: "#F57F17" },
  { key: "tms_instalasi", label: "Instalasi", warna: "#4527A0" },
  { key: "tms_pemeliharaan_jamban_kamar_mandi", label: "Jamban & Kamar Mandi", warna: "#37474F" },
] as const;

const KOLOM_ANGKA = ["jumlah_diperiksa", "jumlah_ms", "jumlah_tms", ...KOLOM_TMS_TTU.map((k) => k.key)] as const;

type TtuClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  dataMingguan: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  wilayahParam?: string;
};

export default function TtuClient({
  daftarWilayah,
  dataBulanan,
  dataMingguan,
  role,
  tahunBerjalan,
  bulanBerjalan,
  wilayahParam,
}: TtuClientProps) {
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

  const seriesTms: SeriesChecklist[] = KOLOM_TMS_TTU.map((k) => ({ ...k }));
  const periodeKey = `${tahunBerjalan}-${bulanAnalisis}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans TTU</h1>
          <p className="text-sm text-gray-500">
            Pengawasan sanitasi Tempat-Tempat Umum — {tahunBerjalan}.
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
          Belum ada data TTU {granularitas} untuk tahun {tahunBerjalan}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Kepatuhan TTU — Memenuhi Syarat vs Tidak Memenuhi Syarat ({granularitas})
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
              Breakdown Komponen Tidak Memenuhi Syarat (TMS) — {granularitas}
            </h3>
            <TrenChecklistMingguan data={chartData} seriesList={seriesTms} maxAktifDefault={3} variant="bar" />
          </div>

          <BoxAnalisisAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks="ttu-bulanan"
            periodeKey={periodeKey}
            wilayahKerja={selectedWilayah !== "semua" ? selectedWilayah : undefined}
          />
          <BoxPrediksiAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks="ttu-bulanan"
            periodeKey={periodeKey}
            wilayahKerja={selectedWilayah !== "semua" ? selectedWilayah : undefined}
          />
        </div>
      )}
    </div>
  );
}
