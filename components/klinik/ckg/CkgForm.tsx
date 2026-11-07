'use client';
// components/klinik/ckg/CkgForm.tsx
import { useState } from 'react';
import { hitungIMT, kategoriIMT, type OpsiWilayahCkg } from '@/lib/klinik/ckg/config';

type Form = {
  tanggal: string;
  wilayah: string;
  nama: string;
  jenis_kelamin: '' | 'L' | 'P';
  umur: string;
  bb: string;
  tb: string;
  sistolik: string;
  diastolik: string;
  gula_darah: string;
  merokok: boolean;
};

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const kosong = (tanggal: string, wilayah: string): Form => ({
  tanggal, wilayah, nama: '', jenis_kelamin: '', umur: '', bb: '', tb: '',
  sistolik: '', diastolik: '', gula_darah: '', merokok: false,
});

const input =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

function Isian({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export default function CkgForm({ opsiWilayah }: { opsiWilayah: OpsiWilayahCkg[] }) {
  const [f, setF] = useState<Form>(() => kosong(hariIni(), ''));
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'galat'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const imt = hitungIMT(Number(f.bb.replace(',', '.')), Number(f.tb.replace(',', '.')));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setKirim(true);
    setPesan(null);
    try {
      const res = await fetch('/api/ckg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, merokok: f.merokok ? 1 : 0 }),
      });
      const j = await res.json();
      if (!res.ok) {
        setPesan({ jenis: 'galat', teks: j.error ?? 'Data gagal disimpan' });
      } else {
        setPesan({ jenis: 'ok', teks: `Data ${f.nama} tersimpan` });
        setF(kosong(f.tanggal, f.wilayah)); // tanggal & wilayah dipertahankan untuk input berikutnya
      }
    } catch {
      setPesan({ jenis: 'galat', teks: 'Tidak bisa terhubung ke server' });
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Isian label="Wilayah kerja">
          <select required className={input} value={f.wilayah} onChange={(e) => set('wilayah', e.target.value)}>
            <option value="">Pilih wilayah kerja</option>
            {opsiWilayah.map((w) => <option key={w.kode} value={w.kode}>{w.nama}</option>)}
          </select>
        </Isian>
        <Isian label="Tanggal pemeriksaan">
          <input required type="date" className={input} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
        </Isian>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Isian label="Nama">
            <input required className={input} value={f.nama} onChange={(e) => set('nama', e.target.value)} />
          </Isian>
        </div>
        <Isian label="Umur (tahun)">
          <input required type="number" inputMode="numeric" min={0} max={120} className={input}
            value={f.umur} onChange={(e) => set('umur', e.target.value)} />
        </Isian>
      </div>

      <fieldset className="text-sm">
        <legend className="mb-1 text-slate-700">Jenis kelamin</legend>
        <div className="flex gap-5">
          {(['L', 'P'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="jk" required checked={f.jenis_kelamin === v} onChange={() => set('jenis_kelamin', v)} />
              {v === 'L' ? 'Pria' : 'Wanita'}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-4">
        <Isian label="BB (kg)">
          <input type="number" step="0.1" inputMode="decimal" className={input} value={f.bb} onChange={(e) => set('bb', e.target.value)} />
        </Isian>
        <Isian label="TB (cm)">
          <input type="number" step="0.1" inputMode="decimal" className={input} value={f.tb} onChange={(e) => set('tb', e.target.value)} />
        </Isian>
        <div className="sm:col-span-2 self-end rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          IMT: <strong className="tabular-nums">{imt ?? '-'}</strong>
          {imt != null && <span className="ml-2">({kategoriIMT(imt)})</span>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Isian label="Sistolik (mmHg)">
          <input type="number" inputMode="numeric" className={input} value={f.sistolik} onChange={(e) => set('sistolik', e.target.value)} />
        </Isian>
        <Isian label="Diastolik (mmHg)">
          <input type="number" inputMode="numeric" className={input} value={f.diastolik} onChange={(e) => set('diastolik', e.target.value)} />
        </Isian>
        <Isian label="Gula darah (mg/dL)">
          <input type="number" inputMode="numeric" className={input} value={f.gula_darah} onChange={(e) => set('gula_darah', e.target.value)} />
        </Isian>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.merokok} onChange={(e) => set('merokok', e.target.checked)} />
        Merokok
      </label>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={kirim}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
          {kirim ? 'Menyimpan...' : 'Simpan data'}
        </button>
        {pesan && (
          <p role="status" className={`text-sm ${pesan.jenis === 'ok' ? 'text-teal-800' : 'text-rose-700'}`}>
            {pesan.teks}
          </p>
        )}
      </div>
    </form>
  );
}