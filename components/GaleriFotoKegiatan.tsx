'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  uploadFotoKegiatan,
  hapusFotoKegiatan,
  editFotoKegiatan,
  tambahJenisKegiatan,
} from '@/lib/supabase/queriesFotoClient';
import type { FotoKegiatan, JenisKegiatanFoto } from '@/lib/supabase/queriesFoto';

const OPSI_TAMBAH_BARU = '__tambah_baru__';

interface Props {
  fotoAwal: FotoKegiatan[];
  daftarJenis: JenisKegiatanFoto[];
  bisaKelola: boolean;
  tampilan?: 'ringkas' | 'lengkap'; // 'ringkas' = dashboard utama (flat), 'lengkap' = halaman galeri (dikelompokkan)
}

export default function GaleriFotoKegiatan({
  fotoAwal,
  daftarJenis: daftarJenisAwal,
  bisaKelola,
  tampilan = 'lengkap',
}: Props) {
  const router = useRouter();
  const [daftarJenis, setDaftarJenis] = useState(daftarJenisAwal);

  const [uploading, setUploading] = useState(false);
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [jenisTerpilih, setJenisTerpilih] = useState<string>('');
  const [jenisBaru, setJenisBaru] = useState('');
  const [menambahJenis, setMenambahJenis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fotoSedangDiedit, setFotoSedangDiedit] = useState<FotoKegiatan | null>(null);

  function handlePilihJenis(value: string) {
    if (value === OPSI_TAMBAH_BARU) {
      setMenambahJenis(true);
      setJenisTerpilih('');
    } else {
      setMenambahJenis(false);
      setJenisTerpilih(value);
    }
  }

  async function handleSimpanJenisBaru() {
    if (!jenisBaru.trim()) return;
    try {
      const dataBaru = await tambahJenisKegiatan(jenisBaru.trim());
      setDaftarJenis((prev) => [...prev, dataBaru].sort((a, b) => a.nama.localeCompare(b.nama)));
      setJenisTerpilih(String(dataBaru.id));
      setJenisBaru('');
      setMenambahJenis(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal tambah jenis kegiatan.');
    }
  }

  async function handleUpload() {
    if (!file || !judul.trim() || !jenisTerpilih) {
      setError('Jenis kegiatan, judul, dan file foto wajib diisi.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadFotoKegiatan(file, judul.trim(), Number(jenisTerpilih), deskripsi.trim() || undefined);
      setJudul('');
      setDeskripsi('');
      setFile(null);
      setJenisTerpilih('');
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

  async function handleSimpanEdit() {
    if (!fotoSedangDiedit) return;
    try {
      await editFotoKegiatan(fotoSedangDiedit.id, {
        judul: fotoSedangDiedit.judul.trim(),
        deskripsi: fotoSedangDiedit.deskripsi?.trim() || undefined,
        jenisKegiatanId: fotoSedangDiedit.jenis_kegiatan_id ?? undefined,
      });
      setFotoSedangDiedit(null);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal simpan perubahan.');
    }
  }

  const kelompok = daftarJenis
    .map((jenis) => ({ jenis, foto: fotoAwal.filter((f) => f.jenis_kegiatan_id === jenis.id) }))
    .filter((k) => k.foto.length > 0);

  const tanpaKategori = fotoAwal.filter((f) => !f.jenis_kegiatan_id);

  return (
    <div className="space-y-6">
      {bisaKelola && (
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Upload Foto Kegiatan</h3>

          <select
            value={menambahJenis ? OPSI_TAMBAH_BARU : jenisTerpilih}
            onChange={(e) => handlePilihJenis(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Pilih jenis kegiatan...</option>
            {daftarJenis.map((j) => (
              <option key={j.id} value={j.id}>{j.nama}</option>
            ))}
            <option value={OPSI_TAMBAH_BARU}>+ Tambah kegiatan baru</option>
          </select>

          {menambahJenis && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nama jenis kegiatan baru"
                value={jenisBaru}
                onChange={(e) => setJenisBaru(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleSimpanJenisBaru}
                className="rounded-lg bg-[#0F4C5C] px-3 py-2 text-xs text-white whitespace-nowrap"
              >
                Simpan Jenis
              </button>
            </div>
          )}

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
      ) : tampilan === 'ringkas' ? (
        <GridFoto foto={fotoAwal} bisaKelola={bisaKelola} onEdit={setFotoSedangDiedit} onHapus={handleHapus} />
      ) : (
        <div className="space-y-8">
          {kelompok.map(({ jenis, foto }) => (
            <div key={jenis.id}>
              <h3 className="mb-3 text-sm font-semibold text-[#0F2A38]">{jenis.nama}</h3>
              <GridFoto foto={foto} bisaKelola={bisaKelola} onEdit={setFotoSedangDiedit} onHapus={handleHapus} />
            </div>
          ))}
          {tanpaKategori.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[#0F2A38]">Tanpa Kategori</h3>
              <GridFoto foto={tanpaKategori} bisaKelola={bisaKelola} onEdit={setFotoSedangDiedit} onHapus={handleHapus} />
            </div>
          )}
        </div>
      )}

      {fotoSedangDiedit && (
        <ModalEdit
          foto={fotoSedangDiedit}
          daftarJenis={daftarJenis}
          onBatal={() => setFotoSedangDiedit(null)}
          onSimpan={handleSimpanEdit}
          onUbah={(patch) => setFotoSedangDiedit({ ...fotoSedangDiedit, ...patch })}
        />
      )}
    </div>
  );
}

function GridFoto({
  foto,
  bisaKelola,
  onEdit,
  onHapus,
}: {
  foto: FotoKegiatan[];
  bisaKelola: boolean;
  onEdit: (f: FotoKegiatan) => void;
  onHapus: (id: number, publicId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {foto.map((f) => (
        <div key={f.id} className="group relative overflow-hidden rounded-xl bg-white shadow-sm">
          <img src={f.url} alt={f.judul} className="h-40 w-full object-cover" />
          <div className="p-2">
            <p className="truncate text-xs font-semibold text-gray-700">{f.judul}</p>
            {f.deskripsi && <p className="truncate text-xs text-gray-500">{f.deskripsi}</p>}
          </div>
          {bisaKelola && (
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => onEdit(f)}
                className="rounded-full bg-[#0F4C5C]/90 px-2 py-1 text-xs text-white"
              >
                Edit
              </button>
              <button
                onClick={() => onHapus(f.id, f.public_id)}
                className="rounded-full bg-red-600/90 px-2 py-1 text-xs text-white"
              >
                Hapus
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ModalEdit({
  foto,
  daftarJenis,
  onBatal,
  onSimpan,
  onUbah,
}: {
  foto: FotoKegiatan;
  daftarJenis: JenisKegiatanFoto[];
  onBatal: () => void;
  onSimpan: () => void;
  onUbah: (patch: Partial<FotoKegiatan>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-lg">
        <h3 className="text-sm font-semibold text-gray-700">Edit Foto</h3>

        <select
          value={foto.jenis_kegiatan_id ?? ''}
          onChange={(e) => onUbah({ jenis_kegiatan_id: Number(e.target.value) })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Pilih jenis kegiatan...</option>
          {daftarJenis.map((j) => (
            <option key={j.id} value={j.id}>{j.nama}</option>
          ))}
        </select>

        <input
          type="text"
          value={foto.judul}
          onChange={(e) => onUbah({ judul: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Judul foto"
        />
        <input
          type="text"
          value={foto.deskripsi ?? ''}
          onChange={(e) => onUbah({ deskripsi: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Deskripsi (opsional)"
        />

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onBatal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">
            Batal
          </button>
          <button onClick={onSimpan} className="rounded-lg bg-[#0F4C5C] px-4 py-2 text-sm text-white">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}