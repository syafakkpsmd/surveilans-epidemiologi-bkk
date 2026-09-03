"use client";

import { useState } from "react";
import { jalankanSimulasiWabahPesawat } from "@/app/actions/simulasiWabahPesawat";
import { PeranUser } from "@/types/database.types";
import { BoxAnalisisAI } from "../BoxAnalisisAI";

interface Props {
  sudahLogin: boolean;
  role: string | null;
  daftarPenyakit: { id: number; kategori: string; r0_default: number }[];
  daftarWilker: { kode: string; nama: string }[];
  riwayatSimulasi: any[];
}

interface KotaTujuan {
  kota: string;
  jumlahPenumpang: string;
}

export function SimulasiPesawatClient({ sudahLogin, role, daftarPenyakit, daftarWilker, riwayatSimulasi }: Props) {
  const bisaGenerate = sudahLogin && (role === "admin" || role === "petugas");

  const [form, setForm] = useState({
    kodeWilker: "",
    nomorPenerbangan: "",
    tanggalKejadian: new Date().toISOString().slice(0, 10),
    kategoriPenyakitId: "",
    totalPenumpang: "",
    totalKru: "",
    jumlahBergejala: "",
    radiusKontakBaris: "2",
    durasiPenerbanganJam: "",
    jumlahGroundCrew: "",
    penggunaanApdPersen: "50",
  });

  const [kotaTujuan, setKotaTujuan] = useState<KotaTujuan[]>([]);
  const [hasil, setHasil] = useState<any>(riwayatSimulasi[0] ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const tambahKotaTujuan = () => {
    setKotaTujuan((prev) => [...prev, { kota: "", jumlahPenumpang: "" }]);
  };

  const hapusKotaTujuan = (index: number) => {
    setKotaTujuan((prev) => prev.filter((_, i) => i !== index));
  };

  const ubahKotaTujuan = (index: number, field: keyof KotaTujuan, value: string) => {
    setKotaTujuan((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const hasilBaru = await jalankanSimulasiWabahPesawat({
        kodeWilker: form.kodeWilker,
        nomorPenerbangan: form.nomorPenerbangan || undefined,
        tanggalKejadian: form.tanggalKejadian,
        kategoriPenyakitId: Number(form.kategoriPenyakitId),
        totalPenumpang: Number(form.totalPenumpang),
        totalKru: Number(form.totalKru),
        jumlahBergejala: Number(form.jumlahBergejala),
        radiusKontakBaris: Number(form.radiusKontakBaris),
        durasiPenerbanganJam: Number(form.durasiPenerbanganJam),
        jumlahGroundCrew: Number(form.jumlahGroundCrew),
        penggunaanApdPersen: Number(form.penggunaanApdPersen),
        daftarKotaTujuanLanjutan: kotaTujuan
          .filter((k) => k.kota && k.jumlahPenumpang)
          .map((k) => ({ kota: k.kota, jumlahPenumpang: Number(k.jumlahPenumpang) })),
      });
      setHasil(hasilBaru);
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan saat menjalankan simulasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0F2A38]">Simulasi Wabah Pesawat</h1>

      {bisaGenerate && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="font-medium text-teal-800">Input kejadian</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Wilayah kerja (bandara)</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.kodeWilker}
                onChange={(e) => handleChange("kodeWilker", e.target.value)}
              >
                <option value="">Pilih wilker</option>
                {daftarWilker.map((w) => (
                  <option key={w.kode} value={w.kode}>{w.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Nomor penerbangan (opsional)</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={form.nomorPenerbangan}
                onChange={(e) => handleChange("nomorPenerbangan", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Tanggal kejadian</label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1"
                value={form.tanggalKejadian}
                onChange={(e) => handleChange("tanggalKejadian", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Kategori penyakit terduga</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.kategoriPenyakitId}
                onChange={(e) => handleChange("kategoriPenyakitId", e.target.value)}
              >
                <option value="">Pilih kategori</option>
                {daftarPenyakit.map((p) => (
                  <option key={p.id} value={p.id}>{p.kategori} (R0 default {p.r0_default})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Total penumpang</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.totalPenumpang}
                onChange={(e) => handleChange("totalPenumpang", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Total kru</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.totalKru}
                onChange={(e) => handleChange("totalKru", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Jumlah bergejala</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.jumlahBergejala}
                onChange={(e) => handleChange("jumlahBergejala", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Radius kontak (baris kursi)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.radiusKontakBaris}
                onChange={(e) => handleChange("radiusKontakBaris", e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Pedoman WHO/ICAO: default 2 baris</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Durasi penerbangan (jam)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.durasiPenerbanganJam}
                onChange={(e) => handleChange("durasiPenerbanganJam", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Jumlah ground crew</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.jumlahGroundCrew}
                onChange={(e) => handleChange("jumlahGroundCrew", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Penggunaan APD ground crew (%)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.penggunaanApdPersen}
                onChange={(e) => handleChange("penggunaanApdPersen", e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-600">Kota tujuan lanjutan (penumpang connecting)</label>
              <button
                type="button"
                onClick={tambahKotaTujuan}
                className="text-sm text-teal-700 hover:underline"
              >
                + Tambah kota
              </button>
            </div>
            {kotaTujuan.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  placeholder="Nama kota"
                  className="flex-1 border rounded px-2 py-1"
                  value={item.kota}
                  onChange={(e) => ubahKotaTujuan(i, "kota", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Jumlah penumpang"
                  className="w-40 border rounded px-2 py-1"
                  value={item.jumlahPenumpang}
                  onChange={(e) => ubahKotaTujuan(i, "jumlahPenumpang", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => hapusKotaTujuan(i)}
                  className="text-red-600 text-sm px-2"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800 disabled:opacity-50"
          >
            {loading ? "Menjalankan simulasi..." : "Jalankan simulasi"}
          </button>
        </div>
      )}

      {hasil && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="font-medium text-teal-800">
            Hasil: {hasil.nomor_penerbangan || "Tanpa nomor"} — {hasil.tanggal_kejadian}
          </h2>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-teal-50 rounded p-3">
              <p className="text-gray-500">Estimasi kontak erat</p>
              <p className="text-lg font-semibold text-teal-900">{hasil.estimasi_kontak_erat} orang</p>
            </div>
            <div className="bg-teal-50 rounded p-3">
              <p className="text-gray-500">Estimasi ground crew berisiko</p>
              <p className="text-lg font-semibold text-teal-900">
                {Number(hasil.risiko_ground_crew?.estimasiGroundCrewTerinfeksi ?? 0).toFixed(1)} orang
              </p>
            </div>
            <div className="bg-teal-50 rounded p-3">
              <p className="text-gray-500">Kota tujuan lanjutan</p>
              <p className="text-lg font-semibold text-teal-900">
                {(hasil.daftar_kota_tujuan_lanjutan?.length ?? 0)} kota
              </p>
            </div>
          </div>

          {hasil.daftar_kota_tujuan_lanjutan?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Rincian kota tujuan</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1">Kota</th>
                    <th>Jumlah penumpang</th>
                  </tr>
                </thead>
                <tbody>
                  {hasil.daftar_kota_tujuan_lanjutan.map((k: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="py-1">{k.kota}</td>
                      <td>{k.jumlahPenumpang}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded p-3">
            <p className="text-sm font-medium text-amber-900 mb-1">Rekomendasi kebijakan</p>
            <p className="text-sm text-amber-800">{hasil.rekomendasi_kebijakan}</p>
          </div>
          <BoxAnalisisAI
            sudahLogin={sudahLogin}
            role={role as PeranUser | null}
            konteks="simulasi-wabah-pesawat"
            periodeKey={hasil.id}
            wilayahKerja={hasil.wilayah_kerja}
          />
        </div>
      )}

      {riwayatSimulasi.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium text-teal-800 mb-2">Riwayat simulasi</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Tanggal</th>
                <th>Penerbangan</th>
                <th>Wilker</th>
                <th>Kontak erat</th>
              </tr>
            </thead>
            <tbody>
              {riwayatSimulasi.map((r) => (
                <tr
                  key={r.id}
                  className="border-b cursor-pointer hover:bg-teal-50"
                  onClick={() => setHasil(r)}
                >
                  <td className="py-2">{r.tanggal_kejadian}</td>
                  <td>{r.nomor_penerbangan || "—"}</td>
                  <td>{r.kode_wilker}</td>
                  <td>{r.estimasi_kontak_erat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}