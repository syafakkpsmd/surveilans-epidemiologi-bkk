"use client";

import { useEffect, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

// Daftar Komponen Penilaian TTU
const KOMPONEN_TTU = [
  { id: "lingkungan_luar_halaman", label: "Lingkungan Luar/Halaman", warnaMs: "#2E7D32", warnaTms: "#B71C1C" },
  { id: "ruang_bangunan", label: "Ruang Bangunan", warnaMs: "#1565C0", warnaTms: "#E65100" },
  { id: "penyehatan_air", label: "Penyehatan Air", warnaMs: "#00838F", warnaTms: "#C2185B" },
  { id: "penyehatan_udara_ruang", label: "Penyehatan Udara Ruang", warnaMs: "#00695C", warnaTms: "#D81B60" },
  { id: "pengelolaan_limbah", label: "Pengelolaan Limbah", warnaMs: "#4A148C", warnaTms: "#7C3AED" },
  { id: "pencahayaan", label: "Pencahayaan", warnaMs: "#F57F17", warnaTms: "#8D6E63" },
  { id: "kebisingan", label: "Kebisingan", warnaMs: "#2E7D32", warnaTms: "#1B5E20" },
  { id: "getaran_diruang_kerja", label: "Getaran Ruang Kerja", warnaMs: "#37474F", warnaTms: "#5D4037" },
  { id: "pengendalian_vektor_penyakit", label: "Pengendalian Vektor", warnaMs: "#E65100", warnaTms: "#F57F17" },
  { id: "instalasi", label: "Instalasi", warnaMs: "#283593", warnaTms: "#4527A0" },
  { id: "pemeliharaan_jamban_kamar_mandi", label: "Jamban & Kamar Mandi", warnaMs: "#004D40", warnaTms: "#37474F" },
] as const;

// Membuat susunan series untuk MS dan TMS
const SERIES_MS_TTU: SeriesChecklist[] = KOMPONEN_TTU.map((k) => ({
  key: `ms_${k.id}`,
  label: k.label,
  warna: k.warnaMs,
}));

const SERIES_TMS_TTU: SeriesChecklist[] = KOMPONEN_TTU.map((k) => ({
  key: `tms_${k.id}`,
  label: k.label,
  warna: k.warnaTms,
}));

type TtuClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  dataMingguan: any[];
  dataDetailTtu?: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  wilayahParam?: string;
};

// Helper untuk mengecek status
const isTmsVal = (val: any): boolean => {
  if (!val) return false;
  if (typeof val === "string") {
    const v = val.trim().toLowerCase();
    return v === "tidak memenuhi syarat" || v === "tms";
  }
  return Number(val) > 0;
};

export default function TtuClient({
  daftarWilayah,
  dataBulanan,
  dataMingguan,
  dataDetailTtu = [],
  role,
  tahunBerjalan,
  bulanBerjalan,
  wilayahParam,
}: TtuClientProps) {
  const [selectedWilayah, setSelectedWilayah] = useState<string>(wilayahParam || "semua");
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("bulanan");
  const [bulanAnalisis, setBulanAnalisis] = useState<number>(bulanBerjalan);
  const [chartData, setChartData] = useState<any[]>([]);

  // 1. OLAH DATA UNTUK GRAFIK (MS, TMS, DAN KOMPONEN DETIL)
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
        urutan: urutan,
        jumlah_diperiksa: 0,
        jumlah_ms: 0,
        jumlah_tms: 0,
      };

      // Inisialisasi properti komponen jika belum ada
      KOMPONEN_TTU.forEach((k) => {
        if (existing[`ms_${k.id}`] === undefined) existing[`ms_${k.id}`] = 0;
        if (existing[`tms_${k.id}`] === undefined) existing[`tms_${k.id}`] = 0;
      });

      // Hitung total MS dan TMS dasar
      existing.jumlah_diperiksa += Number(item.jumlah_diperiksa || 0);
      existing.jumlah_ms += Number(item.jumlah_ms || 0);
      existing.jumlah_tms += Number(item.jumlah_tms || 0);

      // Hitung breakdown komponen MS dan TMS
      KOMPONEN_TTU.forEach((k) => {
        // Ambil nilai dari kemungkinan nama kolom
        const valMs = item[`ms_${k.id}`] ?? item[k.id];
        const valTms = item[`tms_${k.id}`];

        if (valMs !== undefined) existing[`ms_${k.id}`] += Number(valMs || 0);
        if (valTms !== undefined) existing[`tms_${k.id}`] += Number(valTms || 0);
      });

      peta.set(urutan, existing);
    });

    setChartData(Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan));
  }, [selectedWilayah, granularitas, dataBulanan, dataMingguan]);

  const tipeChartAktif = granularitas === "mingguan" ? "line" : "bar";
  const periodeKey = `${tahunBerjalan}-${bulanAnalisis}`;

  // 2. FILTER DATA DETAIL UNTUK TABEL TMS
  const sumberDataDetail = dataDetailTtu.length > 0 
    ? dataDetailTtu 
    : (granularitas === "bulanan" ? dataBulanan : dataMingguan);

  const daftarTmsDetail = sumberDataDetail.filter((item) => {
    const wilayahMatch = selectedWilayah === "semua" || item.wilayah_kerja === selectedWilayah;
    const adaParamTms = KOMPONEN_TTU.some((col) => isTmsVal(item[`tms_${col.id}`]));
    const adaTotalTms = Number(item.jumlah_tms || 0) > 0;
    const statusTms = isTmsVal(item.status) || isTmsVal(item.status_sanitasi);
    
    return wilayahMatch && (adaParamTms || adaTotalTms || statusTms);
  });

  return (
    <div className="space-y-6">
      {/* HEADER & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans TTU</h1>
          <p className="text-xs text-gray-500 mt-1">
            Pengawasan Sanitasi Tempat-Tempat Umum (TTU) Tahun {tahunBerjalan}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Switcher Granularitas */}
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

          {/* Selector Wilayah Kerja */}
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

          {/* Selector Bulan AI */}
          <select
            value={bulanAnalisis}
            onChange={(e) => setBulanAnalisis(parseInt(e.target.value, 10))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden"
            title="Bulan Fokus Analisis & Prediksi AI"
          >
            {NAMA_BULAN.map((nama, idx) => (
              <option key={nama} value={idx + 1}>
                {nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DASHBOARD GRAFIK */}
      {chartData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Data surveilans TTU periode {granularitas} untuk tahun {tahunBerjalan} belum tersedia.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* GRAFIK 1: KEPATUHAN UTAMA (MS vs TMS) */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>📈</span> Kepatuhan TTU — Memenuhi Syarat (MS) vs Tidak Memenuhi Syarat (TMS) [{granularitas}]
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

          {/* GRAFIK 2: BREAKDOWN KOMPONEN MEMENUHI SYARAT (MS) */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="mb-4 text-sm font-bold text-green-900 flex items-center gap-2">
              <span>✅</span> Breakdown Komponen Memenuhi Syarat (MS) — {granularitas}
            </h3>
            <TrenChecklistMingguan 
              data={chartData} 
              seriesList={SERIES_MS_TTU} 
              maxAktifDefault={3} 
              variant={tipeChartAktif} 
            />
          </div>

          {/* GRAFIK 3: BREAKDOWN KOMPONEN TIDAK MEMENUHI SYARAT (TMS) */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="mb-4 text-sm font-bold text-red-900 flex items-center gap-2">
              <span>⚠️</span> Breakdown Komponen Tidak Memenuhi Syarat (TMS) — {granularitas}
            </h3>
            <TrenChecklistMingguan 
              data={chartData} 
              seriesList={SERIES_TMS_TTU} 
              maxAktifDefault={3} 
              variant={tipeChartAktif} 
            />
          </div>

          {/* BOX ANALISIS AI & PREDIKSI AI */}
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

          {/* TABEL DETAIL FASILITAS TTU TIDAK MEMENUHI SYARAT (TMS) */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-red-100 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                  <span>🚨</span> Daftar Fasilitas / Tempat Umum (TTU) Tidak Memenuhi Syarat (TMS)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Rincian sarana/fasilitas umum yang tidak memenuhi standar kualitas kesehatan lingkungan.
                </p>
              </div>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                {daftarTmsDetail.length} TTU Terdeteksi TMS
              </span>
            </div>

            {daftarTmsDetail.length === 0 ? (
              <div className="rounded-lg bg-green-50 p-6 text-center text-xs font-medium text-green-700 border border-green-100">
                🎉 Tidak ada fasilitas TTU yang teridentifikasi TMS pada kriteria terfilter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-red-50/50 text-xs font-semibold uppercase text-red-900 border-b border-red-100">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Nama Fasilitas / Tempat Umum</th>
                      <th className="px-4 py-3">Wilayah Kerja</th>
                      <th className="px-4 py-3">Periode / Tanggal</th>
                      <th className="px-4 py-3 text-center">Status Total</th>
                      <th className="px-4 py-3">Komponen Terbukti TMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {daftarTmsDetail.map((item, idx) => {
                      const periodeText = item.tanggal_kegiatan 
                        ? item.tanggal_kegiatan
                        : granularitas === "bulanan"
                          ? NAMA_BULAN[item.bulan - 1] || `Bulan ${item.bulan}`
                          : `Minggu ke-${item.minggu}`;

                      const namaTtuSpesifik = 
                        item.nama_ttu || 
                        item.nama_tempat_umum || 
                        item.nama_fasilitas || 
                        `TTU Wilayah ${item.wilayah_kerja || ""}`;

                      // Temukan komponen yang TMS
                      const temuanTms: string[] = [];
                      KOMPONEN_TTU.forEach((col) => {
                        if (isTmsVal(item[`tms_${col.id}`]) || isTmsVal(item[col.id])) {
                          temuanTms.push(col.label);
                        }
                      });

                      return (
                        <tr key={idx} className="hover:bg-red-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {namaTtuSpesifik}
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
