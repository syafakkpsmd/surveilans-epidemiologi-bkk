"use client";

import { useMemo, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";
import type { HasilAIStruktur } from "@/lib/ai/hasilAiTypes";

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

// Array 1 sampai 52 untuk pilihan minggu
const DAFTAR_MINGGU = Array.from({ length: 52 }, (_, i) => i + 1);

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

interface HasilAwalInisial {
  comboKeyDasar: string;
  analisis: HasilAIStruktur | null;
  prediksi: HasilAIStruktur | null;
}

type TtuClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  dataMingguan: any[];
  dataDetailTtu?: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  tahunEpidBerjalan: number;
  mingguEpidBerjalan: number;
  wilayahParam?: string;
  hasilAwalInisial?: HasilAwalInisial | null;
  /** Tombol aksi di header (mis. Input/Unggah Data); dibuat di page.tsx server. */
  aksiHeader?: React.ReactNode;
};

// Helper untuk mengecek status TMS
const isTmsVal = (val: any): boolean => {
  if (!val) return false;
  if (typeof val === "string") {
    const v = val.trim().toLowerCase();
    return v === "tidak memenuhi syarat" || v === "tms";
  }
  return Number(val) > 0;
};

function bangunComboKeyDasar(konteks: string, periodeKey: string, wilayahKerja?: string): string {
  return `${konteks}|${periodeKey}|${wilayahKerja ?? ""}`;
}

export default function TtuClient({
  daftarWilayah,
  dataBulanan,
  dataMingguan,
  dataDetailTtu = [],
  role,
  tahunBerjalan,
  bulanBerjalan,
  wilayahParam,
  hasilAwalInisial,
  aksiHeader,
}: TtuClientProps) {
  const [selectedWilayah, setSelectedWilayah] = useState<string>(wilayahParam || "semua");
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("bulanan");

  // State Input Rentang (Temporary sebelum diklik 'Terapkan')
  const [tempBulanAwal, setTempBulanAwal] = useState<number>(1);
  const [tempBulanAkhir, setTempBulanAkhir] = useState<number>(bulanBerjalan);
  const [tempMingguAwal, setTempMingguAwal] = useState<number>(1);
  const [tempMingguAkhir, setTempMingguAkhir] = useState<number>(52);

  // State Rentang Aktif (Setelah diklik 'Terapkan')
  const [rentangBulan, setRentangBulan] = useState<{ awal: number; akhir: number }>({
    awal: 1,
    akhir: bulanBerjalan,
  });
  const [rentangMinggu, setRentangMinggu] = useState<{ awal: number; akhir: number }>({
    awal: 1,
    akhir: 52,
  });

  // Handler saat tombol "Terapkan" diklik
  const handleTerapkanRentang = () => {
    if (granularitas === "bulanan") {
      let awal = tempBulanAwal;
      let akhir = tempBulanAkhir;
      if (awal > akhir) [awal, akhir] = [akhir, awal];
      setRentangBulan({ awal, akhir });
    } else {
      let awal = tempMingguAwal;
      let akhir = tempMingguAkhir;
      if (awal > akhir) [awal, akhir] = [akhir, awal];
      setRentangMinggu({ awal, akhir });
    }
  };

  // 1. OLAH DATA UNTUK GRAFIK BERDASARKAN RENTANG TERAPKAN
  const chartData = useMemo(() => {
    const sumberData = granularitas === "bulanan" ? dataBulanan : dataMingguan;
    const kolomPeriode = granularitas === "bulanan" ? "bulan" : "minggu";

    const batasAwal = granularitas === "bulanan" ? rentangBulan.awal : rentangMinggu.awal;
    const batasAkhir = granularitas === "bulanan" ? rentangBulan.akhir : rentangMinggu.akhir;

    const filtered = sumberData.filter((d) => {
      const wilayahMatch = selectedWilayah === "semua" || d.wilayah_kerja === selectedWilayah;
      const urutan = Number(d[kolomPeriode]);
      const periodeMatch = urutan >= batasAwal && urutan <= batasAkhir;
      return wilayahMatch && periodeMatch;
    });

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

      KOMPONEN_TTU.forEach((k) => {
        if (existing[`ms_${k.id}`] === undefined) existing[`ms_${k.id}`] = 0;
        if (existing[`tms_${k.id}`] === undefined) existing[`tms_${k.id}`] = 0;
      });

      existing.jumlah_diperiksa += Number(item.jumlah_diperiksa || 0);
      existing.jumlah_ms += Number(item.jumlah_ms || 0);
      existing.jumlah_tms += Number(item.jumlah_tms || 0);

      KOMPONEN_TTU.forEach((k) => {
        const valMs = item[`ms_${k.id}`] ?? item[k.id];
        const valTms = item[`tms_${k.id}`];

        if (valMs !== undefined) existing[`ms_${k.id}`] += Number(valMs || 0);
        if (valTms !== undefined) existing[`tms_${k.id}`] += Number(valTms || 0);
      });

      peta.set(urutan, existing);
    });

    return Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan);
  }, [selectedWilayah, granularitas, rentangBulan, rentangMinggu, dataBulanan, dataMingguan]);

  const tipeChartAktif = granularitas === "mingguan" ? "line" : "bar";

  // Format Periode Key untuk AI
  const periodeKey = granularitas === "bulanan"
  ? `${tahunBerjalan}-${rentangBulan.akhir}`
  : `${tahunBerjalan}-W${rentangMinggu.akhir}`;

  const konteksAI = granularitas === "bulanan" ? "ttu-bulanan" : "ttu-mingguan";
  const wilayahKerjaAktif = selectedWilayah !== "semua" ? selectedWilayah : undefined;

  const comboKeyAktif = bangunComboKeyDasar(konteksAI, periodeKey, wilayahKerjaAktif);
  const cocokDenganPrefetch = hasilAwalInisial?.comboKeyDasar === comboKeyAktif;
  const hasilAwalAnalisis = cocokDenganPrefetch ? hasilAwalInisial!.analisis : undefined;
  const hasilAwalPrediksi = cocokDenganPrefetch ? hasilAwalInisial!.prediksi : undefined;

  // 2. FILTER DATA DETAIL UNTUK TABEL TMS
  const daftarTmsDetail = useMemo(() => {
    const sumberDataDetail = dataDetailTtu.length > 0
      ? dataDetailTtu
      : (granularitas === "bulanan" ? dataBulanan : dataMingguan);

    const kolomPeriode = granularitas === "bulanan" ? "bulan" : "minggu";
    const batasAwal = granularitas === "bulanan" ? rentangBulan.awal : rentangMinggu.awal;
    const batasAkhir = granularitas === "bulanan" ? rentangBulan.akhir : rentangMinggu.akhir;

    return sumberDataDetail.filter((item) => {
      const wilayahMatch = selectedWilayah === "semua" || item.wilayah_kerja === selectedWilayah;
      const urutan = Number(item[kolomPeriode]);
      const periodeMatch = !urutan || (urutan >= batasAwal && urutan <= batasAkhir);

      const adaParamTms = KOMPONEN_TTU.some((col) => isTmsVal(item[`tms_${col.id}`]));
      const adaTotalTms = Number(item.jumlah_tms || 0) > 0;
      const statusTms = isTmsVal(item.status) || isTmsVal(item.status_sanitasi);

      return wilayahMatch && periodeMatch && (adaParamTms || adaTotalTms || statusTms);
    });
  }, [
    dataDetailTtu,
    dataBulanan,
    dataMingguan,
    granularitas,
    selectedWilayah,
    rentangBulan,
    rentangMinggu,
  ]);

  return (
    <div className="space-y-6">
      {/* HEADER & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans Sanitasi Tempat Tempat Umum</h1>
          <p className="text-xs text-gray-500 mt-1">
            Pengawasan Sanitasi Tempat-Tempat Umum (TTU) Tahun {tahunBerjalan}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {aksiHeader}

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

          {/* FILTER RENTANG DARI - SAMPAI & TOMBOL TERAPKAN */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-xs">
            {granularitas === "bulanan" ? (
              <>
                <span className="text-gray-500 font-medium pl-1">Dari:</span>
                <select
                  value={tempBulanAwal}
                  onChange={(e) => setTempBulanAwal(parseInt(e.target.value, 10))}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-hidden"
                >
                  {NAMA_BULAN.map((nama, idx) => (
                    <option key={nama} value={idx + 1}>
                      {nama}
                    </option>
                  ))}
                </select>

                <span className="text-gray-500 font-medium">s/d:</span>
                <select
                  value={tempBulanAkhir}
                  onChange={(e) => setTempBulanAkhir(parseInt(e.target.value, 10))}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-hidden"
                >
                  {NAMA_BULAN.map((nama, idx) => (
                    <option key={nama} value={idx + 1}>
                      {nama}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <span className="text-gray-500 font-medium pl-1">Mg:</span>
                <select
                  value={tempMingguAwal}
                  onChange={(e) => setTempMingguAwal(parseInt(e.target.value, 10))}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-hidden"
                >
                  {DAFTAR_MINGGU.map((m) => (
                    <option key={m} value={m}>
                      Mg {m}
                    </option>
                  ))}
                </select>

                <span className="text-gray-500 font-medium">s/d Mg:</span>
                <select
                  value={tempMingguAkhir}
                  onChange={(e) => setTempMingguAkhir(parseInt(e.target.value, 10))}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-hidden"
                >
                  {DAFTAR_MINGGU.map((m) => (
                    <option key={m} value={m}>
                      Mg {m}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              type="button"
              onClick={handleTerapkanRentang}
              className="rounded-md bg-[#0F4C5C] px-3 py-1 font-semibold text-white shadow-xs hover:bg-[#0c3e4b] transition-colors"
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>

      {/* KARTU RINGKASAN STATISTIK */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Diperiksa</p>
            <h4 className="text-2xl font-bold text-[#0F2A38] mt-1">
              {chartData.reduce((acc, curr) => acc + Number(curr.jumlah_diperiksa || 0), 0)}
            </h4>
          </div>
          <div className="rounded-lg bg-teal-50 p-3 text-[#0F4C5C]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
            </svg>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Memenuhi Syarat (MS)</p>
            <h4 className="text-2xl font-bold text-green-700 mt-1">
              {chartData.reduce((acc, curr) => acc + Number(curr.jumlah_ms || 0), 0)}
            </h4>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-green-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Tidak Memenuhi Syarat (TMS)</p>
            <h4 className="text-2xl font-bold text-red-700 mt-1">
              {chartData.reduce((acc, curr) => acc + Number(curr.jumlah_tms || 0), 0)}
            </h4>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-red-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Tingkat Kepatuhan</p>
            <h4 className="text-2xl font-bold text-blue-700 mt-1">
              {(() => {
                const totalMs = chartData.reduce((acc, curr) => acc + Number(curr.jumlah_ms || 0), 0);
                const totalTms = chartData.reduce((acc, curr) => acc + Number(curr.jumlah_tms || 0), 0);
                const total = totalMs + totalTms;
                if (total === 0) return "0%";
                return `${((totalMs / total) * 100).toFixed(1)}%`;
              })()}
            </h4>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* DASHBOARD GRAFIK */}
      {chartData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Data surveilans TTU rentang {granularitas} pilihan Anda untuk tahun {tahunBerjalan} belum tersedia.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* GRAFIK 1: KEPATUHAN UTAMA (MS vs TMS) */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="flex items-center justify-center text-center mb-4 text-sm font-bold text-gray-800 gap-2">
              Distribusi Hasil Pengawasan Tempat-Tempat Umum (TTU) {selectedWilayah !== 'semua' ? ` di ${selectedWilayah}` : ''} Tahun  {tahunBerjalan}
              <br /> ({granularitas})
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

          {/* BOX ANALISIS AI & PREDIKSI AI */}
          <BoxAnalisisAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks={konteksAI}
            periodeKey={periodeKey}
            wilayahKerja={wilayahKerjaAktif}
            hasilAwal={hasilAwalAnalisis}
          />
          <BoxPrediksiAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks={konteksAI}
            periodeKey={periodeKey}
            wilayahKerja={wilayahKerjaAktif}
            hasilAwal={hasilAwalPrediksi}
          />

          {/* TABEL DETAIL FASILITAS TTU TIDAK MEMENUHI SYARAT (TMS) */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-red-100 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                  Distribusi Tempat-Tempat Umum (TTU) Tidak Memenuhi Syarat (TMS) {selectedWilayah !== 'semua' ? ` di ${selectedWilayah}` : ''} Tahun  {tahunBerjalan}
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