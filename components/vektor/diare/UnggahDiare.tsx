'use client';
// components/vektor/diare/UnggahDiare.tsx
import { useState } from 'react';
import { LABEL_JENIS, type Jenis } from '@/lib/vektor/diare/config';
import { gayaInput, gayaTombol, gayaTombolPutih } from './umum';

const MODE = [
  {
    id: 'survei',
    label: 'Survei',
    petunjuk: 'Kolom: tanggal, wilayah kerja, lokasi, nilai hasil pengamatan. Status MS/TMS dihitung otomatis dari nilai.',
  },
  {
    id: 'tindakan',
    label: 'Tindakan pengendalian',
    petunjuk:
      'Kolom: tanggal, wilayah kerja, lokasi (untuk mencocokkan survei yang sudah ada), tindakan pengendalian, insektisida terpakai (ml), luas area penyemprotan (m²).',
  },
  {
    id: 'gabungan',
    label: 'Survei + tindakan (layout sheet lama)',
    petunjuk:
      'Kolom: Tanggal Kegiatan, Wilayah Kerja, Jenis Kegiatan, Lokasi, Nilai Hasil Pengamatan, Tindakan Pengendalian, Insektisida Terpakai, Luas Area Penyemprotan. Kolom Hasil Pengamatan diabaikan.',
  },
] as const;

type Hasil = {
  total: number; masuk: number; duplikat: number; gagal: number; ambigu: number;
  tindakanDiterapkan: number; contohGalat: { baris: number; pesan: string }[];
};

export default function UnggahDiare({
  jenis, onData, onTutup,
}: { jenis: Jenis; onData: () => void; onTutup: () => void }) {
  const [mode, setMode] = useState<(typeof MODE)[number]['id']>('survei');
  const [file, setFile] = useState<File | null>(null);
  const [kirim, setKirim] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  async function unggah(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setKirim(true);
    setHasil(null);
    setGalat(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('jenis', jenis);
      fd.append('mode', mode);
      const res = await fetch('/api/vektor/diare/upload', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) setGalat(j.error ?? 'Unggahan gagal');
      else {
        setHasil(j);
        if (j.masuk > 0 || j.tindakanDiterapkan > 0) onData();
      }
    } catch {
      setGalat('Tidak bisa terhubung ke server');
    } finally {
      setKirim(false);
    }
  }

  const petunjuk = MODE.find((m) => m.id === mode)?.petunjuk;

  return (
    <div className="space-y-4">
      <form onSubmit={unggah} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Jenis unggahan ({LABEL_JENIS[jenis]})</span>
          <select className={gayaInput} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            {MODE.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">File Excel (.xlsx, .xls, .csv)</span>
          <input required type="file" accept=".xlsx,.xls,.csv" className={gayaInput}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <p className="text-xs text-slate-600">
          Baris pertama berisi judul kolom. {petunjuk} Format tanggal dikenali otomatis, angka boleh memakai koma (2,2).
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onTutup} className={gayaTombolPutih}>{hasil ? 'Selesai' : 'Batal'}</button>
          <button type="submit" disabled={kirim || !file} className={gayaTombol}>
            {kirim ? 'Mengunggah...' : 'Unggah file'}
          </button>
        </div>
      </form>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      {hasil && (
        <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p>
            {hasil.total} baris terbaca.
            {hasil.masuk > 0 && <> <strong>{hasil.masuk}</strong> survei baru tersimpan.</>}
            {hasil.tindakanDiterapkan > 0 && <> <strong>{hasil.tindakanDiterapkan}</strong> tindakan diterapkan.</>}
            {hasil.duplikat > 0 && <> {hasil.duplikat} survei dilewati karena sudah ada.</>}
            {hasil.gagal > 0 && <> {hasil.gagal} baris gagal.</>}
          </p>
          {hasil.ambigu > 0 && (
            <p className="mt-2 text-amber-700">
              {hasil.ambigu} baris punya tanggal yang bisa dibaca dua cara (mis. 05/10/2026). Periksa hasilnya di tabel.
            </p>
          )}
          {hasil.contohGalat.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-rose-700">
              {hasil.contohGalat.map((g, i) => <li key={i}>Baris {g.baris}: {g.pesan}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}