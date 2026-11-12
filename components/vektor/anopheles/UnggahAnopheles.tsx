'use client';
// components/vektor/anopheles/UnggahAnopheles.tsx
import { useState } from 'react';
import type { Tipe } from '@/lib/vektor/anopheles/config';
import { gayaInput, gayaTombol, gayaTombolPutih } from '@/components/vektor/diare/umum';

const MODE = [
  {
    id: 'larva' as Tipe,
    label: 'Survei larva (jentik)',
    petunjuk:
      'Kolom: tanggal survei, kode atau nama wilayah kerja, zona, jumlah cidukan, jumlah larva, macam dan keadaan tempat perindukan; fase bulan, cuaca, suhu, kelembapan, jumlah jenis larva, spesies larva, dan lokasi opsional. Baris tanpa data larva dilewati.',
  },
  {
    id: 'dewasa' as Tipe,
    label: 'Survei nyamuk dewasa',
    petunjuk:
      'Kolom: tanggal survei, kode atau nama wilayah kerja, zona, metode tangkap, Σ nyamuk, Σ petugas, Σ jam tangkap; spesies, fase bulan, cuaca, suhu, kelembapan, dan lokasi opsional. MBR dan MHD dihitung otomatis dari jumlah petugas. Baris tanpa data tangkap dewasa dilewati.',
  },
];

type Hasil = {
  total: number; masuk: number; duplikat: number; gagal: number; ambigu: number; dilewati: number;
  contohGalat: { baris: number; pesan: string }[];
};

export default function UnggahAnopheles({
  modeAwal, onData, onTutup,
}: { modeAwal: Tipe; onData: () => void; onTutup: () => void }) {
  const [mode, setMode] = useState<Tipe>(modeAwal);
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
      fd.append('mode', mode);
      const res = await fetch('/api/vektor/anopheles/upload', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) setGalat(j.error ?? 'Unggahan gagal');
      else {
        setHasil(j);
        if (j.masuk > 0) onData();
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
          <span className="mb-1 block text-slate-700">Jenis unggahan</span>
          <select className={gayaInput} value={mode} onChange={(e) => setMode(e.target.value as Tipe)}>
            {MODE.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">File Excel (.xlsx, .xls, .csv)</span>
          <input required type="file" accept=".xlsx,.xls,.csv" className={gayaInput}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <p className="text-xs">
          <a href={`/api/vektor/anopheles/template?tipe=${mode}`} className="font-medium text-teal-800 underline">
            Unduh template Excel ({mode === 'larva' ? 'larva' : 'nyamuk dewasa'})
          </a>
        </p>

        <p className="text-xs text-slate-600">
          {petunjuk} Format tanggal dikenali otomatis, angka boleh memakai koma (26,5). Lokasi dari file tidak otomatis
          masuk ke daftar lokasi.
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
            {hasil.total} baris terbaca. <strong>{hasil.masuk}</strong> tersimpan.
            {hasil.duplikat > 0 && <> {hasil.duplikat} dilewati karena sudah ada.</>}
            {hasil.dilewati > 0 && <> {hasil.dilewati} dilewati karena tidak memuat data {mode === 'larva' ? 'larva' : 'dewasa'}.</>}
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
