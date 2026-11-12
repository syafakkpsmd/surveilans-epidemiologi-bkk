"use client";

import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import BatangKelompokBerangka from "@/components/vektor/BatangKelompokBerangka";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";
import { kunciAI, type HasilAIStruktur } from "@/lib/ai/hasilAiTypes";
import { NAMA_BKK } from '@/lib/konfigurasi/instansi';
import FilterTahun from "@/components/FilterTahun";

type WilkerRef = { kode: string; nama: string; warna?: string | null };

const PALET_CADANGAN = ["#0F766E", "#B45309", "#7C3AED", "#BE123C", "#4D7C0F", "#0369A1", "#9D174D", "#475569"];
type VektorTikusClientProps = {
  daftarWilker: WilkerRef[];
  dataMingguan: any[];
  dataBulanan: any[];
  labMingguan: any[];
  labBulanan: any[];
  sudahLogin: boolean;
  role: string;
  tahunBerjalan: number;
  mingguBerjalan: number;
  bulanBerjalan: number;
  wilkerParam?: string;
  hasilAI?: Record<string, HasilAIStruktur | null>;
};

export default function VektorTikusClient({
  daftarWilker,
  dataMingguan,
  dataBulanan,
  labMingguan,
  labBulanan,
  sudahLogin,
  role,
  tahunBerjalan,
  mingguBerjalan,
  bulanBerjalan,
  wilkerParam,
  hasilAI = {},
}: VektorTikusClientProps) {
  const [selectedWilker, setSelectedWilker] = useState<string>(wilkerParam || "semua");
  const [periodeType, setPeriodeType] = useState<"mingguan" | "bulanan">("mingguan");
  const [chartData, setChartData] = useState<any[]>([]);

  // Rentang yang dipilih user -- default: dari minggu/bulan 1 s.d. periode berjalan saat ini
  const [mgDari, setMgDari] = useState(1);
  const [mgSampai, setMgSampai] = useState(mingguBerjalan);
  const [bulanDari, setBulanDari] = useState(1);
  const [bulanSampai, setBulanSampai] = useState(bulanBerjalan);

  const daftarMinggu = Array.from({ length: 52 }, (_, i) => i + 1);
  const daftarBulanAngka = Array.from({ length: 12 }, (_, i) => i + 1);

  const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const periodeKeyUtama =
    periodeType === "mingguan"
      ? `${tahunBerjalan}-W${mgDari}_W${mgSampai}`
      : `${tahunBerjalan}-M${bulanDari}_M${bulanSampai}`;

  const periodeKeyLabMingguan = `${tahunBerjalan}-W${mgDari}_W${mgSampai}`;
  const periodeKeyLabBulanan = `${tahunBerjalan}-M${bulanDari}_M${bulanSampai}`;

  const wilayahKerjaAktif = selectedWilker !== "semua" ? selectedWilker : undefined;

  // LOOKUP HASIL AI (BATCH)
  const konteksUtama = `vektor-tikus-${periodeType}`;
  const hasilAwalUtamaAnalisis = hasilAI[kunciAI({ konteks: konteksUtama, periodeKey: periodeKeyUtama, wilayahKerja: wilayahKerjaAktif, tipe: "analisis" })];
  const hasilAwalUtamaPrediksi = hasilAI[kunciAI({ konteks: konteksUtama, periodeKey: periodeKeyUtama, wilayahKerja: wilayahKerjaAktif, tipe: "prediksi" })];

  const hasilAwalLabBulananAnalisis = hasilAI[kunciAI({ konteks: "tikus-lab-bulanan", periodeKey: periodeKeyLabBulanan, wilayahKerja: wilayahKerjaAktif, tipe: "analisis" })];
  const hasilAwalLabBulananPrediksi = hasilAI[kunciAI({ konteks: "tikus-lab-bulanan", periodeKey: periodeKeyLabBulanan, wilayahKerja: wilayahKerjaAktif, tipe: "prediksi" })];

  const hasilAwalLabMingguanAnalisis = hasilAI[kunciAI({ konteks: "tikus-lab-mingguan", periodeKey: periodeKeyLabMingguan, wilayahKerja: wilayahKerjaAktif, tipe: "analisis" })];
  const hasilAwalLabMingguanPrediksi = hasilAI[kunciAI({ konteks: "tikus-lab-mingguan", periodeKey: periodeKeyLabMingguan, wilayahKerja: wilayahKerjaAktif, tipe: "prediksi" })];

  useEffect(() => {
    const sumberData = periodeType === "mingguan" ? dataMingguan : dataBulanan;
    const filtered = sumberData.filter((d) => {
      const cocokWilker = selectedWilker === "semua" || d.kode_wilker === selectedWilker;
      const cocokRentang =
        periodeType === "mingguan"
          ? d.minggu_epid >= mgDari && d.minggu_epid <= mgSampai
          : d.bulan >= bulanDari && d.bulan <= bulanSampai;
      return cocokWilker && cocokRentang;
    });

    const kelompokData: { [key: string]: any } = {};

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
          RN: 0,
          MM: 0,
          Lainnya: 0,
          akumulasiTsi: 0,
          akumulasiPinjal: 0,
          hitung: 0,
        };
      }

      const g = kelompokData[keyWaktu];

      g.diperiksa += Number(item.jml_trap_dipasang || 0);
      g.tertangkap += Number(item.jml_trap_tertangkap || 0);
      g.akumulasiTsi += Number(item.tsi || 0);
      g.akumulasiPinjal += Number(item.index_pinjal || 0);
      g.hitung += 1;

      g.RT += Number(item.rt || 0);
      g.RN += Number(item.rn || 0);
      g.MM += Number(item.mm || 0);
      g.Lainnya += Number(item.jenis_lainnya || 0);
    });

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
  }, [selectedWilker, periodeType, dataMingguan, dataBulanan, mgDari, mgSampai, bulanDari, bulanSampai]);

  const [chartLabMingguan, setChartLabMingguan] = useState<any[]>([]);
  const [chartLabBulanan, setChartLabBulanan] = useState<any[]>([]);

  const seriesLab: SeriesChecklist[] = [
    { key: "diuji_lab", label: "Diuji Lab", warna: "#0F4C5C" },
    { key: "leptospira_positif", label: "Leptospira Positif", warna: "#B71C1C" },
    { key: "leptospira_negatif", label: "Leptospira Negatif", warna: "#F0A8A8" },
    { key: "pes_positif", label: "Pes Positif", warna: "#7C3AED" },
    { key: "pes_negatif", label: "Pes Negatif", warna: "#D2B8F7" },
    { key: "hantavirus_positif", label: "Hantavirus Positif", warna: "#EA580C" },
    { key: "hantavirus_negatif", label: "Hantavirus Negatif", warna: "#F5C89E" },
  ];

  useEffect(() => {
    const filteredMingguan = labMingguan.filter(
      (d) =>
        (selectedWilker === "semua" || d.kode_wilker === selectedWilker) &&
        d.minggu_epid >= mgDari &&
        d.minggu_epid <= mgSampai
    );
    const petaMingguan = new Map<number, any>();
    filteredMingguan.forEach((item) => {
      const existing = petaMingguan.get(item.minggu_epid) ?? {
        label: `Mg-${item.minggu_epid}`,
        urutan: item.minggu_epid,
        diuji_lab: 0,
        leptospira_positif: 0,
        leptospira_negatif: 0,
        pes_positif: 0,
        pes_negatif: 0,
        hantavirus_positif: 0,
        hantavirus_negatif: 0,
      };
      existing.diuji_lab += item.diuji_lab;
      existing.leptospira_positif += item.leptospira_positif;
      existing.leptospira_negatif += item.leptospira_negatif;
      existing.pes_positif += item.pes_positif;
      existing.pes_negatif += item.pes_negatif;
      existing.hantavirus_positif += item.hantavirus_positif;
      existing.hantavirus_negatif += item.hantavirus_negatif;
      petaMingguan.set(item.minggu_epid, existing);
    });
    setChartLabMingguan(Array.from(petaMingguan.values()).sort((a, b) => a.urutan - b.urutan));

    const filteredBulanan = labBulanan.filter(
      (d) =>
        (selectedWilker === "semua" || d.kode_wilker === selectedWilker) &&
        d.bulan >= bulanDari &&
        d.bulan <= bulanSampai
    );
    const petaBulanan = new Map<number, any>();
    filteredBulanan.forEach((item) => {
      const existing = petaBulanan.get(item.bulan) ?? {
        label: namaBulan[item.bulan - 1] || `Bln-${item.bulan}`,
        urutan: item.bulan,
        diuji_lab: 0,
        leptospira_positif: 0,
        leptospira_negatif: 0,
        pes_positif: 0,
        pes_negatif: 0,
        hantavirus_positif: 0,
        hantavirus_negatif: 0,
      };
      existing.diuji_lab += item.diuji_lab;
      existing.leptospira_positif += item.leptospira_positif;
      existing.leptospira_negatif += item.leptospira_negatif;
      existing.pes_positif += item.pes_positif;
      existing.pes_negatif += item.pes_negatif;
      existing.hantavirus_positif += item.hantavirus_positif;
      existing.hantavirus_negatif += item.hantavirus_negatif;
      petaBulanan.set(item.bulan, existing);
    });
    setChartLabBulanan(Array.from(petaBulanan.values()).sort((a, b) => a.urutan - b.urutan));
  }, [selectedWilker, labMingguan, labBulanan, mgDari, mgSampai, bulanDari, bulanSampai]);

  // Grafik per wilayah kerja: satu seri per wilayah, sumbu X = minggu (garis) atau bulan (batang), mengikuti rentang yang dipilih.
  const wilkerTampil = useMemo(
    () => daftarWilker.filter((w) => selectedWilker === "semua" || w.kode === selectedWilker),
    [daftarWilker, selectedWilker]
  );
  const seriesWilker = useMemo(
    () =>
      wilkerTampil.map((w, i) => ({
        key: `w${i}`,
        label: w.nama,
                warna: w.warna || PALET_CADANGAN[i % PALET_CADANGAN.length],
      })),
    [wilkerTampil]
  );
  const { dataTertangkapWilker, dataTsiWilker } = useMemo(() => {
    const mingguan = periodeType === "mingguan";
    const sumber = mingguan ? dataMingguan : dataBulanan;
    const dari = mingguan ? mgDari : bulanDari;
    const sampai = mingguan ? mgSampai : bulanSampai;
    const tertangkap = new Map<string, number>();
    const tsi = new Map<string, { jumlah: number; n: number }>();
    for (const d of sumber) {
      const p: number = mingguan ? d.minggu_epid : d.bulan;
      if (p < dari || p > sampai) continue;
      const k = `${p}|${d.kode_wilker}`;
      tertangkap.set(k, (tertangkap.get(k) ?? 0) + Number(d.jml_trap_tertangkap || 0));
      const t = tsi.get(k) ?? { jumlah: 0, n: 0 };
      t.jumlah += Number(d.tsi || 0);
      t.n += 1;
      tsi.set(k, t);
    }
    const barisTertangkap: any[] = [];
    const barisTsi: any[] = [];
    for (let p = dari; p <= sampai; p++) {
      const name = mingguan ? `Mg-${p}` : namaBulan[p - 1] || `Bln-${p}`;
      const a: any = { name };
      const b: any = { name };
      wilkerTampil.forEach((w, i) => {
        const k = `${p}|${w.kode}`;
        const t = tsi.get(k);
        a[`w${i}`] = tertangkap.get(k) ?? 0;
        b[`w${i}`] = t && t.n > 0 ? parseFloat((t.jumlah / t.n).toFixed(2)) : 0;
      });
      barisTertangkap.push(a);
      barisTsi.push(b);
    }
    return { dataTertangkapWilker: barisTertangkap, dataTsiWilker: barisTsi };
  }, [periodeType, dataMingguan, dataBulanan, mgDari, mgSampai, bulanDari, bulanSampai, wilkerTampil]);
  const satuanPeriode = periodeType === "mingguan" ? "Minggu" : "Bulan";

  // Hitung total ringkasan untuk kartu modern
  const totalDiperiksa = chartData.reduce((acc, curr) => acc + (curr.diperiksa || 0), 0);
  const totalTertangkap = chartData.reduce((acc, curr) => acc + (curr.tertangkap || 0), 0);
  const rataTsi = chartData.length > 0 ? (chartData.reduce((acc, curr) => acc + (curr.tsi || 0), 0) / chartData.length).toFixed(2) : "0";
  const rataPinjal = chartData.length > 0 ? (chartData.reduce((acc, curr) => acc + (curr.index_pinjal || 0), 0) / chartData.length).toFixed(2) : "0";

  return (
    <div className="space-y-6">
      {/* Bagian Header dan Kontrol Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans Vektor Tikus</h1>
          <p className="text-sm text-gray-500">Dashboard Manajemen Surveilans Tikus.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Filter Tahun Baru */}
          <FilterTahun />

          {/* Tombol Navigasi Aksi Input */}
          {sudahLogin && (
            <div className="flex items-center gap-2 mr-1 border-r pr-3 border-gray-200">
              <Link
                href="/dashboard/data/vektor/tikus"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C5C] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0b3844] transition-colors"
              >
                <span>+ Input Data</span>
              </Link>
            </div>
          )}

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

          {/* Rentang Minggu */}
          {periodeType === "mingguan" && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-600">Rentang</span>
              <select
                value={mgDari}
                onChange={(e) => setMgDari(Number(e.target.value))}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none"
              >
                {daftarMinggu.map((m) => (
                  <option key={`mg-dari-${m}`} value={m}>Mg-{m}</option>
                ))}
              </select>
              <span className="text-gray-500">s.d.</span>
              <select
                value={mgSampai}
                onChange={(e) => setMgSampai(Number(e.target.value))}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none"
              >
                {daftarMinggu.map((m) => (
                  <option key={`mg-sampai-${m}`} value={m}>Mg-{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Rentang Bulan */}
          {periodeType === "bulanan" && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-600">Rentang</span>
              <select
                value={bulanDari}
                onChange={(e) => setBulanDari(Number(e.target.value))}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none"
              >
                {daftarBulanAngka.map((b) => (
                  <option key={`bln-dari-${b}`} value={b}>{namaBulan[b - 1]}</option>
                ))}
              </select>
              <span className="text-gray-500">s.d.</span>
              <select
                value={bulanSampai}
                onChange={(e) => setBulanSampai(Number(e.target.value))}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none"
              >
                {daftarBulanAngka.map((b) => (
                  <option key={`bln-sampai-${b}`} value={b}>{namaBulan[b - 1]}</option>
                ))}
              </select>
            </div>
          )}

          <select
            value={selectedWilker}
            onChange={(e) => setSelectedWilker(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-hidden"
          >
            <option value="semua">Semua Wilayah Kerja</option>
            {daftarWilker
              .filter((w) => (w as { aktif?: boolean | null }).aktif !== false)
              .map((w) => (
                <option key={w.kode} value={w.kode}>{w.nama}</option>
              ))}
          </select>
        </div>
      </div>

      {/* KARTU RINGKASAN MODERN & PROFESIONAL */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Perangkap Dipasang</p>
            <p className="text-2xl font-bold text-[#0F2A38] mt-1">{totalDiperiksa.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-teal-50 p-3 text-[#0F4C5C]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tikus Tertangkap</p>
            <p className="text-2xl font-bold text-[#B71C1C] mt-1">{totalTertangkap.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-[#B71C1C]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rata-rata Success Trap (TSI)</p>
            <p className="text-2xl font-bold text-[#1E3A8A] mt-1">{rataTsi}%</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-[#1E3A8A]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rata-rata Indeks Pinjal</p>
            <p className="text-2xl font-bold text-[#1B5E20] mt-1">{rataPinjal}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-[#1B5E20]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          </div>
        </div>
      </div>

      {/* Tampilan Kondisional Grafik */}
      {chartData.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-xs">
          Tidak ditemukan kecocokan data transaksi surveilans untuk tahun {tahunBerjalan}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-700">Tren Mingguan Spesies Tikus Tertangkap di Wilayah Kerja {NAMA_BKK} Tahun {tahunBerjalan}</h3>
            <TrenChartLine
              data={chartData}
              tipeChart={periodeType === "bulanan" ? "bar" : "line"}
              seriesList={[
                { key: "RT", label: "Rattus tanezumi (RT)", warna: "#1D4ED8" },
                { key: "RN", label: "Rattus norvegicus (RN)", warna: "#EA580C" },
                { key: "MM", label: "Mus musculus (MM)", warna: "#15803D" },
                { key: "Lainnya", label: "Lainnya", warna: "#BE185D" },
              ]}
            />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-xs">
            <h3 className="mb-4 text-sm text-center font-semibold text-gray-700">Distribusi Pemasangan Perangkap</h3>
            <TrenChartLine
              data={chartData}
              tipeChart={periodeType === "bulanan" ? "bar" : "line"}
              seriesList={[{ key: "diperiksa", label: "Perangkap di pasang", warna: "#006064" }]}
            />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-xs">
            <h3 className="mb-4 text-sm text-center font-semibold text-gray-700">Distribusi Tikus Tertangkap, Success Trap  & Indeks Pinjal</h3>
            <TrenChartLine
              data={chartData}
              tipeChart={periodeType === "bulanan" ? "bar" : "line"}
              seriesList={[
                { key: "tertangkap", label: "Tertangkap", warna: "#B71C1C" },
                { key: "tsi", label: "Success Trap (%)", warna: "#1E3A8A" },
                { key: "index_pinjal", label: "Index Pinjal", warna: "#1B5E20" },
              ]}
            />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Analisis &amp; Prediksi AI — Vektor Tikus ({periodeType === "mingguan" ? "Mingguan" : "Bulanan"})
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={role as PeranUser}
                konteks={konteksUtama}
                periodeKey={periodeKeyUtama}
                wilayahKerja={wilayahKerjaAktif}
                hasilAwal={hasilAwalUtamaAnalisis}
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={role as PeranUser}
                konteks={konteksUtama}
                periodeKey={periodeKeyUtama}
                wilayahKerja={wilayahKerjaAktif}
                hasilAwal={hasilAwalUtamaPrediksi}
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-xs">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-700">
              Hasil Pemeriksaan Laboratorium <br /> (Bulanan)
            </h3>
            <TrenChecklistMingguan
              data={chartLabBulanan}
              seriesList={seriesLab}
              maxAktifDefault={2}
              variant="bar"
              tampilan="dropdown"
              labelItem="uji lab"
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={role as PeranUser}
                konteks="tikus-lab-bulanan"
                periodeKey={periodeKeyLabBulanan}
                wilayahKerja={wilayahKerjaAktif}
                hasilAwal={hasilAwalLabBulananAnalisis}
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={role as PeranUser}
                konteks="tikus-lab-bulanan"
                periodeKey={periodeKeyLabBulanan}
                wilayahKerja={wilayahKerjaAktif}
                hasilAwal={hasilAwalLabBulananPrediksi}
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-xs">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-700">
              Hasil Pemeriksaan Laboratorium <br /> (Mingguan)
            </h3>
            <TrenChecklistMingguan
              data={chartLabMingguan}
              seriesList={seriesLab}
              maxAktifDefault={2}
              variant="line"
              tampilan="dropdown"
              labelItem="uji lab"
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <BoxAnalisisAI
                sudahLogin={sudahLogin}
                role={role as PeranUser}
                konteks="tikus-lab-mingguan"
                periodeKey={periodeKeyLabMingguan}
                wilayahKerja={wilayahKerjaAktif}
                hasilAwal={hasilAwalLabMingguanAnalisis}
              />
              <BoxPrediksiAI
                sudahLogin={sudahLogin}
                role={role as PeranUser}
                konteks="tikus-lab-mingguan"
                periodeKey={periodeKeyLabMingguan}
                wilayahKerja={wilayahKerjaAktif}
                hasilAwal={hasilAwalLabMingguanPrediksi}
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-700">
              Distribusi Jumlah Tikus Tertangkap Menurut Wilayah Kerja per {satuanPeriode} Selama Tahun {tahunBerjalan}
            </h3>
            {periodeType === "bulanan" ? (
              <BatangKelompokBerangka data={dataTertangkapWilker} seriesList={seriesWilker} />
            ) : (
              <TrenChartLine data={dataTertangkapWilker} tipeChart="line" seriesList={seriesWilker} />
            )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-700">
              Distribusi Success Trap per {satuanPeriode} di Wilayah Kerja {NAMA_BKK} Tahun {tahunBerjalan}
            </h3>
            {periodeType === "bulanan" ? (
              <BatangKelompokBerangka data={dataTsiWilker} seriesList={seriesWilker} />
            ) : (
              <TrenChartLine data={dataTsiWilker} tipeChart="line" seriesList={seriesWilker} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}