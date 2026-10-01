"use client";

import { useEffect, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { TrenChecklistMingguan, type SeriesChecklist } from "@/components/phqc/TrenChecklistMingguan";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";
import type { HasilAIStruktur } from "@/lib/ai/hasilAiTypes";

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

// Palet warna grafik & kartu ringkas (emerald / rose / indigo / cyan)
const WARNA = {
  ms: "#10B981",
  tms: "#F43F5E",
  pemeriksaan: "#6366F1",
  titik: "#06B6D4",
  tmsFisik: "#F97316",
  tmsKimia: "#8B5CF6",
  tmsBakt: "#F43F5E",
  msFisik: "#10B981",
  msKimia: "#0EA5E9",
  msBakt: "#F59E0B",
};

const KOLOM_ANGKA = [
  "jumlah_pemeriksaan",
  "total_pab_diperiksa",
  "jumlah_ms",
  "jumlah_tms",
  "tms_fisik",
  "tms_kimia",
  "tms_bakteriologis",
  "ms_fisik",
  "ms_kimia",
  "ms_bakteriologis",
] as const;

// ---------------------------------------------------------------------------
// Helper pengecekan teks MS / TMS (toleran terhadap variasi penulisan)
// ---------------------------------------------------------------------------
const norm = (v: any): string => String(v ?? "").trim().toLowerCase();

// TMS: "tms", "Tidak Memenuhi Syarat", "TMS (Tidak Memenuhi Syarat)", dst.
const isTmsText = (val: any): boolean => {
  const s = norm(val);
  if (!s) return false;
  return s === "tms" || s.includes("tidak memenuhi");
};

// MS: "ms", "Memenuhi Syarat", "Memenuhi", dst. (kecuali yang mengandung "tidak")
const isMsText = (val: any): boolean => {
  const s = norm(val);
  if (!s) return false;
  if (s.includes("tidak")) return false;
  return s === "ms" || s.includes("memenuhi");
};

/**
 * Tentukan status sebuah baris data: "tms" | "ms" | null.
 * Prioritas:
 *  1. Kolom `status` (kalau terisi dan dikenali)
 *  2. Kalau `status` KOSONG, turunkan dari parameter fisik/kimia/bakteriologis:
 *     - ada satu saja TMS  -> "tms"
 *     - tidak ada TMS, ada yang MS -> "ms"
 *  3. Selain itu null (data belum lengkap / belum diinput)
 */
function tentukanStatus(item: any): "tms" | "ms" | null {
  if (isTmsText(item.status)) return "tms";
  if (isMsText(item.status)) return "ms";

  // status kosong -> fallback ke parameter
  if (!norm(item.status)) {
    const params = [item.fisik, item.kimia, item.bakteriologis];
    if (params.some(isTmsText)) return "tms";
    if (params.some(isMsText)) return "ms";
  }

  return null;
}

interface HasilAwalInisial {
  // Kunci kombinasi (konteks|periodeKey|wilayahKerja) yang DI-PREFETCH
  // server di page.tsx, dibangun dengan format SAMA PERSIS seperti
  // bangunComboKeyDasar() di bawah. Cuma valid untuk kombinasi filter
  // DEFAULT (granularitas="bulanan", appliedBulanAkhir=12, wilayah dari
  // wilayahParam). Begitu user ganti granularitas/rentang/wilayah,
  // comboKeyAktif tidak akan cocok lagi dan Box otomatis balik fetch
  // sendiri.
  comboKeyDasar: string;
  analisis: HasilAIStruktur | null;
  prediksi: HasilAIStruktur | null;
}

type PabClientProps = {
  daftarWilayah: string[];
  dataBulanan: any[];
  dataMingguan: any[];
  dataTmsDetail?: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  tahunEpidBerjalan: number;   // dipakai saat granularitas mingguan
  mingguEpidBerjalan: number;  // dipakai saat granularitas mingguan
  wilayahParam?: string;
  /** Opsional: kalau tidak dioper, kedua Box otomatis fetch sendiri seperti biasa. */
  hasilAwalInisial?: HasilAwalInisial | null;
};

function bangunComboKeyDasar(konteks: string, periodeKey: string, wilayahKerja?: string): string {
  return `${konteks}|${periodeKey}|${wilayahKerja ?? ""}`;
}

function KartuRingkas({
  label,
  nilai,
  keterangan,
  warna,
  persen,
}: {
  label: string;
  nilai: string;
  keterangan: string;
  warna: string;
  persen?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: warna }} />
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: warna }} />
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-gray-900">{nilai}</span>
        {persen !== undefined && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: `${warna}1A`, color: warna }}
          >
            {persen}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">{keterangan}</p>
    </div>
  );
}

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
  hasilAwalInisial,
}: PabClientProps) {
  const [selectedWilayah, setSelectedWilayah] = useState<string>(wilayahParam || "semua");
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("bulanan");

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

      const urutan = granularitas === "bulanan"
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
      const urutan = granularitas === "bulanan"
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
        ms_fisik: 0,
        ms_kimia: 0,
        ms_bakteriologis: 0,
      };

      // Akumulasi Angka Agregat & Teks Fallback
      existing.jumlah_pemeriksaan += Number(item.jumlah_pemeriksaan || item.total_pemeriksaan || 1);
      existing.total_pab_diperiksa += Number(item.total_pab_diperiksa || item.jumlah_titik || 1);

      // Evaluasi Parameter TMS (Teks maupun Angka)
      if (isTmsText(item.fisik) || Number(item.tms_fisik) > 0) existing.tms_fisik += Number(item.tms_fisik || 1);
      if (isTmsText(item.kimia) || Number(item.tms_kimia) > 0) existing.tms_kimia += Number(item.tms_kimia || 1);
      if (isTmsText(item.bakteriologis) || Number(item.tms_bakteriologis) > 0) existing.tms_bakteriologis += Number(item.tms_bakteriologis || 1);

      // Evaluasi Parameter MS (Teks maupun Angka)
      if (isMsText(item.fisik) || Number(item.ms_fisik) > 0) existing.ms_fisik += Number(item.ms_fisik || 1);
      if (isMsText(item.kimia) || Number(item.ms_kimia) > 0) existing.ms_kimia += Number(item.ms_kimia || 1);
      if (isMsText(item.bakteriologis) || Number(item.ms_bakteriologis) > 0) existing.ms_bakteriologis += Number(item.ms_bakteriologis || 1);

      // Evaluasi Total MS & TMS
      // - Kalau baris sudah berisi angka agregat (jumlah_ms / jumlah_tms), pakai angkanya.
      // - Kalau tidak, tentukan dari teks status (dengan fallback ke parameter
      //   fisik/kimia/bakteriologis saat kolom status kosong).
      const jmsAngka = Number(item.jumlah_ms) || 0;
      const jtmsAngka = Number(item.jumlah_tms) || 0;

      if (jmsAngka > 0 || jtmsAngka > 0) {
        existing.jumlah_ms += jmsAngka;
        existing.jumlah_tms += jtmsAngka;
      } else {
        const status = tentukanStatus(item);
        if (status === "tms") existing.jumlah_tms += 1;
        else if (status === "ms") existing.jumlah_ms += 1;
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
    { key: "tms_fisik", label: "Fisik - TMS", warna: WARNA.tmsFisik },
    { key: "tms_kimia", label: "Kimia - TMS", warna: WARNA.tmsKimia },
    { key: "tms_bakteriologis", label: "Bakteriologis - TMS", warna: WARNA.tmsBakt },
  ];

  const seriesMs: SeriesChecklist[] = [
    { key: "ms_fisik", label: "Fisik - MS", warna: WARNA.msFisik },
    { key: "ms_kimia", label: "Kimia - MS", warna: WARNA.msKimia },
    { key: "ms_bakteriologis", label: "Bakteriologis - MS", warna: WARNA.msBakt },
  ];

  // periodeKey & konteks mengikuti granularitas chart.
  const konteksAI = granularitas === "bulanan" ? "pab-bulanan" : "pab-mingguan";
  const periodeKey = granularitas === "bulanan"
    ? `${tahunBerjalan}-${appliedBulanAkhir}`
    : `${tahunBerjalan}-W${appliedMingguAkhir}`;

  const tipeChartAktif = granularitas === "bulanan" ? "bar" : "line";

  const wilayahKerjaAktif = selectedWilayah !== "semua" ? selectedWilayah : undefined;

  // Kombinasi filter AKTIF di client, format sama seperti comboKeyDasar
  // dari server. Cocok -> boleh pakai hasil prefetch. Tidak cocok (user
  // sudah ganti granularitas/rentang/wilayah) -> hasilAwal jadi undefined,
  // Box otomatis fetch sendiri.
  const comboKeyAktif = bangunComboKeyDasar(konteksAI, periodeKey, wilayahKerjaAktif);
  const cocokDenganPrefetch = hasilAwalInisial?.comboKeyDasar === comboKeyAktif;
  const hasilAwalAnalisis = cocokDenganPrefetch ? hasilAwalInisial!.analisis : undefined;
  const hasilAwalPrediksi = cocokDenganPrefetch ? hasilAwalInisial!.prediksi : undefined;

  // Ringkasan untuk kartu di atas grafik (mengikuti filter rentang & wilayah)
  const ringkasan = chartData.reduce(
    (acc, d) => {
      acc.pemeriksaan += Number(d.jumlah_pemeriksaan) || 0;
      acc.titik += Number(d.total_pab_diperiksa) || 0;
      acc.ms += Number(d.jumlah_ms) || 0;
      acc.tms += Number(d.jumlah_tms) || 0;
      return acc;
    },
    { pemeriksaan: 0, titik: 0, ms: 0, tms: 0 }
  );
  const totalHasil = ringkasan.ms + ringkasan.tms;
  const persenStr = (n: number) =>
    totalHasil > 0 ? `${((n / totalHasil) * 100).toFixed(1).replace(".", ",")}%` : "-";
  const angka = (n: number) => n.toLocaleString("id-ID");
  const labelPeriode =
    granularitas === "bulanan"
      ? `${NAMA_BULAN[appliedBulanAwal - 1]} – ${NAMA_BULAN[appliedBulanAkhir - 1]} ${tahunBerjalan}`
      : `Mg ${appliedMingguAwal}–${appliedMingguAkhir} ${tahunBerjalan}`;
  const labelWilayah = selectedWilayah !== "semua" ? selectedWilayah : "Semua wilayah kerja";

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans Tempat Penyediaan Air Bersih</h1>
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
        </div>
      </div>

      {/* DASHBOARD GRAFIK */}
      {chartData.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
          Belum ada data PAB {granularitas} untuk rentang terpilih pada tahun {tahunBerjalan}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* KARTU RINGKAS */}
          <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-4">
            <KartuRingkas
              label="Total Pemeriksaan"
              nilai={angka(ringkasan.pemeriksaan)}
              keterangan={`${labelPeriode} · ${labelWilayah}`}
              warna={WARNA.pemeriksaan}
            />
            <KartuRingkas
              label="Titik PAB Diperiksa"
              nilai={angka(ringkasan.titik)}
              keterangan="Akumulasi titik air bersih yang diperiksa"
              warna={WARNA.titik}
            />
            <KartuRingkas
              label="Memenuhi Syarat (MS)"
              nilai={angka(ringkasan.ms)}
              persen={persenStr(ringkasan.ms)}
              keterangan="Hasil pemeriksaan memenuhi syarat"
              warna={WARNA.ms}
            />
            <KartuRingkas
              label="Tidak Memenuhi Syarat (TMS)"
              nilai={angka(ringkasan.tms)}
              persen={persenStr(ringkasan.tms)}
              keterangan={ringkasan.tms > 0 ? "Perlu tindak lanjut" : "Tidak ada temuan TMS"}
              warna={WARNA.tms}
            />
          </div>

          {/* Chart 1: MS vs TMS */}
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-700">
              Distribusi Hasil Pemeriksaan Tempat Penyediaan Air Bersih {selectedWilayah !== 'semua' ? ` di ${selectedWilayah}` : ''} Tahun  {tahunBerjalan}
              <br /> ({granularitas})
            </h3>
            <TrenChartLine
              data={chartData}
              tipeChart={tipeChartAktif}
              seriesList={[
                { key: "jumlah_ms", label: "Memenuhi Syarat", warna: WARNA.ms },
                { key: "jumlah_tms", label: "Tidak Memenuhi Syarat", warna: WARNA.tms },
              ]}
            />
          </div>

          {/* Chart 2: Jumlah Pemeriksaan vs Titik PAB */}
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-700">
              Distribusi PAB Diperiksa {selectedWilayah !== 'semua' ? ` di ${selectedWilayah}` : ''} Tahun  {tahunBerjalan}
              <br /> ({granularitas})
            </h3>
            <TrenChartLine
              data={chartData}
              tipeChart={tipeChartAktif}
              seriesList={[
                { key: "jumlah_pemeriksaan", label: "Jumlah Pemeriksaan", warna: WARNA.pemeriksaan },
                { key: "total_pab_diperiksa", label: "Titik PAB Diperiksa", warna: WARNA.titik },
              ]}
            />
          </div>

          {/* Chart 3: Breakdown Parameter TMS */}
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-700">
              Distribusi PAB Tidak Memenuhi Syarat (TMS) {selectedWilayah !== 'semua' ? ` di ${selectedWilayah}` : ''} Tahun  {tahunBerjalan}
              <br /> ({granularitas})
            </h3>
            <TrenChecklistMingguan
              data={chartData}
              seriesList={seriesTms}
              maxAktifDefault={3}
              variant={tipeChartAktif}
            />
          </div>

          {/* Chart 4: Breakdown Parameter MS */}
          <div className="rounded-xl bg-white p-4 shadow-xs lg:col-span-2">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-700">
              Distribusi PAB Memenuhi Syarat (MS) {selectedWilayah !== 'semua' ? ` di ${selectedWilayah}` : ''} Tahun  {tahunBerjalan}
              <br /> ({granularitas})
            </h3>
            <TrenChecklistMingguan
              data={chartData}
              seriesList={seriesMs}
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