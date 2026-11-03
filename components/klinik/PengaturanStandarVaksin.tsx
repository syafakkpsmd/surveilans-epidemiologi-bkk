// components/klinik/PengaturanStandarVaksin.tsx
'use client';
import { useState } from 'react';

export function PengaturanStandarVaksin({ nilaiAwal }: { nilaiAwal: number }) {
  const [nilai, setNilai] = useState(nilaiAwal);
  const [status, setStatus] = useState<'idle' | 'menyimpan' | 'berhasil' | 'gagal'>('idle');

  async function simpan() {
    setStatus('menyimpan');
    const res = await fetch('/api/klinik/pengaturan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standar_hari_vaksin: nilai }),
    });
    const json = await res.json();
    setStatus(json.success ? 'berhasil' : 'gagal');
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-xs border border-gray-100 space-y-3">
      <h3 className="text-sm font-bold text-gray-800">Standar Masa Aktif Vaksin</h3>
      <p className="text-xs text-gray-500">Jarak minimum (hari) antara penerbitan dokumen vaksin dan tanggal keberangkatan agar dianggap patuh.</p>
      <div className="flex items-center gap-2">
        <input type="number" min={1} value={nilai} onChange={(e) => setNilai(Number(e.target.value))}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0F4C5C] focus:outline-hidden" />
        <span className="text-sm text-gray-600">hari</span>
        <button onClick={simpan} disabled={status === 'menyimpan'}
          className="rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c3c49] disabled:opacity-50">
          {status === 'menyimpan' ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
      {status === 'berhasil' && <p className="text-xs text-green-600">Tersimpan — berlaku untuk kalkulasi berikutnya.</p>}
      {status === 'gagal' && <p className="text-xs text-red-600">Gagal menyimpan, coba lagi.</p>}
    </div>
  );
}