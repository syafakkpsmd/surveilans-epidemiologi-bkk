'use client';
// components/media-tanah/TanahUpload.tsx
import { useState } from 'react';


type Hasil = {
  total: number; masuk: number; duplikat: number; gagal: number;
  contohGalat: { baris: number; pesan: string }[];
};

const input =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

export default function TanahUpload() {
  const [wilayah, setWilayah] = useState('');
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
      fd.append('wilayah', wilayah);
      const res = await fetch('/api/media-tanah/upload', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) setGalat(j.error ?? 'Unggahan gagal');
      else setHasil(j);
    } catch {
      setGalat('Tidak bisa terhubung ke server');
    } finally {
      setKirim(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Satu baris Excel = satu formulir pemeriksaan. Pakai{' '}
        <a href="/api/media-tanah/template" download className="font-medium text-teal-800 underline">
          template Excel
        </a>{' '}
        agar judul kolom sesuai; lembar &quot;Petunjuk&quot; di dalamnya menjelaskan isi tiap kolom. Format tanggal dikenali
        otomatis (dd/MM/yyyy, yyyy-MM-dd, tanggal Excel, atau tanggal dengan jam). Parameter laboratorium yang kosong
        dianggap tidak diperiksa.
      </p>

      <form onSubmit={unggah} className="space-y-4">
        <label className="block text-sm sm:max-w-md">
          <span className="mb-1 block text-slate-700">Wilayah kerja</span>
          <select required className={input} value={wilayah} onChange={(e) => setWilayah(e.target.value)}>
            <option value="">Pilih wilayah kerja</option>
            {wk.aktif.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">File Excel (.xlsx, .xls, .csv), maksimal 300 baris</span>
          <input required type="file" accept=".xlsx,.xls,.csv" className={input}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <button type="submit" disabled={kirim || !file}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
          {kirim ? 'Mengunggah...' : 'Unggah file'}
        </button>
      </form>

      {galat && <p role="alert" className="text-sm text-rose-700">{galat}</p>}

      {hasil && (
        <div role="status" className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p>
            <strong>{hasil.masuk}</strong> pemeriksaan tersimpan dari {hasil.total} baris terbaca.
            {hasil.duplikat > 0 && <> {hasil.duplikat} dilewati karena sudah ada.</>}
            {hasil.gagal > 0 && <> {hasil.gagal} gagal divalidasi.</>}
          </p>
          {hasil.contohGalat.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-rose-700">
              {hasil.contohGalat.map((g) => <li key={g.baris}>Baris {g.baris}: {g.pesan}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
