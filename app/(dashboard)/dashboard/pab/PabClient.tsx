"use client";

import { useEffect, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type PabClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  wilayahParam?: string;
};

export default function PabClient({
  daftarWilayah,
  dataBulanan,
  role,
  tahunBerjalan,
  bulanBerjalan,
  wilayahParam,
}: PabClientProps) {
  const [selectedWilayah, setSelectedWilayah] = useState<string>(wilayahParam || "semua");
  const [bulanAnalisis, setBulanAnalisis] = useState<number>(bulanBerjalan);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const filtered = dataBulanan.filter(
      (d) => selectedWilayah === "semua" || d.wilayah_kerja === selectedWilayah
    );

    const petaBulan = new Map<number, any>();
    filtered.forEach((item) => {
      const existing = petaBulan.get(item.bulan) ?? {
        name: NAMA_BULAN[item.bulan - 1] || `Bln-${item.bulan}`,
        urutan: item.bulan,
        jumlah_pemeriksaan: 0,
        total_pab_diperiksa: 0,
        tms_fisik: 0,
        tms_kimia: 0,
        tms_bakteriologis: 0,
      };
      existing.jumlah_pemeriksaan += Number(item.jumlah_pemeriksaan || 0);
      existing.total_pab_diperiksa += Number(item.total_pab_diperiksa || 0);
      existing.tms_fisik += Number(item.tms_fisik || 0);
      existing.tms_kimia += Number(item.tms_kimia || 0);
      existing.tms_bakteriologis += Number(item.tms_bakteriologis || 0);
      petaBulan.set(item.bulan, existing);
    });

    setChartData(Array.from(petaBulan.values()).sort((a, b) => a.urutan - b.urutan));
  }, [selectedWilayah, dataBulanan]);

  const seriesTms: SeriesChecklist[] = [
    { key: "tms_fisik", label: "Fisik - TMS", warna: "#E65100" },
    { key: "tms_kimia", label: "Kimia - TMS", warna: "#7C3AED" },
    { key: "tms_bakteriologis", label: "Bakteriologis - TMS", warna: "#B71C1C" },
  ];

  const periodeKey = `${tahunBerjalan}-${bulanAnalisis}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans PAB</h1>
          <p className="text-sm text-gray-500">
            Pengawasan kualitas Penyediaan Air Bersih — {tahunBerjalan}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          Belum ada data PAB untuk tahun {tahunBerjalan}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Jumlah Pemeriksaan & Titik PAB Diperiksa per Bulan
            </h3>
            <TrenChartLine
              data={chartData}
              tipeChart="bar"
              seriesList={[
                { key: "jumlah_pemeriksaan", label: "Jumlah Pemeriksaan", warna: "#0F4C5C" },
                { key: "total_pab_diperiksa", label: "Titik PAB Diperiksa", warna: "#00838F" },
              ]}
            />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Breakdown Parameter Tidak Memenuhi Syarat (TMS) per Bulan
            </h3>
            <TrenChecklistMingguan data={chartData} seriesList={seriesTms} maxAktifDefault={3} variant="bar" />
          </div>

          <BoxAnalisisAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks="pab-bulanan"
            periodeKey={periodeKey}
            wilayahKerja={selectedWilayah !== "semua" ? selectedWilayah : undefined}
          />
          <BoxPrediksiAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks="pab-bulanan"
            periodeKey={periodeKey}
            wilayahKerja={selectedWilayah !== "semua" ? selectedWilayah : undefined}
          />
        </div>
      )}
    </div>
  );
}
