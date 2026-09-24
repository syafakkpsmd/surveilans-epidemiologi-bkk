"use client";

import { useEffect, useState } from "react";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const NAMA_KATIMKER_DEFAULT = ""; // isi default kalau mau, mis. "dr. Risna Sagitasari, M.K.K"

interface BarisPreview {
  wilker: string;
  no_baris: number;
  tanggal_kegiatan: string;
  nik: string;
  nama: string;
  sex: string;
  tanggal_lahir: string;
  alamat: string;
  status_perkawinan: string;
  kunjungan: string;
  hasil: string;
  jenis_reagen: string;
  hubungan_beresiko: string;
}

type Props = {
  daftarWilker: string[];
  tahunSekarang: number;
};

export default function TabelHivDownloadClient({ daftarWilker, tahunSekarang }: Props) {
  const [tahun, setTahun] = useState(tahunSekarang);
  const [cakupanWaktu, setCakupanWaktu] = useState<"bulanan" | "setahun">("bulanan");
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [wilker, setWilker] = useState<string>("semua");

  const [namaKatimker, setNamaKatimker] = useState(NAMA_KATIMKER_DEFAULT);
  const [nipKatimker, setNipKatimker] = useState("");
  const [namaPetugas, setNamaPetugas] = useState("");
  const [nipPetugas, setNipPetugas] = useState("");

  const [sedangUnduh, setSedangUnduh] = useState<"xlsx" | null>(null);

  const [baris, setBaris] = useState<BarisPreview[]>([]);
  const [sedangMuatPreview, setSedangMuatPreview] = useState(false);
  const [errorPreview, setErrorPreview] = useState<string | null>(null);

  const daftarTahun = Array.from({ length: 6 }, (_, i) => tahunSekarang - i);

  function susunQueryDasar() {
    const q = new URLSearchParams();
    q.set("tahun", String(tahun));
    q.set("bulan", cakupanWaktu === "bulanan" ? String(bulan) : "semua");
    q.set("wilker", wilker);
    return q;
  }

  // Muat ulang preview otomatis tiap kali filter berubah
  useEffect(() => {
    let batal = false;
    async function muatPreview() {
      setSedangMuatPreview(true);
      setErrorPreview(null);
      try {
        const res = await fetch(`/api/klinik/hiv/preview?${susunQueryDasar().toString()}`);
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
  }, [tahun, cakupanWaktu, bulan, wilker]);

  async function unduh() {
    setSedangUnduh("xlsx");
    try {
      const q = susunQueryDasar();
      q.set("namaKatimker", namaKatimker);
      q.set("nipKatimker", nipKatimker);
      q.set("namaPetugas", namaPetugas);
      q.set("nipPetugas", nipPetugas);

      const res = await fetch(`/api/klinik/hiv/export/xlsx?${q.toString()}`);
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
      a.download = match ? match[1] : `data-hiv-vct.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setSedangUnduh(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#0F2A38]">Unduh Data Individu Mobile VCT PP HIV</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
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
            <p className="text-xs font-semibold text-gray-500">Pembuat Laporan / Penanggung Jawab Program</p>
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
            disabled={sedangUnduh !== null}
            onClick={() => unduh()}
            className="rounded-md bg-[#0F4C5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c3e4b] disabled:opacity-50"
          >
            {sedangUnduh === "xlsx" ? "Menyiapkan..." : "Unduh Excel"}
          </button>
        </div>
      </div>

      {/* ---- Preview tabel ---- */}
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
                  {wilker === "semua" && <th className="border px-2 py-1.5 text-left">Wilker</th>}
                  <th className="border px-2 py-1.5 text-left">NIK</th>
                  <th className="border px-2 py-1.5 text-left">Nama</th>
                  <th className="border px-2 py-1.5 text-left">Sex</th>
                  <th className="border px-2 py-1.5 text-left">Tgl Lahir</th>
                  <th className="border px-2 py-1.5 text-left">Alamat</th>
                  <th className="border px-2 py-1.5 text-left">Status Kawin</th>
                  <th className="border px-2 py-1.5 text-left">Tgl Kegiatan</th>
                  <th className="border px-2 py-1.5 text-left">Kunjungan</th>
                  <th className="border px-2 py-1.5 text-left">Hasil</th>
                  <th className="border px-2 py-1.5 text-left">Jenis Reagen</th>
                  <th className="border px-2 py-1.5 text-left">Hub. Beresiko</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b, idx) => (
                  <tr key={`${b.wilker}-${b.no_baris}`} className={idx % 2 ? "bg-gray-50/50" : ""}>
                    <td className="border px-2 py-1">{idx + 1}</td>
                    {wilker === "semua" && <td className="border px-2 py-1">{b.wilker}</td>}
                    <td className="border px-2 py-1">{b.nik}</td>
                    <td className="border px-2 py-1">{b.nama}</td>
                    <td className="border px-2 py-1">{b.sex}</td>
                    <td className="border px-2 py-1">{b.tanggal_lahir}</td>
                    <td className="border px-2 py-1">{b.alamat}</td>
                    <td className="border px-2 py-1">{b.status_perkawinan}</td>
                    <td className="border px-2 py-1">{b.tanggal_kegiatan}</td>
                    <td className="border px-2 py-1">{b.kunjungan}</td>
                    <td className="border px-2 py-1">{b.hasil}</td>
                    <td className="border px-2 py-1">{b.jenis_reagen}</td>
                    <td className="border px-2 py-1">{b.hubungan_beresiko}</td>
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