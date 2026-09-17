'use client';

import { useState } from 'react';

type Props = {
  spreadsheetId?: string; // kosongkan untuk tombol "Sync Semua Klinik"
  label: string;
};

export function TombolSyncStok({ spreadsheetId, label }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [pesan, setPesan] = useState('');

  async function handleClick() {
    setStatus('loading');
    setPesan('');
    try {
      const resp = await fetch('/api/klinik/sync-stok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId }),
      });
      const data = await resp.json();
      setPesan(data.pesan ?? data.error ?? 'Selesai');
    } catch {
      setPesan('Gagal menghubungi server');
    } finally {
      setStatus('done');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="rounded-md bg-[#0F4C5C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0d3f4c] disabled:opacity-50"
      >
        {status === 'loading' ? 'Menyinkronkan...' : label}
      </button>
      {pesan && <span className="text-xs text-gray-500">{pesan}</span>}
    </div>
  );
}