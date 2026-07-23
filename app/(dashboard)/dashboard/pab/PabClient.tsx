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

const KOLOM_ANGKA = [
  "jumlah_pemeriksaan", 
  "total_pab_diperiksa", 
  "jumlah_ms", 
  "jumlah_tms",
  "tms_fisik", 
  "tms_kimia", 
  "tms_bakteriologis",
] as const;

// Helper pengecekan teks TMS
const isTmsText = (val: any): boolean => {
  if (!val) return false;
  const str = String(val).trim().toLowerCase();
  return str === "tms" || str === "tidak memenuhi syarat";
};

// Helper pengecekan teks MS
const isMsText = (val: any): boolean => {
  if (!val) return false;
  const str = String(val).trim().toLowerCase();
  return str === "ms" || str === "memenuhi syarat";
};

type PabClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  dataMingguan: any[];
  dataTmsDetail?: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  tahunEpidBerjalan: number;   // <-- TAMBAH: dipakai saat granularitas mingguan
  mingguEpidBerjalan: number;  // <-- TAMBAH: dipakai saat granularitas mingguan
  wilayahParam?: string;
};

export default function PabClient({
  daftarWilayah,
  dataBulanan,
  dataMingguan,
  dataTmsDetail = [],
  role,
  tahunBerjalan,
  bulanBerjalan,
  tahunEpidBerjalan,
  mingguEpidBerjalan,
  wilayahParam,
}: PabClientProps) {
  const [selectedWilayah, setSelectedWilayah] = useState<string>(wilayahParam || "semua");
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("bulanan");
  const [bulanAnalisis, setBulanAnalisis] = useState<number>(bulanBerjalan);

  // State Filter Rentang Minggu & Bulan
  const [mingguAwal, setMingguAwal] = useState<number>(1);
  const [mingguAkhir, setMingguAkhir] = useState<number>(52);
  const [appliedMingguAwal, setAppliedMingguAwal] = useState<number>(1);
  const [appliedMingguAkhir, setAppliedMingguAkhir] = useState<number>(52);

  const [bulanAwal, setBulanAwal] = useState<number>(1);
  const [bulanAkhir, setBulanAkhir] = useState<number>(12);
  const [appliedBulanAwal, setAppliedBulanAwal] = useState<number>(1);
  const [appliedBulanAkhir, setAppliedBulanAkhir] = useState<number>(12);

  const [chartData, setChartData] = useState<any[]>([]);

  // Terapkan Filter Rentang
  const handleTerapkanFilter = () => {
    if (granularitas === "mingguan") {
      setAppliedMingguAwal(mingguAwal);
      setAppliedMingguAkhir(mingguAkhir);
    } else {
      setAppliedBulanAwal(bulanAwal);
      setAppliedBulanAkhir(bulanAkhir);
    }
  };

  useEffect(() => {
    const sumberData = granularitas === "bulanan" ? dataBulanan : dataMingguan;

    const filtered = sumberData.filter((d) => {
      const wilayahMatch = selectedWilayah === "semua" || d.wilayah_kerja === selectedWilayah;

      let urutan = granularitas === "bulanan"
        ? Number(d.bulan ?? d.bulan_ke)
        : Number(d.minggu ?? d.minggu_ke);

      if (isNaN(urutan) || urutan <= 0) return false;

      const rentangMatch = granularitas === "bulanan"
        ? urutan >= appliedBulanAwal && urutan <= appliedBulanAkhir
        : urutan >= appliedMingguAwal && urutan <= appliedMingguAkhir;

      return wilayahMatch && rentangMatch;
    });

    const peta = new Map<number, any>();

    filtered.forEach((item) => {
      let urutan = granularitas === "bulanan"
        ? Number(item.bulan ?? item.bulan_ke)
        : Number(item.minggu ?? item.minggu_ke);

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
        jumlah_pemeriksaan: 0,
        total_pab_diperiksa: 0,
        jumlah_ms: 0,
        jumlah_tms: 0,
        tms_fisik: 0,
        tms_kimia: 0,
        tms_bakteriologis: 0,
      };

      // Akumulasi Angka Agregat & Teks Fallback
      existing.jumlah_pemeriksaan += Number(item.jumlah_pemeriksaan || item.total_pemeriksaan || 1);
      existing.total_pab_diperiksa += Number(item.total_pab_diperiksa || item.jumlah_titik || 1);

      // Evaluasi Parameter TMS (Teks maupun Angka)
      if (isTmsText(item.fisik) || Number(item.tms_fisik) > 0) existing.tms_fisik += Number(item.tms_fisik || 1);
      if (isTmsText(item.kimia) || Number(item.tms_kimia) > 0) existing.tms_kimia += Number(item.tms_kimia || 1);
      if (isTmsText(item.bakteriologis) || Number(item.tms_bakteriologis) > 0) existing.tms_bakteriologis += Number(item.tms_bakteriologis || 1);

      // Evaluasi Total MS & TMS
      if (isMsText(item.status) || Number(item.jumlah_ms) > 0) {
        existing.jumlah_ms += Number(item.jumlah_ms || 1);
      }
      if (isTmsText(item.status) || Number(item.jumlah_tms) > 0) {
        existing.jumlah_tms += Number(item.jumlah_tms || 1);
      }

      peta.set(urutan, existing);
    });

    setChartData(Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan));
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

  const seriesTms: SeriesChecklist[] = [
    { key: "tms_fisik", label: "Fisik - TMS", warna: "#E65100" },
    { key: "tms_kimia", label: "Kimia - TMS", warna: "#7C3AED" },
    { key: "tms_bakteriologis", label: "Bakteriologis - TMS", warna: "#B71C1C" },
  ];

  // FIX: periodeKey & konteks sekarang mengikuti granularitas chart.
  // Bulanan tetap pakai dropdown bulanAnalisis (pilihan manual), Mingguan
  // pakai minggu epidemiologi berjalan (sama seperti pola TPP/TTU).
  const konteksAI = granularitas === "bulanan" ? "pab-bulanan" : "pab-mingguan";
  const periodeKey = granularitas === "bulanan"
  ? `${tahunBerjalan}-${appliedBulanAkhir}`
  : `${tahunBerjalan}-W${appliedMingguAkhir}`;

  const tipeChartAktif = granularitas === "bulanan" ? "bar" : "line";

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans PAB</h1>
          <p className="text-sm text-gray-500">
            Pengawasan kualitas Penyediaan Air Bersih — {tahunBerjalan}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switch Granularitas */}
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

          {/* Filter Rentang Minggu / Bulan */}
          {granularitas === "mingguan" ? (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>Mg</span>
              <select
                value={mingguAwal}
                onChange={(e) => setMingguAwal(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span>s/d</span>
              <select
                value={mingguAkhir}
                onChange={(e) => setMingguAkhir(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <select
                value={bulanAwal}
                onChange={(e) => setBulanAwal(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                {NAMA_BULAN.map((b, idx) => (
                  <option key={b} value={idx + 1}>{b}</option>
                ))}
              </select>
              <span>s/d</span>
              <select
                value={bulanAkhir}
                onChange={(e) => setBulanAkhir(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                {NAMA_BULAN.map((b, idx) => (
                  <option key={b} value={idx + 1}>{b}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tombol Terapkan */}
          <button
            onClick={handleTerapkanFilter}
            className="rounded-lg bg-[#0F4C5C] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0c3c49] transition-colors"
          >
            Terapkan
          </button>

          {/* Select Wilayah */}
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

          {/* Select Bulan AI - hanya relevan saat granularitas bulanan */}
          {granularitas === "bulanan" && (
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
          )}
        </div>
      </div>

      {/* DASHBOARD GRAFIK */}
      {chartData.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
          Belum ada data PAB {granularitas} untuk rentang terpilih pada tahun {tahunBerjalan}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 1: MS vs TMS */}
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Kepatuhan PAB — Memenuhi Syarat vs Tidak Memenuhi Syarat ({granularitas})
            </h3>
            <TrenChartLine
              data={chartData}
              tipeChart={tipeChartAktif}
              seriesList={[
                { key: "jumlah_ms", label: "Memenuhi Syarat", warna: "#1B5E20" },
                { key: "jumlah_tms", label: "Tidak Memenuhi Syarat", warna: "#B71C1C" },
              ]}
            />
          </div>

          {/* Chart 2: Jumlah Pemeriksaan vs Titik PAB */}
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Jumlah Pemeriksaan & Titik PAB Diperiksa ({granularitas})
            </h3>
            <TrenChartLine
              data={chartData}
              tipeChart={tipeChartAktif}
              seriesList={[
                { key: "jumlah_pemeriksaan", label: "Jumlah Pemeriksaan", warna: "#0F4C5C" },
                { key: "total_pab_diperiksa", label: "Titik PAB Diperiksa", warna: "#00838F" },
              ]}
            />
          </div>

          {/* Chart 3: Breakdown Parameter TMS */}
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Breakdown Parameter Tidak Memenuhi Syarat (TMS) — {granularitas}
            </h3>
            <TrenChecklistMingguan 
              data={chartData} 
              seriesList={seriesTms} 
              maxAktifDefault={3} 
              variant={tipeChartAktif} 
            />
          </div>

          {/* AI Box */}
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
          {/* TABEL DETAIL PAB TMS */}
          <div className="rounded-xl bg-white p-5 shadow-xs border border-red-100 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                  <span>🚨</span> Daftar PAB Tidak Memenuhi Syarat
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Rincian titik Penyediaan Air Bersih yang teridentifikasi tidak memenuhi syarat.
                </p>
              </div>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                {dataTmsDetail.length} Titik TMS
              </span>
            </div>

            {dataTmsDetail.length === 0 ? (
              <div className="rounded-lg bg-green-50 p-6 text-center text-xs font-medium text-green-700 border border-green-100">
                🎉 Tidak ada titik PAB yang teridentifikasi TMS pada periode ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-red-50/50 text-xs font-semibold uppercase text-red-900 border-b border-red-100">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Nama PAB</th>
                      <th className="px-4 py-3">Wilker</th>
                      <th className="px-4 py-3 text-center">Fisik</th>
                      <th className="px-4 py-3 text-center">Kimia</th>
                      <th className="px-4 py-3 text-center">Bakteriologis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dataTmsDetail.map((item) => (
                      <tr key={item.id} className="hover:bg-red-50/40 transition-colors">
                        <td className="px-4 py-3">{item.tanggal}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.nama_ttu}</td>
                        <td className="px-4 py-3">{item.wilayah_kerja}</td>
                        <td className="px-4 py-3 text-center">
                          {isTmsText(item.fisik) ? (
                            <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 text-2xs font-semibold text-red-700">TMS</span>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isTmsText(item.kimia) ? (
                            <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 text-2xs font-semibold text-red-700">TMS</span>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isTmsText(item.bakteriologis) ? (
                            <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 text-2xs font-semibold text-red-700">TMS</span>
                          ) : "-"}
                        </td>
                      </tr>
                    ))}
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