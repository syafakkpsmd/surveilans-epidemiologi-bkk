'use client';

import { useState } from 'react';
import { simpanLingkunganSaja } from '@/lib/supabase/queries-karhutla-client';
import { DAFTAR_WILAYAH_KARHUTLA } from '@/lib/karhutla/constants';

const STATUS_ISPU = ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'] as const;

export default function HalamanFormLingkunganHarian() {
  const hariIni = new Date().toISOString().slice(0, 10);

  const [tanggal, setTanggal] = useState(hariIni);
  const [wilayahIndex, setWilayahIndex] = useState(0);
  const [pm25, setPm25] = useState('');
  const [ispuStatus, setIspuStatus] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const [menyimpan, setMenyimpan] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPesanError(null);
    setPesanSukses(null);

    if (!tanggal) {
      setPesanError('Tanggal wajib diisi.');
      return;
    }
    if (pm25 === '' && !ispuStatus) {
      setPesanError('Isi minimal salah satu: PM2.5 atau Status ISPU.');
      return;
    }

    const wilayah = DAFTAR_WILAYAH_KARHUTLA[wilayahIndex];

    setMenyimpan(true);
    try {
      await simpanLingkunganSaja({
        tanggal,
        kode_wilker: wilayah.kode_wilker,
        zona: wilayah.zona,
        pm25: pm25 === '' ? null : Number(pm25),
        ispu_status: ispuStatus || null,
        keterangan_lingkungan: keterangan || null,
      });

      setPesanSukses('Data pengukuran lingkungan berhasil disimpan. Terima kasih.');
      setPm25('');
      setIspuStatus('');
      setKeterangan('');
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
          <h1 className="text-lg font-bold text-gray-900">Input Hasil Pengukuran Lingkungan</h1>
          <p className="text-sm text-gray-500 mt-1">
            BKK Kelas I Samarinda &middot; Surveilans Karhutla (PM2.5 / ISPU)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              max={hariIni}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wilayah</label>
            <select
              value={wilayahIndex}
              onChange={(e) => setWilayahIndex(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DAFTAR_WILAYAH_KARHUTLA.map((w, i) => (
                <option key={w.label} value={i}>{w.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PM2.5 (µg/m³)</label>
              <input
                type="number" min={0} step="0.1" value={pm25}
                onChange={(e) => setPm25(e.target.value)}
                placeholder="mis. 65.5"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status ISPU</label>
              <select
                value={ispuStatus}
                onChange={(e) => setIspuStatus(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Belum ditentukan</option>
                {STATUS_ISPU.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={2}
              placeholder="Catatan tambahan (opsional)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {pesanError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {pesanError}
            </div>
          )}
          {pesanSukses && (
            <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              {pesanSukses}
            </div>
          )}

          <button
            type="submit"
            disabled={menyimpan}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {menyimpan ? 'Menyimpan...' : '[+] Simpan Data Lingkungan'}
          </button>
        </form>
      </div>
    </main>
  );
}