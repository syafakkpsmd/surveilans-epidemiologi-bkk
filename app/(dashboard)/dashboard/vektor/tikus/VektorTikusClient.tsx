"use client";

import { useEffect, useState } from "react";
import FilterZonaSubLokasi from "@/components/vektor/FilterZonaSubLokasi";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { TombolAnalisisAI } from "@/components/TombolAnalisisAI";
import { PeranUser } from "@/types/database.types";

type WilkerRef = { kode: string; nama: string };
type VektorTikusClientProps = {
  daftarWilker: WilkerRef[];
  dataMingguan: any[];
  dataBulanan: any[];
  role: string;
  tahunBerjalan: number;
  mingguBerjalan: number;
  wilkerParam?: string;
};

export default function VektorTikusClient({
  daftarWilker,
  dataMingguan,
  dataBulanan,
  role,
  tahunBerjalan,
  mingguBerjalan,
  wilkerParam,
}: VektorTikusClientProps) {
  const [selectedWilker, setSelectedWilker] = useState<string>(wilkerParam || "semua");
  const [periodeType, setPeriodeType] = useState<"mingguan" | "bulanan">("mingguan");
  const [chartData, setChartData] = useState<any[]>([]);

  const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  useEffect(() => {
    // 1. Pilih dataset sesuai toggle periode, lalu filter berdasarkan wilayah kerja
    const sumberData = periodeType === "mingguan" ? dataMingguan : dataBulanan;
    const filtered = sumberData.filter(
      (d) => selectedWilker === "semua" || d.kode_wilker === selectedWilker
    );

    const kelompokData: { [key: string]: any } = {};

    // 2. Lakukan agregasi data dari database Supabase
    filtered.forEach((item) => {
      const keyWaktu =
        periodeType === "mingguan"
          ? `Mg-${item.minggu_epid || 0}`
          : namaBulan[item.bulan - 1] || `Bln-${item.bulan}`;

      if (!kelompokData[keyWaktu]) {
        kelompokData[keyWaktu] = {
          name: keyWaktu,
          diperiksa: 0,
          tertangkap: 0,
          RT: 0,
          RN: 0, // Dipetakan ke kolom 'rn' (Rattus norvegicus)
          MM: 0,
          Lainnya: 0,
          akumulasiTsi: 0,
          akumulasiPinjal: 0,
          hitung: 0,
        };
      }

      const g = kelompokData[keyWaktu];

      // Agregasi indikator perangkap dan indeks pinjal
      g.diperiksa += Number(item.jml_trap_dipasang || 0);
      g.tertangkap += Number(item.jml_trap_tertangkap || 0);
      g.akumulasiTsi += Number(item.tsi || 0);
      g.akumulasiPinjal += Number(item.index_pinjal || 0);
      g.hitung += 1;

      // Akumulasi kuantitas spesies tikus
      g.RT += Number(item.rt || 0);
      g.RN += Number(item.rn || 0);
      g.MM += Number(item.mm || 0);
      g.Lainnya += Number(item.jenis_lainnya || 0);
    });

    // 3. Transformasikan hasil akumulasi ke format array ChartData
    const hasil = Object.values(kelompokData).map((g: any) => ({
      name: g.name,
      RT: g.RT,
      RN: g.RN,
      MM: g.MM,
      Lainnya: g.Lainnya,
      diperiksa: g.diperiksa,
      tertangkap: g.tertangkap,
      tsi: g.hitung > 0 ? parseFloat((g.akumulasiTsi / g.hitung).toFixed(2)) : 0,
      index_pinjal: g.hitung > 0 ? parseFloat((g.akumulasiPinjal / g.hitung).toFixed(2)) : 0,
    }));

    setChartData(hasil);
  }, [selectedWilker, periodeType, dataMingguan, dataBulanan]);

  return (
    <div className="space-y-6">
      {/* Bagian Header dan Kontrol Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Vektor Tikus</h1>
          <p className="text-sm text-gray-500">Dashboard Manajemen Distribusi Surveilans Tikus.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Periode */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setPeriodeType("mingguan")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                periodeType === "mingguan" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setPeriodeType("bulanan")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                periodeType === "bulanan" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
              }`}
            >
              Bulanan
            </button>
          </div>

          {/* Dropdown Wilayah Kerja */}
          <select
            value={selectedWilker}
            onChange={(e) => setSelectedWilker(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-hidden"
          >
            <option value="semua">Semua Wilayah Kerja</option>
            {daftarWilker.map((w) => (
              <option key={w.kode} value={w.kode}>{w.nama}</option>
            ))}
          </select>

          <FilterZonaSubLokasi />

          <TombolAnalisisAI
            sudahLogin={true}
            role={role as PeranUser}
            konteks={`vektor-tikus-${periodeType}`}
            periodeKey={`${tahunBerjalan}-${mingguBerjalan}`}
            wilayahKerja={selectedWilker !== "semua" ? selectedWilker : undefined}
          />
        </div>
      </div>

      {/* Tampilan Kondisional Grafik */}
      {chartData.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
          Tidak ditemukan kecocokan data transaksi surveilans.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 1. Grafik Tren Distribusi Spesies */}
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Grafik Distribusi Spesies Tikus</h3>
            <TrenChartLine
              data={chartData}
              tipeChart={periodeType === "bulanan" ? "bar" : "line"}
              seriesList={[
                { key: "RT", label: "Rattus tanezumi (RT)", warna: "#4E342E" },
                { key: "RN", label: "Rattus norvegicus (RN)", warna: "#8D6E63" },
                { key: "MM", label: "Mus musculus (MM)", warna: "#602712" },
                { key: "Lainnya", label: "Lainnya", warna: "#f7a0a0" },
              ]}
            />
          </div>

          {/* 2. Grafik Total Perangkap Dipasang */}
          <div className="rounded-xl bg-white p-4 shadow-xs">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Total Tikus Diperiksa (Trap Dipasang)</h3>
            <TrenChartLine
              data={chartData}
              tipeChart={periodeType === "bulanan" ? "bar" : "line"}
              seriesList={[{ key: "diperiksa", label: "Jumlah Diperiksa", warna: "#006064" }]}
            />
          </div>

          {/* 3. Grafik Indikator Kunci (Kepadatan & Faktor Risiko) */}
          <div className="rounded-xl bg-white p-4 shadow-xs">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Kunci Indikator (Tertangkap, TSI, Pinjal)</h3>
            <TrenChartLine
              data={chartData}
              tipeChart={periodeType === "bulanan" ? "bar" : "line"}
              seriesList={[
                { key: "tertangkap", label: "Tertangkap", warna: "#B71C1C" },
                { key: "tsi", label: "TSI (%)", warna: "#E65100" },
                { key: "index_pinjal", label: "Index Pinjal", warna: "#1B5E20" },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}