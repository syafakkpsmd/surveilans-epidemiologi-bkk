"use client";

import { useEffect, useState, useCallback } from "react";
import { getFasilitas, hapusFasilitas, Fasilitas } from "@/lib/data/fasilitas";
import FormFasilitas from "./FormFasilitas";

const WILKER_LIST = [
  { kode: "WK01", nama: "Samarinda" },
  { kode: "WK02", nama: "Tanjung Santan" },
  { kode: "WK03", nama: "Tanjung Laut" },
  { kode: "WK04", nama: "Lhok Tuan" },
  { kode: "WK05", nama: "Sangatta" },
  { kode: "WK06", nama: "Sangkulirang" },
  { kode: "WK07", nama: "Bandara APT Pranoto" },
];

export default function KelolaFasilitasClient() {
  const [fasilitasList, setFasilitasList] = useState<Fasilitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Fasilitas | null>(null);
  const [wilkerUntukTambah, setWilkerUntukTambah] = useState<string | null>(null);
  const [hapusId, setHapusId] = useState<string | null>(null);

  const muatData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFasilitas();
      setFasilitasList(data);
    } catch (err) {
      console.error("Gagal memuat fasilitas:", JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muatData();
  }, [muatData]);

  function handleTambah(kodeWilker: string) {
    setEditTarget(null);
    setWilkerUntukTambah(kodeWilker);
    setShowForm(true);
  }

  function handleEdit(f: Fasilitas) {
    setEditTarget(f);
    setWilkerUntukTambah(null);
    setShowForm(true);
  }

  async function handleHapus(id: string) {
    try {
      await hapusFasilitas(id);
      setHapusId(null);
      await muatData();
    } catch (err) {
      console.error("Gagal menghapus:", JSON.stringify(err, null, 2));
      alert("Gagal menghapus fasilitas. Cek console untuk detail.");
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Memuat data fasilitas...</p>;
  }

  return (
    <div className="space-y-6">
      {WILKER_LIST.map((w) => {
        const fasilitasWilker = fasilitasList.filter((f) => f.kode_wilker === w.kode);
        return (
          <div key={w.kode} className="border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b">
              <div>
                <h2 className="font-semibold">{w.nama}</h2>
                <p className="text-xs text-gray-500">{w.kode} · {fasilitasWilker.length} fasilitas</p>
              </div>
              <button
                onClick={() => handleTambah(w.kode)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
              >
                + Tambah Fasilitas
              </button>
            </div>

            {fasilitasWilker.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">Belum ada fasilitas untuk wilker ini.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="px-4 py-2 font-medium">Nama</th>
                    <th className="px-4 py-2 font-medium">Tipe</th>
                    <th className="px-4 py-2 font-medium">Koordinat</th>
                    <th className="px-4 py-2 font-medium">Deskripsi</th>
                    <th className="px-4 py-2 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {fasilitasWilker.map((f) => (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="px-4 py-2">{f.nama}</td>
                      <td className="px-4 py-2 capitalize">{f.tipe}</td>
                      <td className="px-4 py-2 text-gray-500">{f.lat.toFixed(5)}, {f.lng.toFixed(5)}</td>
                      <td className="px-4 py-2 text-gray-500 max-w-[200px] truncate">{f.deskripsi ?? "-"}</td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <button onClick={() => handleEdit(f)} className="text-blue-600 hover:underline font-medium">
                          Edit
                        </button>
                        <button onClick={() => setHapusId(f.id)} className="text-red-600 hover:underline font-medium">
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {showForm && (
        <FormFasilitas
          kodeWilkerAktif={editTarget ? editTarget.kode_wilker : wilkerUntukTambah}
          fasilitasEdit={editTarget}
          onClose={() => setShowForm(false)}
          onSaved={muatData}
        />
      )}

      {hapusId && (
        <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold">Hapus fasilitas ini?</h3>
            <p className="text-sm text-gray-500">
              Semua foto yang terkait juga akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setHapusId(null)} className="px-4 py-2 text-sm rounded-md border">
                Batal
              </button>
              <button
                onClick={() => handleHapus(hapusId)}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}