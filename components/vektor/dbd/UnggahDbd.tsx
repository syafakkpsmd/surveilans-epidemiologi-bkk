'use client';
// components/vektor/dbd/UnggahDbd.tsx
import { useState } from 'react';
import { gayaInput, gayaTombol, gayaTombolPutih } from '@/components/vektor/diare/umum';

type Mode = 'survei' | 'pengendalian' | 'gabungan';

const MODE: { id: Mode; label: string; petunjuk: string }[] = [
  {
    id: 'survei',
    label: 'Survei',
    petunjuk:
      'Kolom: Tgl_Survei, Kode_Wilker (atau Nama_Wilker), Zona, Sub_Lokasi (opsional), Jml_Rumah_Diperiksa, Jml_Positif_Jentik, Container_Diperiksa, Container_Positif, Curah_Hujan_mm (opsional). ABJ, HI, CI, BI dihitung otomatis; Minggu_Ke diabaikan.',
  },
  {
    id: 'pengendalian',
    label: 'Pengendalian',
    petunjuk:
      'Kolom: tanggal survei, wilayah kerja, zona, dan sub lokasi (bila ada) untuk mencocokkan survei yang sudah ada, serta Larvasida (gram), Luas_Wilayah_Fogging (ha), Jml_Insectisida_Fogging (liter). Baris tanpa isian larvasida atau fogging dilewati.',
  },
  {
    id: 'gabungan',
    label: 'Survei + pengendalian (layout sheet DBD)',
    petunjuk:
      'Satu baris berisi survei dan, bila ada, pengendalian. Baris bertanda Tindakan "Tidak" tanpa isian hanya dicatat sebagai survei. Pengendalian dari file menimpa pengendalian yang sudah ada pada survei yang sama.',
  },
];

type Hasil = {
  total: number; masuk: number; duplikat: number; gagal: number; ambigu: number; dilewati: number;
  pengendalianDiterapkan: number; contohGalat: { baris: number; pesan: string }[];
};

export default function UnggahDbd({ onData, onTutup }: { onData: () => void; onTutup: () => void }) {
  const [mode, setMode] = useState<Mode>('gabungan');
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
      const res = await fetch('/api/vektor/dbd/upload', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) setGalat(j.error ?? 'Unggahan gagal');
      else {
        setHasil(j);
        if (j.masuk > 0 || j.pengendalianDiterapkan > 0) onData();
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
          <select className={gayaInput} value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            {MODE.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">File Excel (.xlsx, .xls, .csv)</span>
          <input required type="file" accept=".xlsx,.xls,.csv" className={gayaInput}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <p className="text-xs text-slate-600">
          Baris pertama berisi judul kolom. {petunjuk} Format tanggal dikenali otomatis, angka boleh memakai koma (82,8).
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
            {hasil.pengendalianDiterapkan > 0 && <> <strong>{hasil.pengendalianDiterapkan}</strong> pengendalian diterapkan.</>}
            {hasil.duplikat > 0 && <> {hasil.duplikat} survei dilewati karena sudah ada.</>}
            {hasil.dilewati > 0 && <> {hasil.dilewati} baris dilewati karena tidak memuat isian pengendalian.</>}
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