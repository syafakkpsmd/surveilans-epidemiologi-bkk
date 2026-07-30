"use client";

import { useMemo, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";
import { kunciAI, type HasilAIStruktur } from "@/lib/ai/hasilAiTypes";
import type { TitikGabungan } from "./page";

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const DAFTAR_MINGGU = Array.from({ length: 52 }, (_, i) => i + 1);

type AbkCrewPenumpangClientProps = {
  role: PeranUser | null;
  sudahLogin: boolean;
  tahunEpid: number;
  tahunKalender: number;
  mingguEpidBerjalan: number;
  bulanBerjalan: number;
  mingguanKedatangan: TitikGabungan[];
  bulananKedatangan: TitikGabungan[];
  mingguanKeberangkatan: TitikGabungan[];
  bulananKeberangkatan: TitikGabungan[];
  hasilAI: Record<string, HasilAIStruktur | null>;
};

const WARNA_KOMPONEN = {
  abk_kapal: "#0F4C5C",
  penumpang_kapal: "#2563EB",
  crew_pesawat: "#7C3AED",
  penumpang_pesawat: "#EA580C",
};

export default function AbkCrewPenumpangClient({
  role,
  sudahLogin,
  tahunEpid,
  tahunKalender,
  mingguEpidBerjalan,
  bulanBerjalan,
  mingguanKedatangan,
  bulananKedatangan,
  mingguanKeberangkatan,
  bulananKeberangkatan,
  hasilAI,
}: AbkCrewPenumpangClientProps) {
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("bulanan");

  const [tempBulanAwal, setTempBulanAwal] = useState(1);
  const [tempBulanAkhir, setTempBulanAkhir] = useState(bulanBerjalan);
  const [tempMingguAwal, setTempMingguAwal] = useState(1);
  const [tempMingguAkhir, setTempMingguAkhir] = useState(mingguEpidBerjalan);

  const [rentangBulan, setRentangBulan] = useState({ awal: 1, akhir: bulanBerjalan });
  const [rentangMinggu, setRentangMinggu] = useState({ awal: 1, akhir: mingguEpidBerjalan });

  const handleTerapkan = () => {
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

  const batasAwal = granularitas === "bulanan" ? rentangBulan.awal : rentangMinggu.awal;
  const batasAkhir = granularitas === "bulanan" ? rentangBulan.akhir : rentangMinggu.akhir;

  const filterRentang = (data: TitikGabungan[]) =>
    data.filter((d) => d.urutan >= batasAwal && d.urutan <= batasAkhir);

  const dataKedatangan = useMemo(
    () => filterRentang(granularitas === "bulanan" ? bulananKedatangan : mingguanKedatangan),
    [granularitas, bulananKedatangan, mingguanKedatangan, batasAwal, batasAkhir]
  );
  const dataKeberangkatan = useMemo(
    () => filterRentang(granularitas === "bulanan" ? bulananKeberangkatan : mingguanKeberangkatan),
    [granularitas, bulananKeberangkatan, mingguanKeberangkatan, batasAwal, batasAkhir]
  );

  // Data perbandingan (Section 7): 1 baris per periode, kolomnya
  // total_kedatangan vs total_keberangkatan.
  const dataPerbandingan = useMemo(() => {
    const peta = new Map<number, { urutan: number; name: string; label: string; total_kedatangan: number; total_keberangkatan: number }>();
    dataKedatangan.forEach((d) => {
      const existing = peta.get(d.urutan) ?? { urutan: d.urutan, name: d.name, label: d.label, total_kedatangan: 0, total_keberangkatan: 0 };
      existing.total_kedatangan = d.total;
      peta.set(d.urutan, existing);
    });
    dataKeberangkatan.forEach((d) => {
      const existing = peta.get(d.urutan) ?? { urutan: d.urutan, name: d.name, label: d.label, total_kedatangan: 0, total_keberangkatan: 0 };
      existing.total_keberangkatan = d.total;
      peta.set(d.urutan, existing);
    });
    return Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan);
  }, [dataKedatangan, dataKeberangkatan]);

  const tipeChart = granularitas === "mingguan" ? "line" : "bar";

  const periodeKey =
    granularitas === "bulanan"
      ? `${tahunKalender}-${rentangBulan.akhir}`
      : `${tahunEpid}-W${rentangMinggu.akhir}`;

  const konteksKedatangan = `abk-crew-penumpang-kedatangan-${granularitas}`;
  const konteksKeberangkatan = `abk-crew-penumpang-keberangkatan-${granularitas}`;

  const hasilAnalisisKedatangan = hasilAI[kunciAI({ konteks: konteksKedatangan, periodeKey, tipe: "analisis" })];
  const hasilPrediksiKedatangan = hasilAI[kunciAI({ konteks: konteksKedatangan, periodeKey, tipe: "prediksi" })];
  const hasilAnalisisKeberangkatan = hasilAI[kunciAI({ konteks: konteksKeberangkatan, periodeKey, tipe: "analisis" })];
  const hasilPrediksiKeberangkatan = hasilAI[kunciAI({ konteks: konteksKeberangkatan, periodeKey, tipe: "prediksi" })];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* HEADER & FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Pengawasan Lalu Lintas Orang di BKK Kelas I Samarinda</h1>
          <p className="text-xs text-gray-500 mt-1">
            Gabungan ABK Kapal (Dalam Negeri dan Luar Negeri), Penumpang Kapal dan Crew &amp; Penumpang Pesawat
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setGranularitas("mingguan")}
              className={`rounded-md px-3 py-1.5 transition-all ${
                granularitas === "mingguan" ? "bg-[#0F4C5C] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Mingguan
            </button>
            <button
              type="button"
              onClick={() => setGranularitas("bulanan")}
              className={`rounded-md px-3 py-1.5 transition-all ${
                granularitas === "bulanan" ? "bg-[#0F4C5C] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Bulanan
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-xs">
            {granularitas === "bulanan" ? (
              <>
                <span className="text-gray-500 font-medium pl-1">Dari:</span>
                <select value={tempBulanAwal} onChange={(e) => setTempBulanAwal(parseInt(e.target.value, 10))} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-hidden">
                  {NAMA_BULAN.map((nama, idx) => (
                    <option key={nama} value={idx + 1}>{nama}</option>
                  ))}
                </select>
                <span className="text-gray-500 font-medium">s/d:</span>
                <select value={tempBulanAkhir} onChange={(e) => setTempBulanAkhir(parseInt(e.target.value, 10))} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-hidden">
                  {NAMA_BULAN.map((nama, idx) => (
                    <option key={nama} value={idx + 1}>{nama}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <span className="text-gray-500 font-medium pl-1">Mg:</span>
                <select value={tempMingguAwal} onChange={(e) => setTempMingguAwal(parseInt(e.target.value, 10))} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-hidden">
                  {DAFTAR_MINGGU.map((m) => (
                    <option key={m} value={m}>Mg {m}</option>
                  ))}
                </select>
                <span className="text-gray-500 font-medium">s/d Mg:</span>
                <select value={tempMingguAkhir} onChange={(e) => setTempMingguAkhir(parseInt(e.target.value, 10))} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-hidden">
                  {DAFTAR_MINGGU.map((m) => (
                    <option key={m} value={m}>Mg {m}</option>
                  ))}
                </select>
              </>
            )}
            <button
              type="button"
              onClick={handleTerapkan}
              className="rounded-md bg-[#0F4C5C] px-3 py-1 font-semibold text-white shadow-xs hover:bg-[#0c3e4b] transition-colors"
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>

      {/* ================= KEDATANGAN ================= */}
      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <h2 className="mb-1 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Pengawasan Kedatangan Orang di BKK Kelas I Samarinda Tahun {tahunEpid} <br /> (dalam {granularitas})
        </h2>
        <p className="mb-4 text-center text-xs text-gray-400">
          Total gabungan ABK Kapal dari Luar Negeri + Crew Pesawat + Penumpang Pesawat Datang
        </p>
        {dataKedatangan.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Belum ada data untuk rentang ini.</p>
        ) : (
          <TrenChartLine
            data={dataKedatangan}
            tipeChart={tipeChart}
            tampilkanNilai={granularitas === "bulanan"}
            seriesList={[{ key: "total", label: "Total Kedatangan", warna: "#0F4C5C" }]}
          />
        )}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Pengawasan Lalu Lintas Orang yang Datang ke Wilayah Kerja BKK Kelas I Samarinda Tahun {tahunEpid} <br /> (dalam {granularitas})
        </h2>
        {dataKedatangan.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Belum ada data untuk rentang ini.</p>
        ) : (
          <TrenChartLine
            data={dataKedatangan}
            tipeChart={tipeChart}
            seriesList={[
              { key: "abk_kapal", label: "ABK Kapal", warna: WARNA_KOMPONEN.abk_kapal },
              { key: "penumpang_kapal", label: "Penumpang Kapal", warna: WARNA_KOMPONEN.penumpang_kapal },
              { key: "crew_pesawat", label: "Crew Pesawat", warna: WARNA_KOMPONEN.crew_pesawat },
              { key: "penumpang_pesawat", label: "Penumpang Pesawat", warna: WARNA_KOMPONEN.penumpang_pesawat },
            ]}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <BoxAnalisisAI
          sudahLogin={sudahLogin}
          role={role}
          konteks={konteksKedatangan}
          periodeKey={periodeKey}
          wajibWilayahKerja={false}
          hasilAwal={hasilAnalisisKedatangan}
        />
        <BoxPrediksiAI
          sudahLogin={sudahLogin}
          role={role}
          konteks={konteksKedatangan}
          periodeKey={periodeKey}
          wajibWilayahKerja={false}
          hasilAwal={hasilPrediksiKedatangan}
        />
      </div>

      {/* ================= KEBERANGKATAN ================= */}
      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Pengawasan Keberangkatan Orang di BKK Kelas I Samarinda Tahun {tahunEpid} <br /> (dalam {granularitas})
        </h2>
        {dataKeberangkatan.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Belum ada data untuk rentang ini.</p>
        ) : (
          <TrenChartLine
            data={dataKeberangkatan}
            tipeChart={tipeChart}
            tampilkanNilai={granularitas === "bulanan"}
            seriesList={[{ key: "total", label: "Total Keberangkatan", warna: "#B71C1C" }]}
          />
        )}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Pengawasan Lalu Lintas Orang yang Berangkat dari Wilayah Kerja BKK Kelas I Samarinda Tahun {tahunEpid} <br /> (dalam {granularitas})
        </h2>
        {dataKeberangkatan.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Belum ada data untuk rentang ini.</p>
        ) : (
          <TrenChartLine
            data={dataKeberangkatan}
            tipeChart={tipeChart}
            seriesList={[
              { key: "abk_kapal", label: "ABK Kapal", warna: WARNA_KOMPONEN.abk_kapal },
              { key: "penumpang_kapal", label: "Penumpang Kapal", warna: WARNA_KOMPONEN.penumpang_kapal },
              { key: "crew_pesawat", label: "Crew Pesawat", warna: WARNA_KOMPONEN.crew_pesawat },
              { key: "penumpang_pesawat", label: "Penumpang Pesawat", warna: WARNA_KOMPONEN.penumpang_pesawat },
            ]}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <BoxAnalisisAI
          sudahLogin={sudahLogin}
          role={role}
          konteks={konteksKeberangkatan}
          periodeKey={periodeKey}
          wajibWilayahKerja={false}
          hasilAwal={hasilAnalisisKeberangkatan}
        />
        <BoxPrediksiAI
          sudahLogin={sudahLogin}
          role={role}
          konteks={konteksKeberangkatan}
          periodeKey={periodeKey}
          wajibWilayahKerja={false}
          hasilAwal={hasilPrediksiKeberangkatan}
        />
      </div>

      {/* ================= PERBANDINGAN ================= */}
      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Lalu Lintas Orang Datang & Berangkat dii Wilayah Kerja BKK Kelas I Samarinda Tahun {tahunEpid} <br />(Dalam {granularitas})
        </h2>
        {dataPerbandingan.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Belum ada data untuk rentang ini.</p>
        ) : (
          <TrenChartLine
            data={dataPerbandingan}
            tipeChart={tipeChart}
            seriesList={[
              { key: "total_kedatangan", label: "Total Kedatangan", warna: "#0F4C5C" },
              { key: "total_keberangkatan", label: "Total Keberangkatan", warna: "#B71C1C" },
            ]}
          />
        )}
      </div>
    </div>
  );
}