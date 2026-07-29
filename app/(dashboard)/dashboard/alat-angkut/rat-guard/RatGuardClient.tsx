"use client";

import { useMemo, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";
import { kunciAI, type HasilAIStruktur } from "@/lib/ai/hasilAiTypes";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

const DAFTAR_MINGGU = Array.from({ length: 52 }, (_, i) => i + 1);

type RatGuardClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  dataMingguan: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  tahunEpidBerjalan: number;
  mingguEpidBerjalan: number;
  wilayahParam?: string;
  /**
   * Peta hasil Analisis/Prediksi AI yang sudah diambil di server
   * (lib/ai/getBanyakHasilAI.ts, dipanggil dari page.tsx). Dicari
   * lagi di sini pakai kunciAI() sesuai kombinasi granularitas +
   * rentang + wilayah yang sedang aktif di client.
   */
  hasilAI: Record<string, HasilAIStruktur | null>;
};

export default function RatGuardClient({
  daftarWilayah,
  dataBulanan,
  dataMingguan,
  role,
  tahunBerjalan,
  bulanBerjalan,
  tahunEpidBerjalan,
  mingguEpidBerjalan,
  wilayahParam,
  hasilAI,
}: RatGuardClientProps) {
  const [selectedWilayah, setSelectedWilayah] = useState<string>(wilayahParam || "semua");
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("bulanan");

  const [tempBulanAwal, setTempBulanAwal] = useState<number>(1);
  const [tempBulanAkhir, setTempBulanAkhir] = useState<number>(bulanBerjalan);
  const [tempMingguAwal, setTempMingguAwal] = useState<number>(1);
  const [tempMingguAkhir, setTempMingguAkhir] = useState<number>(52);

  const [rentangBulan, setRentangBulan] = useState<{ awal: number; akhir: number }>({
    awal: 1,
    akhir: bulanBerjalan,
  });
  const [rentangMinggu, setRentangMinggu] = useState<{ awal: number; akhir: number }>({
    awal: 1,
    akhir: 52,
  });

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

  // Agregasi data untuk chart (sum jumlah_kapal/pasang/tidak_pasang, hitung ulang persentase)
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
        jumlah_kapal: 0,
        pasang: 0,
        tidak_pasang: 0,
      };

      existing.jumlah_kapal += Number(item.jumlah_kapal || 0);
      existing.pasang += Number(item.pasang || 0);
      existing.tidak_pasang += Number(item.tidak_pasang || 0);

      peta.set(urutan, existing);
    });

    return Array.from(peta.values())
      .map((d) => ({
        ...d,
        persentase_kepatuhan: d.jumlah_kapal > 0 ? Math.round((d.pasang / d.jumlah_kapal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.urutan - b.urutan);
  }, [selectedWilayah, granularitas, rentangBulan, rentangMinggu, dataBulanan, dataMingguan]);

  const tipeChartAktif = granularitas === "mingguan" ? "line" : "bar";

  const periodeKey = granularitas === "bulanan"
    ? `${tahunBerjalan}-${rentangBulan.akhir}`
    : `${tahunBerjalan}-W${rentangMinggu.akhir}`;

  const konteksAktif = granularitas === "bulanan" ? "rat-guard-bulanan" : "rat-guard-mingguan";
  const wilayahAi = selectedWilayah !== "semua" ? selectedWilayah : undefined;

  // Cari hasil AI yang sudah diprefetch server untuk kombinasi
  // granularitas+rentang+wilayah yang sedang aktif SEKARANG. Kalau
  // kombinasi ini bukan salah satu dari 2 default yang diprefetch
  // page.tsx (mis. user sudah ganti rentang tanggal), key ini tidak
  // ada di peta -> nilainya undefined -> BoxAnalisisAI/BoxPrediksiAI
  // otomatis fetch sendiri untuk kombinasi baru itu.
  const hasilAnalisis = hasilAI[
    kunciAI({ konteks: konteksAktif, periodeKey, tipe: "analisis", wilayahKerja: wilayahAi })
  ];
  const hasilPrediksi = hasilAI[
    kunciAI({ konteks: konteksAktif, periodeKey, tipe: "prediksi", wilayahKerja: wilayahAi })
  ];

  // sudahLogin ditentukan dari ada/tidaknya role (sebelumnya di-hardcode
  // true, yang bikin guest yang belum login malah dikasih pesan "hanya
  // Petugas/Admin" alih-alih ajakan login).
  const sudahLogin = !!role;

  return (
    <div className="space-y-6">
          {/* TOMBOL KEMBALI */}
    <div className="flex justify-end">
      <Link
        href="/dashboard/alat-angkut/"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Dashboard Alat Angkut Kapal
      </Link>
    </div>
      {/* HEADER & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Pengawasan Rat Guard</h1>
          <p className="text-xs text-gray-500 mt-1">
            Pengawasan pemasangan Rat Guard pada kapal Tahun {tahunBerjalan}
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

      {/* DASHBOARD GRAFIK */}
      {chartData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Data pengawasan Rat Guard rentang {granularitas} pilihan Anda untuk tahun {tahunBerjalan} belum tersedia.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="flex items-center justify-center text-center mb-4 text-sm font-bold text-gray-800 gap-2">
              <span>🚢</span> Kepatuhan Pemasangan Rat Guard [{granularitas}]
            </h3>
            <TrenChartLine
              data={chartData}
              tipeChart={tipeChartAktif}
              seriesList={[
                { key: "pasang", label: "Terpasang", warna: "#1B5E20" },
                { key: "tidak_pasang", label: "Tidak Terpasang", warna: "#B71C1C" },
              ]}
            />
          </div>

          <BoxAnalisisAI
            sudahLogin={sudahLogin}
            role={role as PeranUser}
            konteks={konteksAktif}
            periodeKey={periodeKey}
            wilayahKerja={wilayahAi}
            hasilAwal={hasilAnalisis}
          />
          <BoxPrediksiAI
            sudahLogin={sudahLogin}
            role={role as PeranUser}
            konteks={konteksAktif}
            periodeKey={periodeKey}
            wilayahKerja={wilayahAi}
            hasilAwal={hasilPrediksi}
          />
        </div>
      )}
    </div>
  );
}