"use client";

import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";
import { useEffect, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";
import { kunciAI, type HasilAIStruktur } from "@/lib/ai/hasilAiTypes";

type WilkerRef = { kode: string; nama: string };
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
  hasilAI?: Record<string, HasilAIStruktur | null>; // <-- TAMBAH (batch AI)
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
  hasilAI = {}, // <-- TAMBAH
}: VektorTikusClientProps) {
  const [selectedWilker, setSelectedWilker] = useState<string>(wilkerParam || "semua");
  const [periodeType, setPeriodeType] = useState<"mingguan" | "bulanan">("mingguan");
  const [chartData, setChartData] = useState<any[]>([]);

  // Rentang yang dipilih user -- default: dari minggu/bulan 1 s.d. periode
  // berjalan saat ini (perilaku lama). daftar 52 minggu / 12 bulan untuk
  // opsi dropdown.
  const [mgDari, setMgDari] = useState(1);
  const [mgSampai, setMgSampai] = useState(mingguBerjalan);
  const [bulanDari, setBulanDari] = useState(1);
  const [bulanSampai, setBulanSampai] = useState(bulanBerjalan);

  const daftarMinggu = Array.from({ length: 52 }, (_, i) => i + 1);
  const daftarBulanAngka = Array.from({ length: 12 }, (_, i) => i + 1);

  const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  // periodeKey grafik utama mengikuti toggle Mingguan/Bulanan yang aktif,
  // DAN mengikuti rentang yang dipilih user (format rentang: "2026-W1_W9"
  // atau "2026-M1_M5", dibaca lib/ai/periode.ts di backend)
  const periodeKeyUtama =
    periodeType === "mingguan"
      ? `${tahunBerjalan}-W${mgDari}_W${mgSampai}`
      : `${tahunBerjalan}-M${bulanDari}_M${bulanSampai}`;

  // periodeKey untuk masing-masing boks lab (tidak ikut toggle, karena
  // keduanya selalu tampil berdampingan) -- tetap ikut rentang mingguan/
  // bulanan yang dipilih user
  const periodeKeyLabMingguan = `${tahunBerjalan}-W${mgDari}_W${mgSampai}`;
  const periodeKeyLabBulanan = `${tahunBerjalan}-M${bulanDari}_M${bulanSampai}`;

  const wilayahKerjaAktif = selectedWilker !== "semua" ? selectedWilker : undefined;

  // ==========================================
  // LOOKUP HASIL AI (TAMBAH)
  // Kalau kombinasi konteks/periode/wilayah saat ini persis sama
  // dengan yang di-prefetch server (state landing awal), Box langsung
  // dapat hasilnya tanpa fetch GET. Kalau user sudah ganti toggle
  // periode/rentang/wilayah, kunci ini tidak ketemu di hasilAI ->
  // undefined -> Box fallback fetch sendiri seperti biasa.
  // ==========================================
  const konteksUtama = `vektor-tikus-${periodeType}`;
  const hasilAwalUtamaAnalisis = hasilAI[kunciAI({ konteks: konteksUtama, periodeKey: periodeKeyUtama, wilayahKerja: wilayahKerjaAktif, tipe: "analisis" })];
  const hasilAwalUtamaPrediksi = hasilAI[kunciAI({ konteks: konteksUtama, periodeKey: periodeKeyUtama, wilayahKerja: wilayahKerjaAktif, tipe: "prediksi" })];

  const hasilAwalLabBulananAnalisis = hasilAI[kunciAI({ konteks: "tikus-lab-bulanan", periodeKey: periodeKeyLabBulanan, wilayahKerja: wilayahKerjaAktif, tipe: "analisis" })];
  const hasilAwalLabBulananPrediksi = hasilAI[kunciAI({ konteks: "tikus-lab-bulanan", periodeKey: periodeKeyLabBulanan, wilayahKerja: wilayahKerjaAktif, tipe: "prediksi" })];

  const hasilAwalLabMingguanAnalisis = hasilAI[kunciAI({ konteks: "tikus-lab-mingguan", periodeKey: periodeKeyLabMingguan, wilayahKerja: wilayahKerjaAktif, tipe: "analisis" })];
  const hasilAwalLabMingguanPrediksi = hasilAI[kunciAI({ konteks: "tikus-lab-mingguan", periodeKey: periodeKeyLabMingguan, wilayahKerja: wilayahKerjaAktif, tipe: "prediksi" })];

  useEffect(() => {
    // 1. Pilih dataset sesuai toggle periode, filter wilayah kerja DAN rentang
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

  return (
    <div className="space-y-6">
      {/* Bagian Header dan Kontrol Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans Vektor Tikus</h1>
          <p className="text-sm text-gray-500">Dashboard Manajemen Surveilans Tikus.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {/* Rentang Minggu -- tampil kalau toggle Mingguan aktif */}
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

          {/* Rentang Bulan -- tampil kalau toggle Bulanan aktif */}
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
              .filter((w) => !/bontang|tanjung bara/i.test(w.nama))
              .map((w) => (
                <option key={w.kode} value={w.kode}>{w.nama}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Tampilan Kondisional Grafik */}
      {chartData.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
          Tidak ditemukan kecocokan data transaksi surveilans.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-700">Tren Mingguan Spesies Tikus Tertangkap di Wilayah Kerja BKK Kelas I Samarinda Tahun {tahunBerjalan}</h3>
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
                { key: "tsi", label: "Success Trap (%)", warna: "#E65100" },
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
        </div>
      )}
    </div>
  );
}