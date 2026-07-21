"use client";

import { useEffect, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Daftar kunci kolom parameter laboratorium di Supabase
const PARAMETER_LAB = [
  "formaldehyde",
  "borax",
  "metyl_yellow",
  "rodamin_b",
  "bakteriologis",
  "hy_rise",
] as const;

type TppClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  dataMingguan: any[];
  dataDetailTpp?: any[]; // Data raw detail dari Supabase
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  wilayahParam?: string;
};

// Helper status MS
const isMsText = (val: any): boolean => {
  if (!val) return false;
  if (typeof val === "string") {
    const v = val.trim().toLowerCase();
    return v === "memenuhi syarat" || v === "ms";
  }
  return Number(val) > 0;
};

// Helper status TMS
const isTmsText = (val: any): boolean => {
  if (!val) return false;
  if (typeof val === "string") {
    const v = val.trim().toLowerCase();
    return v === "tidak memenuhi syarat" || v === "tms";
  }
  return false;
};

export default function TppClient({
  daftarWilayah,
  dataBulanan,
  dataMingguan,
  dataDetailTpp = [],
  role,
  tahunBerjalan,
  bulanBerjalan,
  wilayahParam,
}: TppClientProps) {
  const [selectedWilayah, setSelectedWilayah] = useState<string>(wilayahParam || "semua");
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("mingguan");
  const [bulanAnalisis, setBulanAnalisis] = useState<number>(bulanBerjalan);
  const [chartData, setChartData] = useState<any[]>([]);

  // 1. OLAH DATA CHART (Sama seperti sebelumnya)
  useEffect(() => {
    const sumberData = granularitas === "bulanan" ? dataBulanan : dataMingguan;
    const kolomPeriode = granularitas === "bulanan" ? "bulan" : "minggu";

    const filtered = sumberData.filter(
      (d) => selectedWilayah === "semua" || d.wilayah_kerja === selectedWilayah
    );

    const peta = new Map<number, any>();

    filtered.forEach((item) => {
      const urutan = item[kolomPeriode];
      if (urutan === undefined || urutan === null) return;

      const label = granularitas === "bulanan" 
        ? NAMA_BULAN[urutan - 1] || `Bln-${urutan}` 
        : `Mg-${urutan}`;
      
      const existing = peta.get(urutan) ?? {
        name: label,
        label: label,
        minggu: label,
        bulan: label,
        urutan: urutan,
        jumlah_tpp_diperiksa: 0,
        total_sampel: 0,
        jumlah_ms: 0,
        jumlah_tms: 0,
        ikl_ms: 0, 
        ikl_tms: 0,
        ms_formaldehyde: 0, tms_formaldehyde: 0,
        ms_borax: 0, tms_borax: 0,
        ms_metyl_yellow: 0, tms_metyl_yellow: 0,
        ms_rodamin_b: 0, tms_rodamin_b: 0,
        ms_bakteriologis: 0, tms_bakteriologis: 0,
        ms_hy_rise: 0, tms_hy_rise: 0,
      };

      existing.jumlah_tpp_diperiksa += Number(item.jumlah_tpp_diperiksa || 1);
      existing.total_sampel += Number(item.jumlah_sampel || item.total_sampel || 1);

      const iklVal = item.ikl_ms || item.ikl || item.status_ikl;
      if (isMsText(iklVal)) existing.ikl_ms += 1;
      if (isTmsText(iklVal)) existing.ikl_tms += 1;

      PARAMETER_LAB.forEach((p) => {
        const val = item[p] || item[`ms_${p}`] || item[`${p}_ms`];
        const msKey = `ms_${p}`;
        const tmsKey = `tms_${p}`;

        if (isMsText(val)) {
          existing[msKey] += 1;
        } else if (isTmsText(val)) {
          existing[tmsKey] += 1;
        } else {
          existing[msKey] += Number(item[msKey] || item[`${p}_ms`] || 0);
          existing[tmsKey] += Number(item[tmsKey] || item[`${p}_tms`] || 0);
        }
      });

      const totalMsBaris = 
        (isMsText(iklVal) ? 1 : 0) +
        PARAMETER_LAB.reduce((acc, p) => acc + (isMsText(item[p]) ? 1 : 0), 0);
      
      const totalTmsBaris = 
        (isTmsText(iklVal) ? 1 : 0) +
        PARAMETER_LAB.reduce((acc, p) => acc + (isTmsText(item[p]) ? 1 : 0), 0);

      existing.jumlah_ms += Number(item.jumlah_ms || totalMsBaris);
      existing.jumlah_tms += Number(item.jumlah_tms || totalTmsBaris);

      peta.set(urutan, existing);
    });

    setChartData(Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan));
  }, [selectedWilayah, granularitas, dataBulanan, dataMingguan]);

  const tipeChartAktif = granularitas === "mingguan" ? "line" : "bar";

  const seriesTms: SeriesChecklist[] = [
    { key: "ikl_tms", label: "IKL - TMS", warna: "#B71C1C" },
    { key: "tms_formaldehyde", label: "Formaldehyde - TMS", warna: "#E65100" },
    { key: "tms_borax", label: "Borax - TMS", warna: "#7C3AED" },
    { key: "tms_metyl_yellow", label: "Metyl Yellow - TMS", warna: "#1B5E20" },
    { key: "tms_rodamin_b", label: "Rodamin B - TMS", warna: "#C2185B" },
    { key: "tms_bakteriologis", label: "Bakteriologis - TMS", warna: "#006064" },
    { key: "tms_hy_rise", label: "Hy-Rise - TMS", warna: "#5D4037" },
  ];

  const seriesMs: SeriesChecklist[] = [
    { key: "ikl_ms", label: "IKL - MS", warna: "#2E7D32" },
    { key: "ms_formaldehyde", label: "Formaldehyde - MS", warna: "#0288D1" },
    { key: "ms_borax", label: "Borax - MS", warna: "#8E24AA" },
    { key: "ms_metyl_yellow", label: "Metyl Yellow - MS", warna: "#43A047" },
    { key: "ms_rodamin_b", label: "Rodamin B - MS", warna: "#D81B60" },
    { key: "ms_bakteriologis", label: "Bakteriologis - MS", warna: "#0097A7" },
    { key: "ms_hy_rise", label: "Hy-Rise - MS", warna: "#6D4C41" },
  ];

  const periodeKey = `${tahunBerjalan}-${bulanAnalisis}`;
  const adaTms = chartData.some((d) => seriesTms.some((s) => Number(d[s.key] || 0) > 0));
  const adaMs = chartData.some((d) => seriesMs.some((s) => Number(d[s.key] || 0) > 0));

  // 2. FILTERING DATA DETAIL UNTUK TABEL TMS
  // Utamakan dataDetailTpp (jika ada), jika tidak ada gunakan data rekap
  const sumberDataDetail = dataDetailTpp.length > 0 
    ? dataDetailTpp 
    : (granularitas === "bulanan" ? dataBulanan : dataMingguan);

  const daftarTmsDetail = sumberDataDetail.filter((item) => {
    const wilayahMatch = selectedWilayah === "semua" || item.wilayah_kerja === selectedWilayah;
    const adaTmsTextParam = PARAMETER_LAB.some((p) => isTmsText(item[p]));
    const adaTmsAngka = Number(item.jumlah_tms || 0) > 0;
    return wilayahMatch && (adaTmsTextParam || adaTmsAngka || isTmsText(item.ikl) || isTmsText(item.status_ikl));
  });

  return (
    <div className="space-y-6">
      {/* HEADER & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans TPP</h1>
          <p className="text-xs text-gray-500 mt-1">
            Pengawasan Sanitasi Tempat Pengelolaan Pangan Tahun {tahunBerjalan}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setGranularitas("mingguan")}
              className={`rounded-md px-3 py-1.5 transition-all ${
                granularitas === "mingguan" 
                  ? "bg-[#0F4C5C] text-white shadow-xs" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Mingguan
            </button>
            <button
              type="button"
              onClick={() => setGranularitas("bulanan")}
              className={`rounded-md px-3 py-1.5 transition-all ${
                granularitas === "bulanan" 
                  ? "bg-[#0F4C5C] text-white shadow-xs" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Bulanan
            </button>
          </div>

          <select
            value={selectedWilayah}
            onChange={(e) => setSelectedWilayah(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden"
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
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden"
          >
            {NAMA_BULAN.map((nama, idx) => (
              <option key={nama} value={idx + 1}>
                {nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BODY DASBOR */}
      {chartData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Data surveilans TPP periode {granularitas} untuk tahun {tahunBerjalan} belum tersedia.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* GRAFIK 1: OVERVIEW MS vs TMS */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>📈</span> Kepatuhan TPP — Memenuhi Syarat (MS) vs Tidak Memenuhi Syarat (TMS) [{granularitas}]
            </h3>
            <TrenChartLine
              data={chartData}
              tipeChart={tipeChartAktif}
              seriesList={[
                { key: "jumlah_ms", label: "Memenuhi Syarat (MS)", warna: "#1B5E20" },
                { key: "jumlah_tms", label: "Tidak Memenuhi Syarat (TMS)", warna: "#B71C1C" },
              ]}
            />
          </div>

          {/* GRAFIK 2: VOLUME PEMERIKSAAN */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>🧪</span> Total TPP Diperiksa & Total Sampel Laboratorium [{granularitas}]
            </h3>
            <TrenChartLine
              data={chartData}
              tipeChart={tipeChartAktif}
              seriesList={[
                { key: "jumlah_tpp_diperiksa", label: "TPP Diperiksa", warna: "#0F4C5C" },
                { key: "total_sampel", label: "Total Sampel Diuji", warna: "#00838F" },
              ]}
            />
          </div>

          {/* GRAFIK 3: BREAKDOWN TMS */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>⚠️</span> Breakdown Komponen Tidak Memenuhi Syarat (TMS) — {granularitas}
            </h3>
            {adaTms ? (
              <TrenChecklistMingguan
                data={chartData}
                seriesList={seriesTms}
                maxAktifDefault={3}
                variant={tipeChartAktif}
              />
            ) : (
              <div className="rounded-lg bg-green-50 p-6 text-center text-xs font-semibold text-green-700 border border-green-200">
                ✅ Nihil temuan parameter Tidak Memenuhi Syarat (TMS) pada periode terfilter.
              </div>
            )}
          </div>

          {/* GRAFIK 4: BREAKDOWN MS */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>✅</span> Breakdown Komponen Memenuhi Syarat (MS) — {granularitas}
            </h3>
            {adaMs ? (
              <TrenChecklistMingguan
                data={chartData}
                seriesList={seriesMs}
                maxAktifDefault={3}
                variant={tipeChartAktif}
              />
            ) : (
              <div className="rounded-lg bg-gray-50 p-6 text-center text-xs font-semibold text-gray-500 border border-gray-200">
                Data komponen Memenuhi Syarat (MS) belum tercatat untuk periode ini.
              </div>
            )}
          </div>

          {/* ANALISIS & PREDIKSI AI */}
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

          {/* SATU-SATUNYA TABEL: DAFTAR TPP TIDAK MEMENUHI SYARAT (TMS) */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-red-100 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                  <span>🚨</span> Daftar Fasilitas TPP Tidak Memenuhi Syarat (TMS)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Rincian fasilitas TPP yang teridentifikasi mengandung bahan berbahaya atau gagal pengujian sanitasi.
                </p>
              </div>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                {daftarTmsDetail.length} TPP Terdeteksi TMS
              </span>
            </div>

            {daftarTmsDetail.length === 0 ? (
              <div className="rounded-lg bg-green-50 p-6 text-center text-xs font-medium text-green-700 border border-green-100">
                🎉 Tidak ada fasilitas TPP yang teridentifikasi TMS pada kriteria terfilter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-red-50/50 text-xs font-semibold uppercase text-red-900 border-b border-red-100">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Nama Tempat Usaha / TPP</th>
                      <th className="px-4 py-3">Wilayah Kerja</th>
                      <th className="px-4 py-3">Periode / Tanggal</th>
                      <th className="px-4 py-3 text-center">Status Total</th>
                      <th className="px-4 py-3">Parameter Terbukti TMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {daftarTmsDetail.map((item, idx) => {
                      // Format Waktu: Jika data raw detail ada tanggal_kegiatan, tampilkan tanggal. 
                      // Jika data rekap, tampilkan bulan/minggu.
                      const periodeText = item.tanggal_kegiatan 
                        ? item.tanggal_kegiatan
                        : granularitas === "bulanan"
                          ? NAMA_BULAN[item.bulan - 1] || `Bulan ${item.bulan}`
                          : `Minggu ke-${item.minggu}`;

                      // Dapatkan nama TPP spesifik
                      const namaTppSpesifik = 
                        item.nama_tpp || 
                        item.nama_tempat_usaha || 
                        item.nama_fasilitas || 
                        `TPP Wilayah ${item.wilayah_kerja || ""}`;

                      // Deteksi parameter TMS
                      const temuanTms: string[] = [];
                      if (isTmsText(item.ikl) || isTmsText(item.status_ikl)) temuanTms.push("IKL TMS");

                      PARAMETER_LAB.forEach((p) => {
                        if (isTmsText(item[p]) || isTmsText(item[`tms_${p}`])) {
                          const namaLabel = p.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
                          temuanTms.push(namaLabel);
                        }
                      });

                      return (
                        <tr key={idx} className="hover:bg-red-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {namaTppSpesifik}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {item.wilayah_kerja || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{periodeText}</td>
                          <td className="px-4 py-3 text-center font-bold text-red-600">
                            {item.jumlah_tms || temuanTms.length || 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {temuanTms.length > 0 ? (
                                temuanTms.map((t, i) => (
                                  <span
                                    key={i}
                                    className="inline-block rounded-md bg-red-100 px-2 py-0.5 text-2xs font-semibold text-red-700"
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 text-2xs font-semibold text-red-700">
                                  TMS (Terverifikasi)
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}