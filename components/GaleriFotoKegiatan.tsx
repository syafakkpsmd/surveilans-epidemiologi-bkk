'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadFotoKegiatan, hapusFotoKegiatan } from '@/lib/supabase/queriesFotoClient';
import type { FotoKegiatan } from '@/lib/supabase/queriesFoto';

export default function GaleriFotoKegiatan({
  fotoAwal,
  bisaKelola, // true kalau role admin/petugas
}: {
  fotoAwal: FotoKegiatan[];
  bisaKelola: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file || !judul.trim()) {
      setError('Judul dan file foto wajib diisi.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadFotoKegiatan(file, judul.trim(), deskripsi.trim() || undefined);
      setJudul('');
      setDeskripsi('');
      setFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal upload foto.');
    } finally {
      setUploading(false);
    }
  }

  async function handleHapus(id: number, publicId: string) {
    if (!confirm('Yakin hapus foto ini?')) return;
    try {
        await hapusFotoKegiatan(id, publicId);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal hapus foto.');
    }
  }

  return (
    <div className="space-y-4">
      {bisaKelola && (
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Upload Foto Kegiatan</h3>
          <input
            type="text"
            placeholder="Judul foto"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Deskripsi (opsional)"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-lg bg-[#0F4C5C] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {uploading ? 'Mengunggah...' : 'Upload Foto'}
          </button>
        </div>
      )}

      {fotoAwal.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Belum ada foto kegiatan yang diunggah.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {fotoAwal.map((foto) => (
            <div key={foto.id} className="group relative overflow-hidden rounded-xl bg-white shadow-sm">
              <img src={foto.url} alt={foto.judul} className="h-40 w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-xs font-semibold text-gray-700">{foto.judul}</p>
                {foto.deskripsi && (
                  <p className="truncate text-xs text-gray-500">{foto.deskripsi}</p>
                )}
              </div>
              {bisaKelola && (
                <button
                  onClick={() => handleHapus(foto.id, foto.public_id)}
                  className="absolute right-2 top-2 rounded-full bg-red-600/90 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100"
                >
                  Hapus
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}