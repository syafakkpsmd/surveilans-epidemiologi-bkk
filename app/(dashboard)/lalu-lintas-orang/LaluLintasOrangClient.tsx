"use client";

// app/(dashboard)/lalu-lintas-orang/LaluLintasOrangClient.tsx

import { useEffect, useState } from "react";
import { DAFTAR_TAB_LALULINTAS, type TabLaluLintas } from "@/lib/lalulintas/config";

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const DAFTAR_MINGGU = Array.from({ length: 53 }, (_, i) => i + 1);

type BarisPenumpangKapal = {
  wilker: string; tanggal_tiba: string; tanggal_berangkat: string; nama_kapal: string;
  abk_datang: number; abk_berangkat: number; penumpang_datang: number; penumpang_berangkat: number;
  siaos: string; keterangan: string;
};
type BarisAbkKapal = {
  tanggal: string; nama_kapal: string; bendera: string; jumlah_abk: number;
  hasil_pemeriksaan: string; keterangan: string;
};

type Props = {
  bisaUnduh: boolean;
  tahunSekarang: number;
  daftarWilkerPerTab: Record<TabLaluLintas, string[]>;
};

export default function LaluLintasOrangClient({ bisaUnduh, tahunSekarang, daftarWilkerPerTab }: Props) {
  const [tabAktif, setTabAktif] = useState<TabLaluLintas>("penumpang-kapal");

  const [tahun, setTahun] = useState(tahunSekarang);
  const [granularitas, setGranularitas] = useState<"mingguan" | "bulanan">("bulanan");
  const [wilker, setWilker] = useState("semua");

  const [tempAwal, setTempAwal] = useState(1);
  const [tempAkhir, setTempAkhir] = useState(granularitas === "bulanan" ? new Date().getMonth() + 1 : 52);
  const [rentang, setRentang] = useState({ awal: 1, akhir: tempAkhir });

  const [namaKatimker, setNamaKatimker] = useState("");
  const [nipKatimker, setNipKatimker] = useState("");
  const [namaPetugas, setNamaPetugas] = useState("");
  const [nipPetugas, setNipPetugas] = useState("");

  const [baris, setBaris] = useState<(BarisPenumpangKapal | BarisAbkKapal)[]>([]);
  const [sedangMuat, setSedangMuat] = useState(false);
  const [sedangUnduh, setSedangUnduh] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daftarTahun = Array.from({ length: 6 }, (_, i) => tahunSekarang - i);
  const daftarWilker = daftarWilkerPerTab[tabAktif] ?? [];

  function terapkanRentang() {
    let awal = tempAwal;
    let akhir = tempAkhir;
    if (awal > akhir) [awal, akhir] = [akhir, awal];
    setRentang({ awal, akhir });
  }

  function susunQueryDasar() {
    const q = new URLSearchParams();
    q.set("tab", tabAktif);
    q.set("tahun", String(tahun));
    q.set("granularitas", granularitas);
    q.set("awal", String(rentang.awal));
    q.set("akhir", String(rentang.akhir));
    q.set("wilker", wilker);
    return q;
  }

  useEffect(() => {
    let batal = false;
    async function muat() {
      setSedangMuat(true);
      setError(null);
      try {
        const res = await fetch(`/api/lalulintas/preview?${susunQueryDasar().toString()}`);
        if (!res.ok) throw new Error("gagal");
        const data = await res.json();
        if (!batal) setBaris(data.baris ?? []);
      } catch {
        if (!batal) setError("Gagal memuat data. Coba pilih ulang filternya.");
      } finally {
        if (!batal) setSedangMuat(false);
      }
    }
    muat();
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabAktif, tahun, granularitas, rentang, wilker]);

  // Reset filter wilker & rentang saat ganti tab (daftar wilker beda tiap tab)
  useEffect(() => {
    setWilker("semua");
  }, [tabAktif]);

  async function unduh() {
    setSedangUnduh(true);
    try {
      const q = susunQueryDasar();
      q.set("namaKatimker", namaKatimker);
      q.set("nipKatimker", nipKatimker);
      q.set("namaPetugas", namaPetugas);
      q.set("nipPetugas", nipPetugas);
      const res = await fetch(`/api/lalulintas/export?${q.toString()}`);
      if (!res.ok) {
        alert(res.status === 403 ? "Anda tidak punya akses untuk unduh." : "Gagal membuat file.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="(.+)"/);
      a.download = match ? match[1] : `${tabAktif}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setSedangUnduh(false);
    }
  }

  const adalahPenumpangKapal = tabAktif === "penumpang-kapal";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {DAFTAR_TAB_LALULINTAS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTabAktif(tab.key)}
            className={`rounded-t-md px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
              tabAktif === tab.key ? "bg-[#0F4C5C] text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#0F2A38]">
          {DAFTAR_TAB_LALULINTAS.find((t) => t.key === tabAktif)?.judulHalaman}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Wilayah Kerja</label>
            <select value={wilker} onChange={(e) => setWilker(e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
              <option value="semua">Semua Wilayah Kerja</option>
              {daftarWilker.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tahun</label>
            <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
              {daftarTahun.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Granularitas</label>
            <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => { setGranularitas("mingguan"); setTempAwal(1); setTempAkhir(52); }}
                className={`flex-1 px-2 py-1.5 ${granularitas === "mingguan" ? "bg-[#0F4C5C] text-white" : "bg-white text-gray-700"}`}
              >
                Mingguan
              </button>
              <button
                type="button"
                onClick={() => { setGranularitas("bulanan"); setTempAwal(1); setTempAkhir(new Date().getMonth() + 1); }}
                className={`flex-1 px-2 py-1.5 ${granularitas === "bulanan" ? "bg-[#0F4C5C] text-white" : "bg-white text-gray-700"}`}
              >
                Bulanan
              </button>
            </div>
          </div>

          <div className="flex items-end gap-1">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dari</label>
              <select value={tempAwal} onChange={(e) => setTempAwal(Number(e.target.value))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                {granularitas === "mingguan"
                  ? DAFTAR_MINGGU.map((m) => <option key={m} value={m}>Mg {m}</option>)
                  : NAMA_BULAN.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">s/d</label>
              <select value={tempAkhir} onChange={(e) => setTempAkhir(Number(e.target.value))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                {granularitas === "mingguan"
                  ? DAFTAR_MINGGU.map((m) => <option key={m} value={m}>Mg {m}</option>)
                  : NAMA_BULAN.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
              </select>
            </div>
            <button type="button" onClick={terapkanRentang} className="rounded-md bg-[#0F4C5C] px-3 py-1.5 text-xs font-semibold text-white h-8.5">
              Terapkan
            </button>
          </div>
        </div>

        {bisaUnduh && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Ketua TIMKER (Mengetahui)</p>
                <input placeholder="Nama Ketua TIMKER" value={namaKatimker} onChange={(e) => setNamaKatimker(e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                <input placeholder="NIP Ketua TIMKER" value={nipKatimker} onChange={(e) => setNipKatimker(e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Pembuat Laporan / Penanggung Jawab</p>
                <input placeholder="Nama Petugas" value={namaPetugas} onChange={(e) => setNamaPetugas(e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                <input placeholder="NIP Petugas" value={nipPetugas} onChange={(e) => setNipPetugas(e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
            </div>

            <button
              type="button"
              disabled={sedangUnduh}
              onClick={() => unduh()}
              className="rounded-md bg-[#0F4C5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c3e4b] disabled:opacity-50"
            >
              {sedangUnduh ? "Menyiapkan..." : "Unduh Excel"}
            </button>
          </>
        )}
        {!bisaUnduh && (
          <p className="text-xs text-gray-400">Masuk sebagai Petugas untuk bisa mengunduh data ini.</p>
        )}
      </div>

      {/* ---- Pratinjau (publik) ---- */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#0F2A38]">Data</h3>
          <span className="text-xs text-gray-500">{sedangMuat ? "Memuat..." : `${baris.length} baris`}</span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && !sedangMuat && baris.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Belum ada data untuk filter yang dipilih.</p>
        )}

        {baris.length > 0 && (
          <div className="overflow-x-auto">
            {adalahPenumpangKapal ? (
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="border px-2 py-1.5 text-left">No</th>
                    <th className="border px-2 py-1.5 text-left">Wilker</th>
                    <th className="border px-2 py-1.5 text-left">Tanggal Tiba</th>
                    <th className="border px-2 py-1.5 text-left">Tanggal Berangkat</th>
                    <th className="border px-2 py-1.5 text-left">Nama Kapal</th>
                    <th className="border px-2 py-1.5 text-left">ABK Datang</th>
                    <th className="border px-2 py-1.5 text-left">ABK Berangkat</th>
                    <th className="border px-2 py-1.5 text-left">Penumpang Datang</th>
                    <th className="border px-2 py-1.5 text-left">Penumpang Berangkat</th>
                    <th className="border px-2 py-1.5 text-left">SIAOS</th>
                    <th className="border px-2 py-1.5 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {(baris as BarisPenumpangKapal[]).map((b, idx) => (
                    <tr key={idx} className={idx % 2 ? "bg-gray-50/50" : ""}>
                      <td className="border px-2 py-1">{idx + 1}</td>
                      <td className="border px-2 py-1">{b.wilker}</td>
                      <td className="border px-2 py-1 whitespace-nowrap">{b.tanggal_tiba}</td>
                      <td className="border px-2 py-1 whitespace-nowrap">{b.tanggal_berangkat}</td>
                      <td className="border px-2 py-1">{b.nama_kapal}</td>
                      <td className="border px-2 py-1">{b.abk_datang}</td>
                      <td className="border px-2 py-1">{b.abk_berangkat}</td>
                      <td className="border px-2 py-1">{b.penumpang_datang}</td>
                      <td className="border px-2 py-1">{b.penumpang_berangkat}</td>
                      <td className="border px-2 py-1">{b.siaos}</td>
                      <td className="border px-2 py-1">{b.keterangan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="border px-2 py-1.5 text-left">No</th>
                    <th className="border px-2 py-1.5 text-left">Tanggal</th>
                    <th className="border px-2 py-1.5 text-left">Nama Kapal</th>
                    <th className="border px-2 py-1.5 text-left">Bendera</th>
                    <th className="border px-2 py-1.5 text-left">Jumlah ABK</th>
                    <th className="border px-2 py-1.5 text-left">Hasil Pemeriksaan</th>
                    <th className="border px-2 py-1.5 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {(baris as BarisAbkKapal[]).map((b, idx) => (
                    <tr key={idx} className={idx % 2 ? "bg-gray-50/50" : ""}>
                      <td className="border px-2 py-1">{idx + 1}</td>
                      <td className="border px-2 py-1 whitespace-nowrap">{b.tanggal}</td>
                      <td className="border px-2 py-1">{b.nama_kapal}</td>
                      <td className="border px-2 py-1">{b.bendera}</td>
                      <td className="border px-2 py-1">{b.jumlah_abk}</td>
                      <td className="border px-2 py-1">{b.hasil_pemeriksaan}</td>
                      <td className="border px-2 py-1">{b.keterangan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}