"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadFotoFasilitas } from "@/lib/upload-fasilitas-foto";

interface Props {
  kodeWilkerAktif: string | null;
  fasilitasEdit?: { id: string; kode_wilker: string; nama: string; tipe: string; lat: number; lng: number; deskripsi: string | null } | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function FormFasilitas({ kodeWilkerAktif, fasilitasEdit, onClose, onSaved }: Props) {
  const [kodeWilker, setKodeWilker] = useState(
    fasilitasEdit ? fasilitasEdit.kode_wilker : kodeWilkerAktif ?? "WK01"
  );
  const [nama, setNama] = useState(fasilitasEdit?.nama ?? "");
  const [tipe, setTipe] = useState(fasilitasEdit?.tipe ?? "pelabuhan");
  const [lat, setLat] = useState(fasilitasEdit?.lat?.toString() ?? "");
  const [lng, setLng] = useState(fasilitasEdit?.lng?.toString() ?? "");
  const [deskripsi, setDeskripsi] = useState(fasilitasEdit?.deskripsi ?? "");
  const [fotoPelabuhan, setFotoPelabuhan] = useState<FileList | null>(null);
  const [fotoKegiatan, setFotoKegiatan] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadFotos(fasilitasId: string, files: FileList | null, kategori: "pelabuhan" | "kegiatan") {
    if (!files || files.length === 0) return;
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const url = await uploadFotoFasilitas(file);
      await supabase.from("fasilitas_foto").insert({
        fasilitas_id: fasilitasId,
        kategori,
        url,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        kode_wilker: kodeWilker,
        nama, tipe,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        deskripsi,
      };

      let fasilitasId = fasilitasEdit?.id;

      if (fasilitasEdit) {
        const { error } = await supabase.from("fasilitas_pelabuhan").update(payload).eq("id", fasilitasEdit.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("fasilitas_pelabuhan").insert(payload).select("id").single();
        if (error) throw error;
        fasilitasId = data.id;
      }

      if (fasilitasId) {
        await uploadFotos(fasilitasId, fotoPelabuhan, "pelabuhan");
        await uploadFotos(fasilitasId, fotoKegiatan, "kegiatan");
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan. Cek console untuk detail.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">{fasilitasEdit ? "Edit Pelabuhan" : "Tambah Pelabuhan Baru"}</h2>

        {!kodeWilkerAktif && (
          <div>
            <label className="text-xs font-medium text-gray-500">Wilayah Kerja</label>
            <select value={kodeWilker} onChange={(e) => setKodeWilker(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="WK01">WK01 - Samarinda</option>
              <option value="WK02">WK02 - Tanjung Santan</option>
              <option value="WK03">WK03 - Tanjung Laut</option>
              <option value="WK04">WK04 - Lhok Tuan</option>
              <option value="WK05">WK05 - Sangatta</option>
              <option value="WK06">WK06 - Sangkulirang</option>
              <option value="WK07">WK07 - Bandara APT Pranoto</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-500">Nama Pelabuhan/Bandara</label>
          <input value={nama} onChange={(e) => setNama(e.target.value)} required className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Tipe</label>
          <select value={tipe} onChange={(e) => setTipe(e.target.value as any)} className="w-full border rounded-md px-3 py-2 text-sm">
            <option value="pelabuhan">Pelabuhan</option>
            <option value="bandara">Bandara</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-500">Latitude</label>
            <input value={lat} onChange={(e) => setLat(e.target.value)} required className="w-full border rounded-md px-3 py-2 text-sm" placeholder="-0.5022" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Longitude</label>
            <input value={lng} onChange={(e) => setLng(e.target.value)} required className="w-full border rounded-md px-3 py-2 text-sm" placeholder="117.1536" />
          </div>
        </div>
        <p className="text-[11px] text-gray-400">
          Tips: buka Google Maps, klik kanan lokasinya, koordinat otomatis muncul untuk di-copy.
        </p>

        <div>
          <label className="text-xs font-medium text-gray-500">Deskripsi</label>
          <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" rows={3} />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Foto Pelabuhan</label>
          <input type="file" accept="image/*" multiple onChange={(e) => setFotoPelabuhan(e.target.files)} className="w-full text-sm" />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Foto Kegiatan</label>
          <input type="file" accept="image/*" multiple onChange={(e) => setFotoKegiatan(e.target.files)} className="w-full text-sm" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border">
            Batal
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50">
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}