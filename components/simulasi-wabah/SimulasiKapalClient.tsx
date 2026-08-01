"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { jalankanSimulasiWabahKapal } from "@/app/actions/simulasiWabahKapal";
import { ambilPrefillPopulasiKapal } from "@/app/actions/ambilReferensiPopulasi";
import { BoxAnalisisAI } from "../BoxAnalisisAI";
import type { PeranUser } from "@/types/domain.types";

interface Props {
  sudahLogin: boolean;
  role: PeranUser | null;
  daftarPenyakit: { id: number; kategori: string; r0_default: number }[];
  daftarWilayah: { value: string; label: string }[];
  riwayatSimulasi: any[];
}

const FORM_AWAL = {
  wilayahKerja: "",
  namaKapal: "",
  tanggalKejadian: new Date().toISOString().slice(0, 10),
  kategoriPenyakitId: "",
  totalAbk: "",
  abkBergejala: "",
  efektivitasIsolasiPersen: "70",
  jumlahTkbm: "",
  durasiKontakJam: "4",
  penggunaanApdPersen: "50",
  jumlahPetugasKesehatan: "",
  jumlahPetugasNonKesehatan: "",
  durasiKontakPetugasJam: "1",
};

export function SimulasiKapalClient({ sudahLogin, role, daftarPenyakit, daftarWilayah, riwayatSimulasi }: Props) {
  const bisaGenerate = sudahLogin && (role === "admin" || role === "petugas");

  const [form, setForm] = useState(FORM_AWAL);
  const [hasil, setHasil] = useState<any>(riwayatSimulasi[0] ?? null);
  const [loading, setLoading] = useState(false);
  const [memuatPrefill, setMemuatPrefill] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleWilayahChange = async (value: string) => {
    handleChange("wilayahKerja", value);
    if (!value) return;

    setMemuatPrefill(true);
    try {
      const prefill = await ambilPrefillPopulasiKapal(value);
      if (prefill) {
        setForm((prev) => ({
          ...prev,
          jumlahTkbm: prefill.jumlah_tkbm_terdaftar != null ? String(prefill.jumlah_tkbm_terdaftar) : prev.jumlahTkbm,
          jumlahPetugasKesehatan: prefill.jumlah_petugas_kesehatan != null ? String(prefill.jumlah_petugas_kesehatan) : prev.jumlahPetugasKesehatan,
          jumlahPetugasNonKesehatan: prefill.jumlah_petugas_non_kesehatan != null ? String(prefill.jumlah_petugas_non_kesehatan) : prev.jumlahPetugasNonKesehatan,
        }));
      }
    } catch {
      // prefill gagal bukan error fatal — petugas tetap bisa isi manual
    } finally {
      setMemuatPrefill(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const hasilBaru = await jalankanSimulasiWabahKapal({
        wilayahKerja: form.wilayahKerja,
        namaKapal: form.namaKapal,
        tanggalKejadian: form.tanggalKejadian,
        kategoriPenyakitId: Number(form.kategoriPenyakitId),
        totalAbk: Number(form.totalAbk),
        abkBergejala: Number(form.abkBergejala),
        efektivitasIsolasiPersen: Number(form.efektivitasIsolasiPersen),
        jumlahTkbm: Number(form.jumlahTkbm),
        durasiKontakJam: Number(form.durasiKontakJam),
        penggunaanApdPersen: Number(form.penggunaanApdPersen),
        jumlahPetugasKesehatan: Number(form.jumlahPetugasKesehatan) || 0,
        jumlahPetugasNonKesehatan: Number(form.jumlahPetugasNonKesehatan) || 0,
        durasiKontakPetugasJam: Number(form.durasiKontakPetugasJam) || 1,
      });
      setHasil(hasilBaru);
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan saat menjalankan simulasi");
    } finally {
      setLoading(false);
    }
  };

  const dataChart = hasil?.hasil_kurva_kapal?.tanpaIsolasi?.map((titik: any, i: number) => {
    const denganIsolasi = hasil.hasil_kurva_kapal.denganIsolasi[i];
    return {
      hari: titik.hari,
      "I tanpa isolasi": Math.round(titik.I),
      "I dengan isolasi": Math.round(denganIsolasi?.I ?? 0),
    };
  }) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
     <h1 className="text-2xl font-bold text-[#0F2A38]">Simulasi Wabah Kapal</h1>

      {bisaGenerate && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="font-medium text-teal-800">Input kejadian</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Wilayah kerja</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.wilayahKerja}
                onChange={(e) => handleWilayahChange(e.target.value)}
              >
                <option value="">Pilih wilayah</option>
                {daftarWilayah.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
              {memuatPrefill && <p className="text-xs text-gray-400 mt-1">Memuat data populasi wilayah...</p>}
            </div>
            <div>
              <label className="text-sm text-gray-600">Nama kapal</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={form.namaKapal}
                onChange={(e) => handleChange("namaKapal", e.target.value)}
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
              <label className="text-sm text-gray-600">Total ABK</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.totalAbk}
                onChange={(e) => handleChange("totalAbk", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">ABK bergejala</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.abkBergejala}
                onChange={(e) => handleChange("abkBergejala", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Efektivitas isolasi (%)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.efektivitasIsolasiPersen}
                onChange={(e) => handleChange("efektivitasIsolasiPersen", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Jumlah TKBM terlibat</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.jumlahTkbm}
                onChange={(e) => handleChange("jumlahTkbm", e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Terisi otomatis dari data wilayah, bisa diubah</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Durasi kontak TKBM (jam)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.durasiKontakJam}
                onChange={(e) => handleChange("durasiKontakJam", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Penggunaan APD TKBM (%)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.penggunaanApdPersen}
                onChange={(e) => handleChange("penggunaanApdPersen", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Petugas kesehatan terlibat</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.jumlahPetugasKesehatan}
                onChange={(e) => handleChange("jumlahPetugasKesehatan", e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Terisi otomatis dari data wilayah, bisa diubah</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Petugas non-kesehatan terlibat</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.jumlahPetugasNonKesehatan}
                onChange={(e) => handleChange("jumlahPetugasNonKesehatan", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Durasi kontak petugas (jam)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.durasiKontakPetugasJam}
                onChange={(e) => handleChange("durasiKontakPetugasJam", e.target.value)}
              />
            </div>
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
            Hasil: {hasil.nama_kapal} — {hasil.tanggal_kejadian}
          </h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-teal-50 rounded p-3">
              <p className="text-gray-500">R efektif tanpa isolasi</p>
              <p className="text-lg font-semibold text-teal-900">
                {hasil.r_efektif_tanpa_isolasi != null ? Number(hasil.r_efektif_tanpa_isolasi).toFixed(2) : "—"}
              </p>
            </div>
            <div className="bg-teal-50 rounded p-3">
              <p className="text-gray-500">R efektif dengan isolasi</p>
              <p className="text-lg font-semibold text-teal-900">{Number(hasil.r_efektif_kapal).toFixed(2)}</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dataChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hari" label={{ value: "Hari", position: "insideBottom", offset: -5 }} />
              <YAxis label={{ value: "Jumlah ABK infeksius", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="I tanpa isolasi" stroke="#dc2626" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="I dengan isolasi" stroke="#0f766e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <div className="bg-amber-50 border border-amber-200 rounded p-3">
            <p className="text-sm font-medium text-amber-900 mb-1">Rekomendasi kebijakan</p>
            <p className="text-sm text-amber-800">{hasil.rekomendasi_kebijakan}</p>
          </div>

          <BoxAnalisisAI
            sudahLogin={sudahLogin}
            role={role}
            konteks="simulasi-wabah-kapal"
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
                <th>Kapal</th>
                <th>Wilker</th>
                <th>R efektif</th>
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
                  <td>{r.nama_kapal}</td>
                  <td>{r.wilayah_kerja}</td>
                  <td>{Number(r.r_efektif_kapal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}