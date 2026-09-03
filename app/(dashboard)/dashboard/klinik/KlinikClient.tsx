"use client";

import { useMemo, useState } from "react";
import TrenChartLine from "@/components/vektor/TrenChartLine";
import { BoxAnalisisAI } from "@/components/BoxAnalisisAI";
import { BoxPrediksiAI } from "@/components/BoxPrediksiAI";
import { PeranUser } from "@/types/database.types";
import { kunciAI, type HasilAIStruktur } from "@/lib/ai/hasilAiTypes";
import { KartuRekap } from "@/components/klinik/KartuRekap";
import { DonutChart } from "@/components/klinik/DonutChart";
import { PencarianIcv } from "@/components/klinik/PencarianIcv";
import { PengaturanStandarVaksin } from "@/components/klinik/PengaturanStandarVaksin";

const NAMA_BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

type KlinikClientProps = {
  daftarKlinik: string[];
  dataMingguan: any[];
  dataBulanan: any[];
  role: string;
  tahunBerjalan: number;
  bulanBerjalan: number;
  tahunEpidBerjalan: number;
  mingguEpidBerjalan: number;
  wilayahParam?: string;
  hasilAI?: Record<string, HasilAIStruktur | null>;
  rekap: {
    kartu: any;
    donutJenisKelamin: any[];
    donutUmur: any[];
    donutJenisDokumenIcv: any[];
    donutWus: any[];
  };
  standarHariVaksin: number;
};

export default function KlinikClient({
  daftarKlinik, dataMingguan, dataBulanan, rekap, role,
  tahunBerjalan, bulanBerjalan, tahunEpidBerjalan, mingguEpidBerjalan, standarHariVaksin,
  wilayahParam, hasilAI = {},
}: KlinikClientProps) {
  const [selectedKlinik, setSelectedKlinik] = useState<string>(wilayahParam || "semua");
  const [granularitas, setGranularitas] = useState<"bulanan" | "mingguan">("mingguan");

  const daftarMingguTersedia = useMemo(() => {
    const s = new Set<number>(dataMingguan.map((d) => Number(d.minggu)));
    const list = Array.from(s).sort((a, b) => a - b);
    return list.length ? list : Array.from({ length: 52 }, (_, i) => i + 1);
  }, [dataMingguan]);

  const daftarBulanTersedia = useMemo(() => {
    const s = new Set<number>(dataBulanan.map((d) => Number(d.bulan)));
    const list = Array.from(s).sort((a, b) => a - b);
    return list.length ? list : Array.from({ length: 12 }, (_, i) => i + 1);
  }, [dataBulanan]);

  const minMinggu = daftarMingguTersedia[0] || 1;
  const maxMinggu = daftarMingguTersedia[daftarMingguTersedia.length - 1] || 52;

  const [tempMingguAwal, setTempMingguAwal] = useState(minMinggu);
  const [tempMingguAkhir, setTempMingguAkhir] = useState(maxMinggu);
  const [tempBulanAwal, setTempBulanAwal] = useState(1);
  const [tempBulanAkhir, setTempBulanAkhir] = useState(bulanBerjalan || 12);

  const [appliedMingguAwal, setAppliedMingguAwal] = useState(minMinggu);
  const [appliedMingguAkhir, setAppliedMingguAkhir] = useState(maxMinggu);
  const [appliedBulanAwal, setAppliedBulanAwal] = useState(1);
  const [appliedBulanAkhir, setAppliedBulanAkhir] = useState(bulanBerjalan || 12);

  const handleApplyFilter = () => {
    if (granularitas === "mingguan") {
      setAppliedMingguAwal(Math.min(tempMingguAwal, tempMingguAkhir));
      setAppliedMingguAkhir(Math.max(tempMingguAwal, tempMingguAkhir));
    } else {
      setAppliedBulanAwal(Math.min(tempBulanAwal, tempBulanAkhir));
      setAppliedBulanAkhir(Math.max(tempBulanAwal, tempBulanAkhir));
    }
  };

  const chartData = useMemo(() => {
    const sumber = granularitas === "bulanan" ? dataBulanan : dataMingguan;
    const filtered = sumber.filter((d) => {
      const klinikMatch = selectedKlinik === "semua" || d.wilayah_kerja === selectedKlinik;
      const urutan = Number(granularitas === "bulanan" ? d.bulan : d.minggu);
      if (isNaN(urutan) || urutan <= 0) return false;
      const rentangMatch = granularitas === "bulanan"
        ? urutan >= appliedBulanAwal && urutan <= appliedBulanAkhir
        : urutan >= appliedMingguAwal && urutan <= appliedMingguAkhir;
      return klinikMatch && rentangMatch;
    });

    const peta = new Map<number, any>();
    for (const item of filtered) {
      const urutan = Number(granularitas === "bulanan" ? item.bulan : item.minggu);
      const label = granularitas === "bulanan" ? (NAMA_BULAN[urutan - 1] || `Bln-${urutan}`) : `Mg-${urutan}`;
      const existing = peta.get(urutan) ?? {
        name: label, label, minggu: label, bulan: label, urutan,
        total_layanan: 0, laki_laki: 0, perempuan: 0,
        meningitis: 0, flu: 0, polio: 0, yellow_fever: 0,
        jumlah_icv: 0, patuh: 0, tidak_patuh: 0,
      };
      existing.total_layanan += Number(item.total_layanan || 0);
      existing.laki_laki += Number(item.laki_laki || 0);
      existing.perempuan += Number(item.perempuan || 0);
      existing.meningitis += Number(item.meningitis || 0);
      existing.flu += Number(item.flu || 0);
      existing.polio += Number(item.polio || 0);
      existing.yellow_fever += Number(item.yellow_fever || 0);
      existing.jumlah_icv += Number(item.jumlah_icv || 0);
      existing.patuh += Number(item.patuh || 0);
      existing.tidak_patuh += Number(item.tidak_patuh || 0);
      peta.set(urutan, existing);
    }
    return Array.from(peta.values()).sort((a, b) => a.urutan - b.urutan);
  }, [selectedKlinik, granularitas, appliedMingguAwal, appliedMingguAkhir, appliedBulanAwal, appliedBulanAkhir, dataBulanan, dataMingguan]);

  const tipeChartAktif = granularitas === "mingguan" ? "line" : "bar";
  const totalTidakPatuh = chartData.reduce((a, d) => a + d.tidak_patuh, 0);

  const konteksAI = granularitas === "bulanan" ? "klinik-kepatuhan-bulanan" : "klinik-kepatuhan-mingguan";
  const periodeKey = granularitas === "bulanan"
    ? `${tahunBerjalan}-${appliedBulanAkhir}`
    : `${tahunEpidBerjalan}-W${appliedMingguAkhir}`;

  const wilayahKerjaAktif = selectedKlinik !== "semua" ? selectedKlinik : undefined;
  const hasilAwalAnalisis = hasilAI[kunciAI({ konteks: konteksAI, periodeKey, wilayahKerja: wilayahKerjaAktif, tipe: "analisis" })];
  const hasilAwalPrediksi = hasilAI[kunciAI({ konteks: konteksAI, periodeKey, wilayahKerja: wilayahKerjaAktif, tipe: "prediksi" })];

  return (
    <div className="space-y-6">
        {/* RINGKASAN TOTAL — tidak terikat filter mingguan/bulanan */}
        <KartuRekap data={rekap.kartu} />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DonutChart judul="Jenis Kelamin" data={rekap.donutJenisKelamin} />
        <DonutChart judul="Kategori Umur" data={rekap.donutUmur} />
        <DonutChart judul="Jenis Dokumen ICV" data={rekap.donutJenisDokumenIcv} />
        <DonutChart judul="Hasil WUS (Perempuan)" data={rekap.donutWus} />
        </div>

        <PencarianIcv />
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-xs border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-[#0F2A38]">Surveilans Klinik Vaksinasi ICV/e-ICV</h1>
          <p className="text-xs text-gray-500 mt-1">Layanan Vaksinasi Internasional Tahun {tahunBerjalan}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium">
            <button type="button" onClick={() => setGranularitas("mingguan")}
              className={`rounded-md px-3 py-1.5 transition-all ${granularitas === "mingguan" ? "bg-[#0F4C5C] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"}`}>
              Mingguan
            </button>
            <button type="button" onClick={() => setGranularitas("bulanan")}
              className={`rounded-md px-3 py-1.5 transition-all ${granularitas === "bulanan" ? "bg-[#0F4C5C] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"}`}>
              Bulanan
            </button>
          </div>

          <select value={selectedKlinik} onChange={(e) => setSelectedKlinik(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden">
            <option value="semua">Semua Klinik</option>
            {daftarKlinik.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>

          <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-200">
            {granularitas === "mingguan" ? (
              <>
                <div className="flex items-center gap-1 text-xs text-gray-600 pl-1">
                  <span>Mg</span>
                  <select value={tempMingguAwal} onChange={(e) => setTempMingguAwal(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden">
                    {daftarMingguTersedia.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <span className="text-xs text-gray-400">s/d</span>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span>Mg</span>
                  <select value={tempMingguAkhir} onChange={(e) => setTempMingguAkhir(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden">
                    {daftarMingguTersedia.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-xs text-gray-600 pl-1">
                  <span>Bln</span>
                  <select value={tempBulanAwal} onChange={(e) => setTempBulanAwal(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden">
                    {daftarBulanTersedia.map((b) => <option key={b} value={b}>{NAMA_BULAN[b - 1] || `Bulan ${b}`}</option>)}
                  </select>
                </div>
                <span className="text-xs text-gray-400">s/d</span>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span>Bln</span>
                  <select value={tempBulanAkhir} onChange={(e) => setTempBulanAkhir(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden">
                    {daftarBulanTersedia.map((b) => <option key={b} value={b}>{NAMA_BULAN[b - 1] || `Bulan ${b}`}</option>)}
                  </select>
                </div>
              </>
            )}
            <button type="button" onClick={handleApplyFilter}
              className="rounded-md bg-[#0F4C5C] px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#0c3c49] transition-all">
              Terapkan
            </button>
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Data layanan klinik periode {granularitas} untuk tahun {tahunBerjalan} belum tersedia pada rentang terfilter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="mb-4 text-center text-sm font-bold text-gray-800">
              Total Layanan & Distribusi Jenis Kelamin {selectedKlinik !== "semua" ? ` di ${selectedKlinik}` : ""} Tahun {tahunBerjalan}
              <br /> ({granularitas})
            </h3>
            <TrenChartLine data={chartData} tipeChart={tipeChartAktif} seriesList={[
              { key: "total_layanan", label: "Total Layanan", warna: "#0F4C5C" },
              { key: "laki_laki", label: "Laki-laki", warna: "#2563eb" },
              { key: "perempuan", label: "Perempuan", warna: "#f97316" },
            ]} />
          </div>

          <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 lg:col-span-2">
            <h3 className="mb-4 text-center text-sm font-bold text-gray-800">
              Penerbitan Dokumen ICV per Jenis Vaksin {selectedKlinik !== "semua" ? ` di ${selectedKlinik}` : ""} Tahun {tahunBerjalan}
              <br /> ({granularitas})
            </h3>
            <TrenChartLine data={chartData} tipeChart={tipeChartAktif} seriesList={[
              { key: "meningitis", label: "Meningitis", warna: "#7C3AED" },
              { key: "flu", label: "Flu", warna: "#00838F" },
              { key: "polio", label: "Polio", warna: "#2E7D32" },
              { key: "yellow_fever", label: "Yellow Fever", warna: "#E65100" },
            ]} />
          </div>

          <BoxAnalisisAI sudahLogin={true} role={role as PeranUser} konteks={konteksAI}
            periodeKey={periodeKey} wilayahKerja={wilayahKerjaAktif} hasilAwal={hasilAwalAnalisis} />
          <BoxPrediksiAI sudahLogin={true} role={role as PeranUser} konteks={konteksAI}
            periodeKey={periodeKey} wilayahKerja={wilayahKerjaAktif} hasilAwal={hasilAwalPrediksi} />

          {role === 'admin' && (
            <div className="lg:col-span-2">
                <PengaturanStandarVaksin nilaiAwal={standarHariVaksin} />
            </div>
            )}

            <div className="rounded-xl bg-white p-5 shadow-xs border border-red-100 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                <h3 className="text-base font-bold text-red-900">
                    Ringkasan Kepatuhan Masa Aktif Vaksin (standar {standarHariVaksin} hari)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    Jumlah layanan dengan jarak penerbitan-keberangkatan kurang dari {standarHariVaksin} hari.
                </p>
                </div>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                {totalTidakPatuh} Tidak Patuh
                </span>
            </div>
            {totalTidakPatuh === 0 ? (
              <div className="rounded-lg bg-green-50 p-6 text-center text-xs font-medium text-green-700 border border-green-100">
                🎉 Tidak ada layanan yang tidak memenuhi standar {standarHariVaksin} hari pada periode terfilter.
              </div>
            ) : (
              <TrenChartLine data={chartData} tipeChart={tipeChartAktif} seriesList={[
                { key: "patuh", label: "Patuh (≥" + standarHariVaksin + " hari)", warna: "#2E7D32" },
                { key: "tidak_patuh", label: "Tidak Patuh (<" + standarHariVaksin + " hari)", warna: "#B71C1C" },
              ]} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}