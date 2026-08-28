'use client';

import { useState } from 'react';
import { simpanKualitasUdaraHarian } from '@/lib/supabase/queries-karhutla-client';
import { hitungStatusEvaluasi, LABEL_STATUS } from '@/lib/karhutla/constants';
import type { LokasiUdaraRow } from '@/lib/supabase/queries-karhutla-server';

const STATUS_ISPU = ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'] as const;

export default function FormInputKualitasUdaraHarian({
  daftarLokasi, onBerhasilSimpan,
}: { daftarLokasi: LokasiUdaraRow[]; onBerhasilSimpan?: () => void }) {
  const hariIni = new Date().toISOString().slice(0, 10);

  const [tanggal, setTanggal] = useState(hariIni);
  const [lokasi, setLokasi] = useState(daftarLokasi[0]?.nama ?? '');
  const [pm25, setPm25] = useState('');
  const [pm10, setPm10] = useState('');
  const [suhu, setSuhu] = useState('');
  const [hcho, setHcho] = useState('');
  const [tvoc, setTvoc] = useState('');
  const [kelembapan, setKelembapan] = useState('');
  const [ispuStatus, setIspuStatus] = useState('');
  const [catatanEvaluasi, setCatatanEvaluasi] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);

  const toNum = (v: string) => (v === '' ? null : Number(v));
  const dataUntukStatus = {
    pm25: toNum(pm25), pm10: toNum(pm10), suhu: toNum(suhu),
    hcho: toNum(hcho), tvoc: toNum(tvoc), kelembapan: toNum(kelembapan),
  };
  const statusPreview = hitungStatusEvaluasi(dataUntukStatus);

  const lokasiTerkelompok = daftarLokasi.reduce<Record<string, LokasiUdaraRow[]>>((acc, l) => {
    (acc[l.lokasi_induk] ??= []).push(l);
    return acc;
  }, {});

  function resetForm() {
    setPm25(''); setPm10(''); setSuhu(''); setHcho(''); setTvoc(''); setKelembapan('');
    setIspuStatus(''); setCatatanEvaluasi('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPesanError(null); setPesanSukses(null);
    if (!tanggal) { setPesanError('Tanggal wajib diisi.'); return; }

    setMenyimpan(true);
    try {
      await simpanKualitasUdaraHarian({
        tanggal, lokasi, ...dataUntukStatus,
        ispu_status: ispuStatus || null,
        catatan_evaluasi: catatanEvaluasi || null,
        status_evaluasi: statusPreview,
      });
      setPesanSukses('Data kualitas udara berhasil disimpan.');
      resetForm();
      onBerhasilSimpan?.();
    } catch (err) {
      setPesanError((err as Error).message);
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Input Kualitas Udara Harian</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
          <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} max={hariIni} required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
          <select value={lokasi} onChange={(e) => setLokasi(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {Object.entries(lokasiTerkelompok).map(([induk, items]) => (
              <optgroup key={induk} label={induk}>
                {items.map((l) => <option key={l.id} value={l.nama}>{l.sub_lokasi ?? l.lokasi_induk}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">PM2.5 (µg/m³)</label>
          <input type="number" min={0} step="0.1" value={pm25} onChange={(e) => setPm25(e.target.value)} placeholder="mis. 24"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">PM10 (µg/m³)</label>
          <input type="number" min={0} step="0.1" value={pm10} onChange={(e) => setPm10(e.target.value)} placeholder="mis. 32"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Suhu (°C)</label>
          <input type="number" step="0.1" value={suhu} onChange={(e) => setSuhu(e.target.value)} placeholder="mis. 29.1"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">HCHO (mg/m³)</label>
  <input type="number" min={0} step="0.001" value={hcho} onChange={(e) => setHcho(e.target.value)} placeholder="mis. 0.100"
    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
<div><label className="block text-sm font-medium text-gray-700 mb-1">TVOC (mg/m³)</label>
  <input type="number" min={0} step="0.001" value={tvoc} onChange={(e) => setTvoc(e.target.value)} placeholder="mis. 0.000"
    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Kelembapan (%)</label>
          <input type="number" min={0} max={100} step="1" value={kelembapan} onChange={(e) => setKelembapan(e.target.value)} placeholder="mis. 75"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status ISPU</label>
        <select value={ispuStatus} onChange={(e) => setIspuStatus(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Belum ditentukan</option>
          {STATUS_ISPU.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan / Evaluasi Ringkas</label>
        <textarea value={catatanEvaluasi} onChange={(e) => setCatatanEvaluasi(e.target.value)} rows={2}
          placeholder="Catatan tambahan (opsional)"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>

      <div className="text-sm text-gray-600">
        Kesimpulan/Status Evaluasi (otomatis): <strong>{LABEL_STATUS[statusPreview]}</strong>
      </div>

      {pesanError && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{pesanError}</div>}
      {pesanSukses && <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{pesanSukses}</div>}

      <button type="submit" disabled={menyimpan}
        className="btn btn-success inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
        {menyimpan ? 'Menyimpan...' : '[+] Simpan Data Kualitas Udara'}
      </button>
    </form>
  );
}