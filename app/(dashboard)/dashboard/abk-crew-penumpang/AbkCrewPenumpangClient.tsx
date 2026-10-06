"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TrenChartPilihanSeri from "@/components/vektor/TrenChartPilihanSeri";
import FilterWilker from "@/components/vektor/FilterWilker";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser, type WilkerRef } from "@/types/database.types";
import { kunciAI, type HasilAIStruktur } from "@/lib/ai/hasilAiTypes";
import type { TitikGabungan, TitikLuarDalamNegeri } from "./page";

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
  mingguanKedatanganLuarDalam: TitikLuarDalamNegeri[];
  bulananKedatanganLuarDalam: TitikLuarDalamNegeri[];
  mingguanKeberangkatanLuarDalam: TitikLuarDalamNegeri[];
  bulananKeberangkatanLuarDalam: TitikLuarDalamNegeri[];
  hasilAI: Record<string, HasilAIStruktur | null>;
  daftarWilker: WilkerRef[];
  namaWilkerTerpilih: string | null;
};

const WARNA_KOMPONEN = {
  abk_kapal: "#0F4C5C",
  penumpang_kapal: "#2563EB",
  crew_pesawat: "#7C3AED",
  penumpang_pesawat: "#EA580C",
};

const WARNA_LUAR_DALAM = {
  luar_negeri: "#0F4C5C",
  dalam_negeri: "#EA580C",
};

// ---- Checkbox = SUMBER DATA ----
const KEY_SUMBER_UTAMA = ["abk_kapal", "penumpang_kapal", "crew_pesawat", "penumpang_pesawat"];

// Kedatangan: ABK Kapal = COP (Luar Negeri).
const SUMBER_KEDATANGAN = [
  { key: "abk_kapal", label: "ABK Kapal (COP, Luar Negeri)", warna: WARNA_KOMPONEN.abk_kapal },
  { key: "penumpang_kapal", label: "Penumpang Kapal Datang", warna: WARNA_KOMPONEN.penumpang_kapal },
  { key: "crew_pesawat", label: "Crew Pesawat Datang", warna: WARNA_KOMPONEN.crew_pesawat },
  { key: "penumpang_pesawat", label: "Penumpang Pesawat Datang", warna: WARNA_KOMPONEN.penumpang_pesawat },
];

// Keberangkatan: ABK Kapal = PHQC.
const SUMBER_KEBERANGKATAN = [
  { key: "abk_kapal", label: "ABK Kapal (PHQC)", warna: WARNA_KOMPONEN.abk_kapal },
  { key: "penumpang_kapal", label: "Penumpang Kapal Berangkat", warna: WARNA_KOMPONEN.penumpang_kapal },
  { key: "crew_pesawat", label: "Crew Pesawat Berangkat", warna: WARNA_KOMPONEN.crew_pesawat },
  { key: "penumpang_pesawat", label: "Penumpang Pesawat Berangkat", warna: WARNA_KOMPONEN.penumpang_pesawat },
];

// Grafik Luar vs Dalam Negeri: checkbox = sumber data; 2 batang dihitung ulang dari sumber yang dicentang.
// Warna kotak = warna batang tempat sumber itu dijumlahkan.
const SUMBER_LUAR_DALAM_KEDATANGAN = [
  { key: "abk_cop", label: "ABK Kapal (COP)", warna: WARNA_LUAR_DALAM.luar_negeri },
  { key: "abk_phqc_dalam", label: "ABK Kapal PHQC", warna: WARNA_LUAR_DALAM.dalam_negeri },
  { key: "penumpang_kapal", label: "Penumpang Kapal Datang", warna: WARNA_LUAR_DALAM.dalam_negeri },
  { key: "crew_pesawat", label: "Crew Pesawat Datang", warna: WARNA_LUAR_DALAM.dalam_negeri },
  { key: "penumpang_pesawat", label: "Penumpang Pesawat Datang", warna: WARNA_LUAR_DALAM.dalam_negeri },
];
const HASIL_LUAR_DALAM_KEDATANGAN = [
  { key: "luar_negeri", label: "Luar Negeri", warna: WARNA_LUAR_DALAM.luar_negeri, sumber: ["abk_cop"] },
  {
    key: "dalam_negeri",
    label: "Dalam Negeri",
    warna: WARNA_LUAR_DALAM.dalam_negeri,
    sumber: ["abk_phqc_dalam", "penumpang_kapal", "crew_pesawat", "penumpang_pesawat"],
  },
];

const SUMBER_LUAR_DALAM_KEBERANGKATAN = [
  { key: "abk_phqc_luar", label: "ABK Kapal PHQC (Luar Negeri)", warna: WARNA_LUAR_DALAM.luar_negeri },
  { key: "abk_phqc_dalam", label: "ABK Kapal PHQC (Dalam Negeri)", warna: WARNA_LUAR_DALAM.dalam_negeri },
  { key: "penumpang_kapal", label: "Penumpang Kapal Berangkat", warna: WARNA_LUAR_DALAM.dalam_negeri },
  { key: "crew_pesawat", label: "Crew Pesawat Berangkat", warna: WARNA_LUAR_DALAM.dalam_negeri },
  { key: "penumpang_pesawat", label: "Penumpang Pesawat Berangkat", warna: WARNA_LUAR_DALAM.dalam_negeri },
];
const HASIL_LUAR_DALAM_KEBERANGKATAN = [
  { key: "luar_negeri", label: "Luar Negeri", warna: WARNA_LUAR_DALAM.luar_negeri, sumber: ["abk_phqc_luar"] },
  {
    key: "dalam_negeri",
    label: "Dalam Negeri",
    warna: WARNA_LUAR_DALAM.dalam_negeri,
    sumber: ["abk_phqc_dalam", "penumpang_kapal", "crew_pesawat", "penumpang_pesawat"],
  },
];

// Grafik perbandingan: 1 set checkbox sumber data berlaku untuk kedua batang.
const SUMBER_PERBANDINGAN = [
  { key: "abk_kapal", label: "ABK Kapal (COP datang / PHQC berangkat)", warna: WARNA_KOMPONEN.abk_kapal },
  { key: "penumpang_kapal", label: "Penumpang Kapal", warna: WARNA_KOMPONEN.penumpang_kapal },
  { key: "crew_pesawat", label: "Crew Pesawat", warna: WARNA_KOMPONEN.crew_pesawat },
  { key: "penumpang_pesawat", label: "Penumpang Pesawat", warna: WARNA_KOMPONEN.penumpang_pesawat },
];
const HASIL_PERBANDINGAN = [
  { key: "total_kedatangan", label: "Total Kedatangan", warna: "#0F4C5C", sumber: KEY_SUMBER_UTAMA, awalan: "datang_" },
  { key: "total_keberangkatan", label: "Total Keberangkatan", warna: "#B71C1C", sumber: KEY_SUMBER_UTAMA, awalan: "berangkat_" },
];

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
  mingguanKedatanganLuarDalam,
  bulananKedatanganLuarDalam,
  mingguanKeberangkatanLuarDalam,
  bulananKeberangkatanLuarDalam,
  hasilAI,
  daftarWilker,
  namaWilkerTerpilih,
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

  const filterRentang = <T extends { urutan: number }>(data: T[]) =>
    data.filter((d) => d.urutan >= batasAwal && d.urutan <= batasAkhir);

  const dataKedatangan = useMemo(
    () => filterRentang(granularitas === "bulanan" ? bulananKedatangan : mingguanKedatangan),
    [granularitas, bulananKedatangan, mingguanKedatangan, batasAwal, batasAkhir]
  );
  const dataKeberangkatan = useMemo(
    () => filterRentang(granularitas === "bulanan" ? bulananKeberangkatan : mingguanKeberangkatan),
    [granularitas, bulananKeberangkatan, mingguanKeberangkatan, batasAwal, batasAkhir]
  );
  const dataKedatanganLuarDalam = useMemo(
    () => filterRentang(granularitas === "bulanan" ? bulananKedatanganLuarDalam : mingguanKedatanganLuarDalam),
    [granularitas, bulananKedatanganLuarDalam, mingguanKedatanganLuarDalam, batasAwal, batasAkhir]
  );
  const dataKeberangkatanLuarDalam = useMemo(
    () => filterRentang(granularitas === "bulanan" ? bulananKeberangkatanLuarDalam : mingguanKeberangkatanLuarDalam),
    [granularitas, bulananKeberangkatanLuarDalam, mingguanKeberangkatanLuarDalam, batasAwal, batasAkhir]
  );

  // Data perbandingan (Section 7): 1 baris per periode, dengan nilai PER SUMBER
  // untuk arah datang (datang_*) dan berangkat (berangkat_*) supaya total kedua
  // batang bisa dihitung ulang sesuai checkbox sumber data.
  const dataPerbandingan = useMemo(() => {
    type Baris = { urutan: number; name: string; label: string } & Record<string, number | string>;
    const peta = new Map<number, Baris>();
    const ambil = (d: { urutan: number; name: string; label: string }): Baris => {
      const ada = peta.get(d.urutan);
      if (ada) return ada;
      const baru: Baris = { urutan: d.urutan, name: d.name, label: d.label };
      KEY_SUMBER_UTAMA.forEach((k) => {
        baru[`datang_${k}`] = 0;
        baru[`berangkat_${k}`] = 0;
      });
      peta.set(d.urutan, baru);
      return baru;
    };
    dataKedatangan.forEach((d) => {
      const baris = ambil(d);
      KEY_SUMBER_UTAMA.forEach((k) => (baris[`datang_${k}`] = (d as any)[k] ?? 0));
    });
    dataKeberangkatan.forEach((d) => {
      const baris = ambil(d);
      KEY_SUMBER_UTAMA.forEach((k) => (baris[`berangkat_${k}`] = (d as any)[k] ?? 0));
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
      <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Pengawasan Lalu Lintas Orang di BKK Kelas I Samarinda</h1>
          <p className="text-xs text-gray-500 mt-1">
            Gabungan ABK Kapal (Dalam Negeri dan Luar Negeri), Penumpang Kapal dan Crew &amp; Penumpang Pesawat
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <FilterWilker daftarWilker={daftarWilker}  />

          <Link
            href="/lalu-lintas-orang"
            className="rounded-md border border-[#0F4C5C] px-3 py-1.5 text-xs font-semibold text-[#0F4C5C] hover:bg-gray-50 transition-colors"
          >
            Tabel
          </Link>

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

      {namaWilkerTerpilih && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Menampilkan data wilayah kerja <strong>{namaWilkerTerpilih}</strong>. Sumber yang tidak beroperasi di wilayah ini
          (mis. Pesawat di pelabuhan, atau Penumpang Kapal di luar Samarinda dan Lhoktuan) tampil 0. Kotak Analisis &amp;
          Prediksi AI di bawah tetap mencakup seluruh wilayah kerja.
        </p>
      )}

      {/* ================= KEDATANGAN ================= */}
      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <h2 className="mb-1 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Pengawasan Seluruh Lalu Lintas Orang Datang di BKK Kelas I Samarinda Tahun {tahunEpid} <br /> (dalam {granularitas})
        </h2>
        <p className="mb-4 text-center text-xs text-gray-400">
          Total gabungan ABK Kapal dari Luar Negeri + Crew Pesawat Datang + Penumpang Pesawat Datang + Penumpang Kapal Datang
        </p>
        <TrenChartPilihanSeri
            data={dataKedatangan}
            tipeChart={tipeChart}
            tampilkanNilai={granularitas === "bulanan"}
            sumberList={SUMBER_KEDATANGAN}
            seriesHasil={[
              { key: "total", label: "Total Kedatangan", warna: "#0F4C5C", sumber: KEY_SUMBER_UTAMA },
            ]}
          />
      </div>

      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Pengawasan Lalu Lintas Orang yang Datang ke Wilayah Kerja BKK Kelas I Samarinda Tahun {tahunEpid} <br /> (dalam {granularitas})
        </h2>
        <TrenChartPilihanSeri data={dataKedatangan} tipeChart={tipeChart} sumberList={SUMBER_KEDATANGAN} />
      </div>

      {/* ---- BARU: Kedatangan Luar Negeri vs Dalam Negeri ---- */}
      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <h2 className="mb-1 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Pengawasan Lalu Lintas Orang di BKK Kelas I Samarinda Tahun {tahunEpid} <br /> (dalam {granularitas})
        </h2>
        <p className="mb-4 text-center text-xs text-gray-400">
          Luar Negeri: ABK Kapal (COP). Dalam Negeri: ABK Kapal PHQC + Penumpang Kapal Datang + Crew &amp; Penumpang Pesawat Datang
        </p>
        <TrenChartPilihanSeri
            data={dataKedatanganLuarDalam}
            tipeChart={tipeChart}
            sumberList={SUMBER_LUAR_DALAM_KEDATANGAN}
            seriesHasil={HASIL_LUAR_DALAM_KEDATANGAN}
          />
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
        <h2 className="mb-1 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Pengawasan Seluruh Lalu Lintas Orang Berangkat di BKK Kelas I Samarinda Tahun {tahunEpid} <br /> (dalam {granularitas})
        </h2>
        <p className="mb-4 text-center text-xs text-gray-400">
          Total gabungan ABK Kapal PHQC + Penumpang Kapal Berangkat + Crew Pesawat Berangkat + Penumpang Pesawat Berangkat
        </p>
        <TrenChartPilihanSeri
            data={dataKeberangkatan}
            tipeChart={tipeChart}
            tampilkanNilai={granularitas === "bulanan"}
            sumberList={SUMBER_KEBERANGKATAN}
            seriesHasil={[
              { key: "total", label: "Total Keberangkatan", warna: "#B71C1C", sumber: KEY_SUMBER_UTAMA },
            ]}
          />
      </div>

      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Pengawasan Lalu Lintas Orang yang Berangkat dari Wilayah Kerja BKK Kelas I Samarinda Tahun {tahunEpid} <br /> (dalam {granularitas})
        </h2>
        <TrenChartPilihanSeri data={dataKeberangkatan} tipeChart={tipeChart} sumberList={SUMBER_KEBERANGKATAN} />
      </div>

      {/* ---- BARU: Keberangkatan Luar Negeri vs Dalam Negeri ---- */}
      <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <h2 className="mb-1 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Distribusi Pengawasan Lalu Lintas orang Berangkat dari Wilayah Kerja BKK Kelas I Samarinda Tahun {tahunEpid} <br /> (dalam {granularitas})
        </h2>
        <p className="mb-4 text-center text-xs text-gray-400">
          Luar Negeri: ABK Kapal PHQC tujuan Luar Negeri. Dalam Negeri: ABK Kapal PHQC tujuan Dalam Negeri + Penumpang Kapal Berangkat + Crew &amp; Penumpang Pesawat Berangkat
        </p>
        <TrenChartPilihanSeri
            data={dataKeberangkatanLuarDalam}
            tipeChart={tipeChart}
            sumberList={SUMBER_LUAR_DALAM_KEBERANGKATAN}
            seriesHasil={HASIL_LUAR_DALAM_KEBERANGKATAN}
          />
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
          Distribusi Pengawasan Lalu Lintas Orang Datang & Berangkat di Wilayah Kerja BKK Kelas I Samarinda Tahun {tahunEpid} <br />(Dalam {granularitas})
        </h2>
        <TrenChartPilihanSeri
            data={dataPerbandingan}
            tipeChart={tipeChart}
            sumberList={SUMBER_PERBANDINGAN}
            seriesHasil={HASIL_PERBANDINGAN}
          />
      </div>
    </div>
  );
}