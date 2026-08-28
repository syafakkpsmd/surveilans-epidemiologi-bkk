'use client';

import { useState } from 'react';
import { simpanIspaHarian } from '@/lib/supabase/queries-karhutla-client';
import type { WilayahIspaRow } from '@/lib/supabase/queries-karhutla-server';

export default function FormIspaHarianPublikClient({ daftarWilayah }: { daftarWilayah: WilayahIspaRow[] }) {
  const hariIni = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(hariIni);
  const [wilayahIndex, setWilayahIndex] = useState(0);
  const [kasusAnak, setKasusAnak] = useState('');
  const [kasusDewasa, setKasusDewasa] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPesanError(null); setPesanSukses(null);
    if (!tanggal) { setPesanError('Tanggal wajib diisi.'); return; }

    const wilayah = daftarWilayah[wilayahIndex];
    setMenyimpan(true);
    try {
      await simpanIspaHarian({
        tanggal, kode_wilker: wilayah.kode_wilker, zona: wilayah.zona,
        kasus_ispa_anak: Number(kasusAnak) || 0,
        kasus_ispa_dewasa: Number(kasusDewasa) || 0,
        keterangan: keterangan || null,
      });
      setPesanSukses('Data kasus ISPA berhasil disimpan. Terima kasih.');
      setKasusAnak(''); setKasusDewasa(''); setKeterangan('');
    } catch (err) {
      setPesanError((err as Error).message);
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-gray-900">Input Kasus ISPA Harian</h1>
          <p className="text-sm text-gray-500 mt-1">BKK Kelas I Samarinda &middot; Surveilans Karhutla</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} max={hariIni} required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wilayah</label>
            <select value={wilayahIndex} onChange={(e) => setWilayahIndex(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {daftarWilayah.map((w, i) => <option key={w.id} value={i}>{w.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kasus ISPA Anak</label>
              <input type="number" min={0} value={kasusAnak} onChange={(e) => setKasusAnak(e.target.value)} placeholder="0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kasus ISPA Dewasa</label>
              <input type="number" min={0} value={kasusDewasa} onChange={(e) => setKasusDewasa(e.target.value)} placeholder="0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2}
              placeholder="Catatan tambahan (opsional)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          {pesanError && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{pesanError}</div>}
          {pesanSukses && <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{pesanSukses}</div>}
          <button type="submit" disabled={menyimpan}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
            {menyimpan ? 'Menyimpan...' : '[+] Simpan Data Kasus ISPA'}
          </button>
        </form>
      </div>
    </main>
  );
}