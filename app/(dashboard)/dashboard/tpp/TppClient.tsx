"use client";

import { useEffect, useState, useMemo } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Presisi sesuai skema resmi public.tpp di Supabase
const PARAMETER_LAB = [
  "formaldehyde",
  "borax",
  "metyl_yellow",
  "rodamin_b",
  "bakteriologis",
  "hy_rise"
];

type TppClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  dataMingguan: any[];
  dataDetailTpp?: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  tahunEpidBerjalan: number;   // <-- TAMBAH
  mingguEpidBerjalan: number;  // <-- TAMBAH
  wilayahParam?: string;
};

// 1. Helper untuk mengecek apakah data bernilai MS / Memenuhi Syarat
const isMsText = (val: any): boolean => {
  if (!val) return false;
  const str = String(val).trim().toLowerCase();
  return str === "ms" || str === "memenuhi syarat";
};

// 2. Helper untuk mengecek apakah data bernilai TMS / Tidak Memenuhi Syarat
const isTmsText = (val: any): boolean => {
  if (!val) return false;
  const str = String(val).trim().toLowerCase();
  return str === "tms" || str === "tidak memenuhi syarat";
};

// Helper mengekstrak nomor minggu (1-52) dari tanggal YYYY-MM-DD
const getWeekNumber = (dateString: string): number => {
  if (!dateString) return 1;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 1;
  const startDate = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startDate.getDay() + 1) / 7);
};

// Helper mengekstrak nomor bulan (1-12) dari tanggal YYYY-MM-DD
const getMonthNumber = (dateString: string): number => {
  if (!dateString) return 1;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 1;
  return d.getMonth() + 1;
};

export default function TppClient({
  daftarWilayah,
  dataBulanan,
  dataMingguan,
  dataDetailTpp = [],
  role,
  tahunBerjalan,
  bulanBerjalan,
  tahunEpidBerjalan,   // <-- FIX: sebelumnya tidak di-destructure, menyebabkan
  mingguEpidBerjalan,  // <-- FIX: ReferenceError saat dipakai di periodeKey
  wilayahParam,
}: TppClientProps) {
  const [selectedWilayah, setSelectedWilayah] = useState<string>(wilayahParam || "semua");
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("mingguan");

  // ==========================================
  // 1. OPSI MANAJEMEN RENTANG MINGGU & BULAN
  // ==========================================
  const daftarMingguTersedia = useMemo(() => {
    const setMinggu = new Set<number>();
    dataMingguan.forEach((item) => {
      const mg = item.minggu ?? (item.tanggal_kegiatan ? getWeekNumber(item.tanggal_kegiatan) : null);
      if (mg !== null && mg !== undefined) {
        setMinggu.add(Number(mg));
      }
    });
    const list = Array.from(setMinggu).sort((a, b) => a - b);
    if (list.length === 0) {
      for (let i = 1; i <= 52; i++) list.push(i);
    }
    return list;
  }, [dataMingguan]);

  const daftarBulanTersedia = useMemo(() => {
    const setBulan = new Set<number>();
    dataBulanan.forEach((item) => {
      const bln = item.bulan ?? (item.tanggal_kegiatan ? getMonthNumber(item.tanggal_kegiatan) : null);
      if (bln !== null && bln !== undefined) {
        setBulan.add(Number(bln));
      }
    });
    const list = Array.from(setBulan).sort((a, b) => a - b);
    if (list.length === 0) {
      for (let i = 1; i <= 12; i++) list.push(i);
    }
    return list;
  }, [dataBulanan]);

  const minMinggu = daftarMingguTersedia[0] || 1;
  const maxMinggu = daftarMingguTersedia[daftarMingguTersedia.length - 1] || 52;

  // Temporary State Filter
  const [tempMingguAwal, setTempMingguAwal] = useState<number>(minMinggu);
  const [tempMingguAkhir, setTempMingguAkhir] = useState<number>(maxMinggu);

  const [tempBulanAwal, setTempBulanAwal] = useState<number>(1);
  const [tempBulanAkhir, setTempBulanAkhir] = useState<number>(bulanBerjalan || 12);

  // Applied State Filter (Default: Cakup Seluruh Periode)
  const [appliedMingguAwal, setAppliedMingguAwal] = useState<number>(minMinggu);
  const [appliedMingguAkhir, setAppliedMingguAkhir] = useState<number>(maxMinggu);

  const [appliedBulanAwal, setAppliedBulanAwal] = useState<number>(1);
  const [appliedBulanAkhir, setAppliedBulanAkhir] = useState<number>(bulanBerjalan || 12);

  // Sinkronisasi otomatis rentang minggu saat data selesai dimuat
  useEffect(() => {
    if (daftarMingguTersedia.length > 0) {
      const minM = daftarMingguTersedia[0];
      const maxM = daftarMingguTersedia[daftarMingguTersedia.length - 1];
      setTempMingguAwal(minM);
      setTempMingguAkhir(maxM);
      setAppliedMingguAwal(minM);
      setAppliedMingguAkhir(maxM);
    }
  }, [daftarMingguTersedia]);

  const handleApplyFilter = () => {
    if (granularitas === "mingguan") {
      setAppliedMingguAwal(Math.min(tempMingguAwal, tempMingguAkhir));
      setAppliedMingguAkhir(Math.max(tempMingguAwal, tempMingguAkhir));
    } else {
      setAppliedBulanAwal(Math.min(tempBulanAwal, tempBulanAkhir));
      setAppliedBulanAkhir(Math.max(tempBulanAwal, tempBulanAkhir));
    }
  };

  // ==========================================
  // 2. OLAH DATA CHART
  // FIX: diubah dari useEffect+setState (extra render/flicker) ke useMemo
  // ==========================================
  const chartData = useMemo(() => {
    const sumberData = granularitas === "bulanan" ? dataBulanan : dataMingguan;

    const filtered = sumberData.filter((d) => {
      const wilayahMatch = selectedWilayah === "semua" || d.wilayah_kerja === selectedWilayah;

      let urutan = granularitas === "bulanan"
        ? Number(d.bulan ?? getMonthNumber(d.tanggal_kegiatan))
        : Number(d.minggu ?? getWeekNumber(d.tanggal_kegiatan));

      if (isNaN(urutan) || urutan <= 0) return false;

      const rentangMatch = granularitas === "bulanan"
        ? urutan >= appliedBulanAwal && urutan <= appliedBulanAkhir
        : urutan >= appliedMingguAwal && urutan <= appliedMingguAkhir;

      return wilayahMatch && rentangMatch;
    });

    const peta = new Map<number, any>();

    filtered.forEach((item) => {
      let urutan = granularitas === "bulanan"
        ? Number(item.bulan ?? getMonthNumber(item.tanggal_kegiatan))
        : Number(item.minggu ?? getWeekNumber(item.tanggal_kegiatan));

      if (isNaN(urutan) || urutan <= 0) return;

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
      existing.total_sampel += Number(item.jumlah_sampel || 1);

      // 1. Evaluasi IKL
      const iklVal = item.inspeksi_kesehatan_lingkungan;
      if (isMsText(iklVal)) existing.ikl_ms += 1;
      else if (item.ikl_ms !== undefined && item.ikl_ms !== null) existing.ikl_ms += Number(item.ikl_ms);

      if (isTmsText(iklVal)) existing.ikl_tms += 1;
      else if (item.ikl_tms !== undefined && item.ikl_tms !== null) existing.ikl_tms += Number(item.ikl_tms);

      // 2. Evaluasi Parameter Lab
      PARAMETER_LAB.forEach((p) => {
        const msKey = `ms_${p}`;
        const tmsKey = `tms_${p}`;
        const rawVal = item[p];

        if (isMsText(rawVal)) {
          existing[msKey] += 1;
        } else if (item[msKey] !== undefined && item[msKey] !== null) {
          existing[msKey] += Number(item[msKey]);
        }

        if (isTmsText(rawVal)) {
          existing[tmsKey] += 1;
        } else if (item[tmsKey] !== undefined && item[tmsKey] !== null) {
          existing[tmsKey] += Number(item[tmsKey]);
        }
      });

      // 3. Akumulasi Total MS & TMS
      let hitungMs = isMsText(iklVal) || Number(item.ikl_ms) > 0 ? 1 : 0;
      let hitungTms = isTmsText(iklVal) || Number(item.ikl_tms) > 0 ? 1 : 0;

      PARAMETER_LAB.forEach((p) => {
        const msKey = `ms_${p}`;
        const tmsKey = `tms_${p}`;
        if (isMsText(item[p]) || Number(item[msKey]) > 0) hitungMs += 1;
        if (isTmsText(item[p]) || Number(item[tmsKey]) > 0) hitungTms += 1;
      });

      existing.jumlah_ms += (item.jumlah_ms !== undefined && item.jumlah_ms !== null && Number(item.jumlah_ms) > 0)
        ? Number(item.jumlah_ms)
        : hitungMs;

      existing.jumlah_tms += (item.jumlah_tms !== undefined && item.jumlah_tms !== null && Number(item.jumlah_tms) > 0)
        ? Number(item.jumlah_tms)
        : hitungTms;

      peta.set(urutan, existing);
    });

    return Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan);
  }, [
    selectedWilayah,
    granularitas,
    appliedMingguAwal,
    appliedMingguAkhir,
    appliedBulanAwal,
    appliedBulanAkhir,
    dataBulanan,
    dataMingguan
  ]);

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

  // ==========================================
  // KONTEKS & PERIODE KEY UNTUK AI (FIXED)
  // ==========================================
  const konteksAI = granularitas === "bulanan" ? "tpp-bulanan" : "tpp-mingguan";

  // periodeKey Box AI SELALU periode tunggal berbasis periode berjalan
  // (bulan sekarang / minggu epid sekarang) -- TIDAK ikut rentang filter
  // grafik (appliedMingguAwal/Akhir dkk itu murni untuk tampilan chart).
  const periodeKey = granularitas === "bulanan"
  ? `${tahunBerjalan}-${appliedBulanAkhir}`
  : `${tahunBerjalan}-W${appliedMingguAkhir}`;

  // Check ketersediaan data MS/TMS
  const adaTms = useMemo(() => {
    return chartData.some((d) =>
      Number(d.jumlah_tms || 0) > 0 ||
      seriesTms.some((s) => Number(d[s.key] || 0) > 0)
    );
  }, [chartData]);

  const adaMs = useMemo(() => {
    return chartData.some((d) =>
      Number(d.jumlah_ms || 0) > 0 ||
      seriesMs.some((s) => Number(d[s.key] || 0) > 0)
    );
  }, [chartData]);

  // ==========================================
  // 3. FILTERING DETAIL UNTUK TABEL TMS
  // FIX: dibungkus useMemo supaya tidak dihitung ulang setiap render
  // ==========================================
  const daftarTmsDetail = useMemo(() => {
    const sumberDataDetail = dataDetailTpp.length > 0
      ? dataDetailTpp
      : (granularitas === "bulanan" ? dataBulanan : dataMingguan);

    return sumberDataDetail.filter((item) => {
      const wilayahMatch = selectedWilayah === "semua" || item.wilayah_kerja === selectedWilayah;

      let urutan = granularitas === "bulanan"
        ? Number(item.bulan ?? getMonthNumber(item.tanggal_kegiatan))
        : Number(item.minggu ?? getWeekNumber(item.tanggal_kegiatan));

      let rentangMatch = true;
      if (!isNaN(urutan) && urutan > 0) {
        rentangMatch = granularitas === "bulanan"
          ? urutan >= appliedBulanAwal && urutan <= appliedBulanAkhir
          : urutan >= appliedMingguAwal && urutan <= appliedMingguAkhir;
      }

      const iklVal = item.inspeksi_kesehatan_lingkungan;
      const adaTmsTextParam = PARAMETER_LAB.some((p) => isTmsText(item[p]));
      const adaTmsAngka = Number(item.jumlah_tms || 0) > 0;
      return wilayahMatch && rentangMatch && (adaTmsTextParam || adaTmsAngka || isTmsText(iklVal));
    });
  }, [
    dataDetailTpp,
    dataBulanan,
    dataMingguan,
    granularitas,
    selectedWilayah,
    appliedBulanAwal,
    appliedBulanAkhir,
    appliedMingguAwal,
    appliedMingguAkhir,
  ]);

  return (
    <div className="space-y-6">
      {/* HEADER & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-xs border border-gray-100">
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

          <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-200">
            {granularitas === "mingguan" ? (
              <>
                <div className="flex items-center gap-1 text-xs text-gray-600 pl-1">
                  <span>Mg</span>
                  <select
                    value={tempMingguAwal}
                    onChange={(e) => setTempMingguAwal(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden"
                  >
                    {daftarMingguTersedia.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-gray-400">s/d</span>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span>Mg</span>
                  <select
                    value={tempMingguAkhir}
                    onChange={(e) => setTempMingguAkhir(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden"
                  >
                    {daftarMingguTersedia.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-xs text-gray-600 pl-1">
                  <span>Bln</span>
                  <select
                    value={tempBulanAwal}
                    onChange={(e) => setTempBulanAwal(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden"
                  >
                    {daftarBulanTersedia.map((b) => (
                      <option key={b} value={b}>
                        {NAMA_BULAN[b - 1] || `Bulan ${b}`}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-gray-400">s/d</span>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span>Bln</span>
                  <select
                    value={tempBulanAkhir}
                    onChange={(e) => setTempBulanAkhir(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden"
                  >
                    {daftarBulanTersedia.map((b) => (
                      <option key={b} value={b}>
                        {NAMA_BULAN[b - 1] || `Bulan ${b}`}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={handleApplyFilter}
              className="rounded-md bg-[#0F4C5C] px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#0c3c49] transition-all"
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>

      {/* BODY DASBOR */}
      {chartData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Data surveilans TPP periode {granularitas} untuk tahun {tahunBerjalan} belum tersedia pada rentang terfilter.
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

          {/* ANALISIS & PREDIKSI AI (FIXED DISINI) */}
          <BoxAnalisisAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks={konteksAI}
            periodeKey={periodeKey}
            wilayahKerja={selectedWilayah !== "semua" ? selectedWilayah : undefined}
          />
          <BoxPrediksiAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks={konteksAI}
            periodeKey={periodeKey}
            wilayahKerja={selectedWilayah !== "semua" ? selectedWilayah : undefined}
          />

          {/* TABEL TMS DETAIL */}
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
                      const periodeText = item.tanggal_kegiatan
                        ? item.tanggal_kegiatan
                        : granularitas === "bulanan"
                          ? NAMA_BULAN[(item.bulan || getMonthNumber(item.tanggal_kegiatan)) - 1] || `Bulan ${item.bulan}`
                          : `Minggu ke-${item.minggu || getWeekNumber(item.tanggal_kegiatan)}`;

                      const temuanTms: string[] = [];
                      if (isTmsText(item.inspeksi_kesehatan_lingkungan)) temuanTms.push("IKL TMS");

                      PARAMETER_LAB.forEach((p) => {
                        if (isTmsText(item[p])) {
                          const namaLabel = p.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
                          temuanTms.push(namaLabel);
                        }
                      });

                      return (
                        <tr key={idx} className="hover:bg-red-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {item.nama_tpp || `TPP Wilayah ${item.wilayah_kerja || ""}`}
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