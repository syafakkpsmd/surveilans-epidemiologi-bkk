"use client";

// app/(dashboard)/dashboard/klinik/tabel/TabelModulKlinikClient.tsx

import { useEffect, useState } from "react";
import { MODUL_KLINIK, type ModulKey } from "@/lib/klinik/modulTabelConfig";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

type Props = {
  modul: ModulKey;
  daftarWilker: string[];
  tahunSekarang: number;
};

export default function TabelModulKlinikClient({ modul, daftarWilker, tahunSekarang }: Props) {
  const cfg = MODUL_KLINIK[modul];

  const [tahun, setTahun] = useState(tahunSekarang);
  const [cakupanWaktu, setCakupanWaktu] = useState<"bulanan" | "setahun">("bulanan");
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [wilker, setWilker] = useState<string>("semua");

  const [namaKatimker, setNamaKatimker] = useState("");
  const [nipKatimker, setNipKatimker] = useState("");
  const [namaPetugas, setNamaPetugas] = useState("");
  const [nipPetugas, setNipPetugas] = useState("");

  const [sedangUnduh, setSedangUnduh] = useState(false);

  const [baris, setBaris] = useState<Record<string, string>[]>([]);
  const [sedangMuatPreview, setSedangMuatPreview] = useState(false);
  const [errorPreview, setErrorPreview] = useState<string | null>(null);

  const daftarTahun = Array.from({ length: 6 }, (_, i) => tahunSekarang - i);

  function susunQueryDasar() {
    const q = new URLSearchParams();
    q.set("modul", modul);
    q.set("tahun", String(tahun));
    q.set("bulan", cakupanWaktu === "bulanan" ? String(bulan) : "semua");
    q.set("wilker", wilker);
    return q;
  }

  // Pratinjau otomatis dimuat ulang tiap filter berubah
  useEffect(() => {
    let batal = false;
    async function muatPreview() {
      setSedangMuatPreview(true);
      setErrorPreview(null);
      try {
        const res = await fetch(`/api/klinik/modul/preview?${susunQueryDasar().toString()}`);
        if (!res.ok) throw new Error("Gagal memuat data");
        const data = await res.json();
        if (!batal) setBaris(data.baris ?? []);
      } catch {
        if (!batal) setErrorPreview("Gagal memuat data. Coba pilih ulang filternya.");
      } finally {
        if (!batal) setSedangMuatPreview(false);
      }
    }
    muatPreview();
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modul, tahun, cakupanWaktu, bulan, wilker]);

  async function unduh() {
    setSedangUnduh(true);
    try {
      const q = susunQueryDasar();
      q.set("namaKatimker", namaKatimker);
      q.set("nipKatimker", nipKatimker);
      q.set("namaPetugas", namaPetugas);
      q.set("nipPetugas", nipPetugas);

      const res = await fetch(`/api/klinik/modul/export?${q.toString()}`);
      if (!res.ok) {
        alert("Gagal membuat file. Coba lagi.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="(.+)"/);
      a.download = match ? match[1] : `data-${modul}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setSedangUnduh(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#0F2A38]">Unduh {cfg.judulHalaman}</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cfg.punyaWilayahKerja ? undefined : "hidden"}>
            <label className="block text-xs font-medium text-gray-600 mb-1">Wilayah Kerja</label>
            <select
              value={wilker}
              onChange={(e) => setWilker(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="semua">Semua Wilayah Kerja</option>
              {daftarWilker.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            {daftarWilker.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600">
                Belum ada wilayah kerja terdaftar — pastikan sync data dari sheet sudah pernah dijalankan.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cakupan Waktu</label>
            <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setCakupanWaktu("bulanan")}
                className={`flex-1 px-2 py-1.5 ${cakupanWaktu === "bulanan" ? "bg-[#0F4C5C] text-white" : "bg-white text-gray-700"}`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setCakupanWaktu("setahun")}
                className={`flex-1 px-2 py-1.5 ${cakupanWaktu === "setahun" ? "bg-[#0F4C5C] text-white" : "bg-white text-gray-700"}`}
              >
                Setahun
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tahun</label>
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {daftarTahun.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {cakupanWaktu === "bulanan" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bulan</label>
              <select
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                {NAMA_BULAN.map((nama, idx) => (
                  <option key={nama} value={idx + 1}>{nama}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500">Ketua TIMKER (Mengetahui)</p>
            <input
              placeholder="Nama Ketua TIMKER"
              value={namaKatimker}
              onChange={(e) => setNamaKatimker(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <input
              placeholder="NIP Ketua TIMKER"
              value={nipKatimker}
              onChange={(e) => setNipKatimker(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500">Pembuat Laporan / {cfg.labelPJ}</p>
            <input
              placeholder="Nama Petugas"
              value={namaPetugas}
              onChange={(e) => setNamaPetugas(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <input
              placeholder="NIP Petugas"
              value={nipPetugas}
              onChange={(e) => setNipPetugas(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={sedangUnduh}
            onClick={() => unduh()}
            className="rounded-md bg-[#0F4C5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c3e4b] disabled:opacity-50"
          >
            {sedangUnduh ? "Menyiapkan..." : "Unduh Excel"}
          </button>
        </div>
      </div>

      {/* ---- Pratinjau ---- */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#0F2A38]">Pratinjau Data</h3>
          <span className="text-xs text-gray-500">
            {sedangMuatPreview ? "Memuat..." : `${baris.length} baris`}
          </span>
        </div>

        {errorPreview && <p className="text-sm text-red-600">{errorPreview}</p>}

        {!errorPreview && !sedangMuatPreview && baris.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            Belum ada data untuk filter yang dipilih.
          </p>
        )}

        {baris.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="border px-2 py-1.5 text-left">No</th>
                  {cfg.punyaWilayahKerja && wilker === "semua" && (
                    <th className="border px-2 py-1.5 text-left">Wilker</th>
                  )}
                  {cfg.kolom.map((k) => (
                    <th key={k.key} className="border px-2 py-1.5 text-left whitespace-nowrap">{k.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {baris.map((b, idx) => (
                  <tr key={idx} className={idx % 2 ? "bg-gray-50/50" : ""}>
                    <td className="border px-2 py-1">{idx + 1}</td>
                    {cfg.punyaWilayahKerja && wilker === "semua" && (
                      <td className="border px-2 py-1">{b.wilker}</td>
                    )}
                    {cfg.kolom.map((k) => (
                      <td key={k.key} className="border px-2 py-1 whitespace-nowrap">{b[k.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}