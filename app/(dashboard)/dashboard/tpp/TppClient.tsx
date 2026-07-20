"use client";

import { useEffect, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type TppClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  wilayahParam?: string;
};

export default function TppClient({
  daftarWilayah,
  dataBulanan,
  role,
  tahunBerjalan,
  bulanBerjalan,
  wilayahParam,
}: TppClientProps) {
  const [selectedWilayah, setSelectedWilayah] = useState<string>(wilayahParam || "semua");
  const [bulanAnalisis, setBulanAnalisis] = useState<number>(bulanBerjalan);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartTms, setChartTms] = useState<any[]>([]);

  useEffect(() => {
    const filtered = dataBulanan.filter(
      (d) => selectedWilayah === "semua" || d.wilayah_kerja === selectedWilayah
    );

    const petaBulan = new Map<number, any>();
    filtered.forEach((item) => {
      const existing = petaBulan.get(item.bulan) ?? {
        name: NAMA_BULAN[item.bulan - 1] || `Bln-${item.bulan}`,
        urutan: item.bulan,
        jumlah_tpp_diperiksa: 0,
        total_sampel: 0,
        ikl_ms: 0,
        ikl_tms: 0,
        tms_formaldehyde: 0,
        tms_borax: 0,
        tms_metyl_yellow: 0,
        tms_rodamin_b: 0,
        tms_bakteriologis: 0,
        tms_hy_rise: 0,
      };
      existing.jumlah_tpp_diperiksa += Number(item.jumlah_tpp_diperiksa || 0);
      existing.total_sampel += Number(item.total_sampel || 0);
      existing.ikl_ms += Number(item.ikl_ms || 0);
      existing.ikl_tms += Number(item.ikl_tms || 0);
      existing.tms_formaldehyde += Number(item.tms_formaldehyde || 0);
      existing.tms_borax += Number(item.tms_borax || 0);
      existing.tms_metyl_yellow += Number(item.tms_metyl_yellow || 0);
      existing.tms_rodamin_b += Number(item.tms_rodamin_b || 0);
      existing.tms_bakteriologis += Number(item.tms_bakteriologis || 0);
      existing.tms_hy_rise += Number(item.tms_hy_rise || 0);
      petaBulan.set(item.bulan, existing);
    });

    const hasil = Array.from(petaBulan.values()).sort((a, b) => a.urutan - b.urutan);
    setChartData(hasil);
    setChartTms(hasil);
  }, [selectedWilayah, dataBulanan]);

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
          Belum ada data TPP untuk tahun {tahunBerjalan}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Jumlah TPP Diperiksa & Total Sampel per Bulan
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
              Breakdown Komponen Tidak Memenuhi Syarat (TMS) per Bulan
            </h3>
            <TrenChecklistMingguan data={chartTms} seriesList={seriesTms} maxAktifDefault={3} variant="bar" />
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
